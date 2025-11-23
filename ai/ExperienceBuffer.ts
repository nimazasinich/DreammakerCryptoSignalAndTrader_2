import { Logger } from '../core/Logger.js';
import { MarketData } from '../types/index.js';

// Utility to convert Date | number to number
const toTimestamp = (ts: Date | number): number =>
  typeof ts === 'number' ? ts : ts.getTime();

export interface Experience {
  id: string;
  state: number[]; // Market features at time t
  action: number; // 0=hold, 1=buy, 2=sell
  reward: number; // Realized reward
  nextState: number[]; // Market features at time t+1
  terminal: boolean; // Episode end flag
  tdError: number; // Temporal difference error for prioritization
  priority: number; // Priority score for sampling
  timestamp: number; // When experience was created
  symbol: string; // Asset symbol
  metadata: {
    price: number;
    volume: number;
    volatility: number;
    confidence: number;
  };
}

export interface BufferConfig {
  capacity: number;
  alpha: number; // Prioritization exponent
  beta: number; // Importance sampling exponent
  betaIncrement: number; // Beta annealing rate
  epsilon: number; // Small constant to prevent zero priorities
  maxPriority: number; // Maximum priority value
}

export class ExperienceBuffer {
  private static instance: ExperienceBuffer;
  private logger = Logger.getInstance();
  private config: BufferConfig = {
    capacity: 200000,
    alpha: 0.6,
    beta: 0.4,
    betaIncrement: 0.001,
    epsilon: 1e-6,
    maxPriority: 1.0
  };

  private buffer: Experience[] = [];
  private position = 0;
  private size = 0;
  private priorityTree: number[] = [];
  private criticalEventTags = new Set<string>();

  private constructor() {
    this.initializePriorityTree();
  }

  static getInstance(): ExperienceBuffer {
    if (!ExperienceBuffer.instance) {
      ExperienceBuffer.instance = new ExperienceBuffer();
    }
    return ExperienceBuffer.instance;
  }

  updateConfig(config: Partial<BufferConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Experience buffer config updated', this.config);
  }

  /**
   * Initialize priority tree for efficient sampling
   */
  private initializePriorityTree(): void {
    // Binary tree for priority sampling - size needs to be power of 2
    let treeSize = 1;
    let attempts = 0;
    const maxAttempts = 1000;
    
    while (treeSize < this.config.capacity && attempts < maxAttempts) {
      // Find next power of 2
      treeSize *= 2;
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      this.logger.warn('Priority tree initialization reached max attempts, using capacity size', {
        capacity: this.config.capacity,
        finalTreeSize: treeSize
      });
      treeSize = this.config.capacity;
    }
    
    this.priorityTree = new Array(2 * treeSize).fill(0);
  }

  /**
   * Add experience to buffer with priority
   */
  addExperience(experience: Omit<Experience, 'id' | 'priority' | 'tdError'>): void {
    const id = this.generateExperienceId();
    const priority = this.config.maxPriority; // New experiences get max priority
    const tdError = 0; // Will be updated during training

    const fullExperience: Experience = {
      ...experience,
      id,
      priority,
      tdError
    };

    // Add to buffer (circular)
    this.buffer[this.position] = fullExperience;
    this.updatePriority(this.position, priority);

    this.position = (this.position + 1) % this.config.capacity;
    this.size = Math.min(this.size + 1, this.config.capacity);

    // Tag critical events
    this.tagCriticalEvents(fullExperience);

    this.logger.debug('Experience added to buffer', {
      id,
      symbol: experience.symbol,
      action: experience.action,
      reward: experience.reward.toFixed(4),
      bufferSize: this.size,
      priority: priority.toFixed(4)
    });
  }

  /**
   * Sample batch of experiences using prioritized sampling
   */
  sampleBatch(batchSize: number): {
    experiences: Experience[];
    indices: number[];
    weights: number[]; // Importance sampling weights
  } {
    if (this.size < batchSize) {
      console.error(`Not enough experiences in buffer: ${this.size} < ${batchSize}`);
    }

    const experiences: Experience[] = [];
    const indices: number[] = [];
    const weights: number[] = [];

    const totalPriority = this.priorityTree[1]; // Root contains total priority
    const segment = totalPriority / batchSize;

    // Anneal beta
    this.config.beta = Math.min(1.0, this.config.beta + this.config.betaIncrement);

    for (let i = 0; i < batchSize; i++) {
      const a = segment * i;
      const b = segment * (i + 1);
      const value = Math.random() * (b - a) + a;

      const index = this.sampleFromTree(value);
      const priority = this.priorityTree[this.config.capacity + index];
      
      experiences.push(this.buffer[index]);
      indices.push(index);

      // Calculate importance sampling weight
      const probability = priority / totalPriority;
      const weight = Math.pow(this.size * probability, -this.config.beta);
      weights.push(weight);
    }

    // Normalize weights
    const maxWeight = Math.max(...weights);
    const normalizedWeights = (weights || []).map(w => w / maxWeight);

    this.logger.debug('Batch sampled from experience buffer', {
      batchSize,
      totalPriority: totalPriority.toFixed(4),
      avgWeight: (normalizedWeights.reduce((sum, w) => sum + w, 0) / batchSize).toFixed(4),
      beta: this.config.beta.toFixed(4)
    });

    return {
      experiences,
      indices,
      weights: normalizedWeights
    };
  }

  /**
   * Update priorities based on TD errors
   */
  updatePriorities(indices: number[], tdErrors: number[]): void {
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];
      const tdError = Math.abs(tdErrors[i]);
      const priority = Math.pow(tdError + this.config.epsilon, this.config.alpha);

      this.buffer[index].tdError = tdError;
      this.buffer[index].priority = priority;
      this.updatePriority(index, priority);
    }

    this.logger.debug('Priorities updated', {
      updatedCount: indices.length,
      avgTDError: (tdErrors.reduce((sum, e) => sum + Math.abs(e), 0) / tdErrors.length).toFixed(4)
    });
  }

  /**
   * Add experiences from real market data
   */
  addMarketDataExperiences(marketData: MarketData[], actions: number[], rewards: number[]): void {
    if (marketData.length !== actions.length || actions.length !== rewards.length) {
      console.error('Market data, actions, and rewards arrays must have same length');
    }

    for (let i = 0; i < marketData.length - 1; i++) {
      const currentData = marketData[i];
      const nextData = marketData[i + 1];

      // Extract features from market data
      const state = this.extractFeatures(currentData);
      const nextState = this.extractFeatures(nextData);

      // Calculate volatility for metadata
      const volatility = Math.abs(currentData.high - currentData.low) / currentData.close;

      const experience = {
        state,
        action: actions[i],
        reward: rewards[i],
        nextState,
        terminal: i === marketData.length - 2, // Last transition is terminal
        timestamp: toTimestamp(currentData.timestamp),
        symbol: currentData.symbol,
        metadata: {
          price: currentData.close,
          volume: currentData.volume,
          volatility,
          confidence: 0.8 // Default confidence
        }
      };

      this.addExperience(experience);
    }

    this.logger.info('Market data experiences added', {
      symbol: marketData[0]?.symbol,
      experienceCount: marketData.length - 1,
      timeRange: [marketData[0]?.timestamp, marketData[marketData.length - 1]?.timestamp]
    });
  }

  /**
   * Tag critical market events for oversampling
   */
  private tagCriticalEvents(experience: Experience): void {
    const { metadata } = experience;
    
    // High volatility periods
    if (metadata.volatility > 0.05) { // 5% volatility threshold
      this.criticalEventTags.add(`${experience.symbol}_high_volatility_${experience.timestamp}`);
      experience.priority *= 2.0; // Double priority for high volatility
    }

    // Large volume spikes
    if (metadata.volume > 1000000) { // Volume threshold
      this.criticalEventTags.add(`${experience.symbol}_volume_spike_${experience.timestamp}`);
      experience.priority *= 1.5;
    }

    // Significant price movements
    const priceChange = Math.abs(experience.reward);
    if (priceChange > 0.03) { // 3% price change threshold
      this.criticalEventTags.add(`${experience.symbol}_price_movement_${experience.timestamp}`);
      experience.priority *= 1.8;
    }
  }

  /**
   * Extract features from market data
   */
  private extractFeatures(data: MarketData): number[] {
    return [
      data.open,
      data.high,
      data.low,
      data.close,
      data.volume,
      (data.high - data.low) / data.close, // Volatility
      (data.close - data.open) / data.open, // Return
      data.volume / 1000000, // Normalized volume
    ];
  }

  /**
   * Update priority in tree structure
   */
  private updatePriority(index: number, priority: number): void {
    const treeIndex = index + this.config.capacity;
    this.priorityTree[treeIndex] = priority;

    // Update parent nodes
    let parent = Math.floor(treeIndex / 2);
    while (parent >= 1) {
      this.priorityTree[parent] = this.priorityTree[2 * parent] + this.priorityTree[2 * parent + 1];
      parent = Math.floor(parent / 2);
    }
  }

  /**
   * Sample index from priority tree
   */
  private sampleFromTree(value: number): number {
    let index = 1;
    
    while (index < this.config.capacity) {
      const leftChild = 2 * index;
      const rightChild = leftChild + 1;
      
      if (value <= this.priorityTree[leftChild]) {
        index = leftChild;
      } else {
        value -= this.priorityTree[leftChild];
        index = rightChild;
      }
    }
    
    return index - this.config.capacity;
  }

  /**
   * Generate unique experience ID
   */
  private generateExperienceId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all experiences in buffer (for validation split)
   */
  getAllExperiences(): Experience[] {
    return this.buffer.slice(0, this.size);
  }

  /**
   * Get buffer statistics
   */
  getStatistics(): {
    size: number;
    capacity: number;
    utilization: number;
    criticalEventCount: number;
    avgPriority: number;
    priorityDistribution: { min: number; max: number; median: number };
  } {
    if (this.size === 0) {
      return {
        size: 0,
        capacity: this.config.capacity,
        utilization: 0,
        criticalEventCount: 0,
        avgPriority: 0,
        priorityDistribution: { min: 0, max: 0, median: 0 }
      };
    }

    const priorities = this.buffer.slice(0, this.size).map(exp => exp.priority);
    const avgPriority = priorities.reduce((sum, p) => sum + p, 0) / priorities.length;
    
    const sortedPriorities = [...priorities].sort((a, b) => a - b);
    const median = sortedPriorities[Math.floor(sortedPriorities.length / 2)];

    return {
      size: this.size,
      capacity: this.config.capacity,
      utilization: this.size / this.config.capacity,
      criticalEventCount: this.criticalEventTags.size,
      avgPriority,
      priorityDistribution: {
        min: Math.min(...priorities),
        max: Math.max(...priorities),
        median
      }
    };
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.buffer = [];
    this.position = 0;
    this.size = 0;
    this.criticalEventTags.clear();
    this.initializePriorityTree();
    
    this.logger.info('Experience buffer cleared');
  }
}