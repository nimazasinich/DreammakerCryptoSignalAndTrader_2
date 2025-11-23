/**
 * Score Stream Gateway
 * WebSocket channel for broadcasting live scoring updates
 *
 * DESIGN PRINCIPLES:
 * - Singleton pattern (reuses existing WebSocket server)
 * - Configurable broadcast interval
 * - Real-time score streaming for multiple symbols
 * - Efficient client management
 */

import { WebSocket } from 'ws';
import { Logger } from '../core/Logger.js';
import { ScoringLiveService, LiveScoreResult } from '../engine/live/ScoringLiveService.js';
import { isFeatureEnabled } from '../config/systemConfig.js';

export interface ScoreStreamConfig {
  symbols: string[];
  timeframe: string;
  broadcastIntervalMs: number;
}

export class ScoreStreamGateway {
  private static instance: ScoreStreamGateway;
  private logger = Logger.getInstance();
  private scoringService = ScoringLiveService.getInstance();
  private connectedClients = new Set<WebSocket>();
  private broadcastInterval: NodeJS.Timeout | null = null;

  // Stream configuration
  private config: ScoreStreamConfig = {
    symbols: ['BTCUSDT', 'ETHUSDT'],
    timeframe: '1h',
    broadcastIntervalMs: 30000 // 30 seconds default
  };

  // Cache for latest scores
  private latestScores = new Map<string, LiveScoreResult>();

  // Stream status
  private isStreaming = false;

  private constructor() {
    this.logger.info('ScoreStreamGateway initialized');
  }

  static getInstance(): ScoreStreamGateway {
    if (!ScoreStreamGateway.instance) {
      ScoreStreamGateway.instance = new ScoreStreamGateway();
    }
    return ScoreStreamGateway.instance;
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(client: WebSocket): void {
    // Check if live scoring is enabled
    if (!isFeatureEnabled('liveScoring')) {
      this.logger.warn('Live scoring is disabled, rejecting connection');
      client.send(JSON.stringify({
        type: 'error',
        message: 'Live scoring is currently disabled in system configuration'
      }));
      client.close();
      return;
    }

    this.connectedClients.add(client);
    this.logger.info('Score stream client connected', { clients: this.connectedClients.size });

    // Send welcome message
    client.send(JSON.stringify({
      type: 'score_stream_connected',
      message: 'Connected to live scoring stream',
      config: this.config,
      timestamp: Date.now()
    }));

    // Send latest scores if available
    this.sendLatestScores(client).catch(error => {
      this.logger.error('Failed to send initial scores', {}, error as Error);
    });

    // Start streaming if not already started
    if (!this.isStreaming && this.connectedClients.size > 0) {
      this.startStreaming();
    }

    client.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleMessage(client, data);
      } catch (error) {
        this.logger.error('Failed to parse WebSocket message', {}, error as Error);
        client.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    client.on('close', () => {
      this.connectedClients.delete(client);
      this.logger.info('Score stream client disconnected', { clients: this.connectedClients.size });

      // Stop streaming if no clients
      if (this.connectedClients.size === 0 && this.isStreaming) {
        this.stopStreaming();
      }
    });

    client.on('error', (error) => {
      this.logger.error('Score stream client error', {}, error);
      this.connectedClients.delete(client);
    });
  }

  /**
   * Handle incoming messages from clients
   */
  private async handleMessage(client: WebSocket, data: any): Promise<void> {
    try {
      switch (data.type) {
        case 'subscribe':
          // Subscribe to specific symbols
          if (data.symbols && Array.isArray(data.symbols)) {
            this.config.symbols = data.symbols;
            client.send(JSON.stringify({
              type: 'subscribed',
              symbols: this.config.symbols,
              timestamp: Date.now()
            }));
          }
          break;

        case 'configure':
          // Update stream configuration
          if (data.config) {
            if (data.config.symbols) this.config.symbols = data.config.symbols;
            if (data.config.timeframe) this.config.timeframe = data.config.timeframe;
            if (data.config.broadcastIntervalMs) {
              this.config.broadcastIntervalMs = data.config.broadcastIntervalMs;
              // Restart streaming with new interval
              if (this.isStreaming) {
                this.stopStreaming();
                this.startStreaming();
              }
            }
            client.send(JSON.stringify({
              type: 'configured',
              config: this.config,
              timestamp: Date.now()
            }));
          }
          break;

        case 'get_latest':
          // Send latest scores
          await this.sendLatestScores(client);
          break;

        case 'get_status':
          // Send stream status
          client.send(JSON.stringify({
            type: 'stream_status',
            status: {
              isStreaming: this.isStreaming,
              clients: this.connectedClients.size,
              symbols: this.config.symbols,
              timeframe: this.config.timeframe,
              broadcastIntervalMs: this.config.broadcastIntervalMs,
              latestScoresCount: this.latestScores.size
            },
            timestamp: Date.now()
          }));
          break;

        default:
          client.send(JSON.stringify({
            type: 'error',
            message: `Unknown message type: ${data.type}`
          }));
      }
    } catch (error) {
      this.logger.error('Failed to handle WebSocket message', { type: data.type }, error as Error);
      client.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process request'
      }));
    }
  }

  /**
   * Send latest scores to a specific client
   */
  private async sendLatestScores(client: WebSocket): Promise<void> {
    if (this.latestScores.size === 0) {
      client.send(JSON.stringify({
        type: 'score_update',
        scores: [],
        message: 'No scores available yet',
        timestamp: Date.now()
      }));
      return;
    }

    const scores = Array.from(this.latestScores.values());
    client.send(JSON.stringify({
      type: 'score_update',
      scores,
      timestamp: Date.now()
    }));
  }

  /**
   * Start streaming scores
   */
  private startStreaming(): void {
    // Check if live scoring is enabled
    if (!isFeatureEnabled('liveScoring')) {
      this.logger.warn('Live scoring is disabled in system config, cannot start streaming');
      return;
    }

    if (this.isStreaming) {
      this.logger.warn('Score streaming already active');
      return;
    }

    this.logger.info('Starting score streaming', {
      symbols: this.config.symbols,
      timeframe: this.config.timeframe,
      intervalMs: this.config.broadcastIntervalMs
    });

    this.isStreaming = true;

    // Immediately fetch and broadcast scores
    this.fetchAndBroadcastScores().catch(error => {
      this.logger.error('Initial score fetch failed', {}, error as Error);
    });

    // Set up periodic broadcast
    this.broadcastInterval = setInterval(async () => {
      if (this.connectedClients.size === 0) {
        this.stopStreaming();
        return;
      }

      await this.fetchAndBroadcastScores();
    }, this.config.broadcastIntervalMs);
  }

  /**
   * Stop streaming scores
   */
  private stopStreaming(): void {
    if (!this.isStreaming) {
      return;
    }

    this.logger.info('Stopping score streaming');

    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    this.isStreaming = false;
  }

  /**
   * Fetch scores and broadcast to all clients
   */
  private async fetchAndBroadcastScores(): Promise<void> {
    try {
      this.logger.debug('Fetching live scores', {
        symbols: this.config.symbols,
        timeframe: this.config.timeframe
      });

      // Fetch scores for all symbols in parallel
      const scorePromises = this.config.symbols.map(symbol =>
        this.scoringService.generateLiveScore(symbol, this.config.timeframe)
          .then(score => ({ symbol, score }))
          .catch(error => {
            this.logger.error(`Failed to generate score for ${symbol}`, { symbol }, error as Error);
            return null;
          })
      );

      const results = await Promise.all(scorePromises);

      // Update cache and filter out failed scores
      const validScores: LiveScoreResult[] = [];
      for (const result of results) {
        if (result && result.score) {
          this.latestScores.set(result.symbol, result.score);
          validScores.push(result.score);
        }
      }

      // Broadcast to all connected clients
      if (validScores.length > 0) {
        this.broadcastScores(validScores);
      }

      this.logger.debug('Live scores broadcasted', {
        scoresCount: validScores.length,
        clientsCount: this.connectedClients.size
      });
    } catch (error) {
      this.logger.error('Failed to fetch and broadcast scores', {}, error as Error);
    }
  }

  /**
   * Broadcast scores to all connected clients
   */
  private broadcastScores(scores: LiveScoreResult[]): void {
    const message = JSON.stringify({
      type: 'score_update',
      scores,
      timestamp: Date.now()
    });

    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          this.logger.error('Failed to send score update to client', {}, error as Error);
        }
      }
    });
  }

  /**
   * Broadcast a single score update
   */
  broadcastScore(score: LiveScoreResult): void {
    this.latestScores.set(score.symbol, score);

    const message = JSON.stringify({
      type: 'score_update',
      scores: [score],
      timestamp: Date.now()
    });

    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          this.logger.error('Failed to broadcast score update', {}, error as Error);
        }
      }
    });
  }

  /**
   * Get stream status
   */
  getStatus(): {
    isStreaming: boolean;
    clients: number;
    symbols: string[];
    timeframe: string;
    broadcastIntervalMs: number;
    latestScoresCount: number;
  } {
    return {
      isStreaming: this.isStreaming,
      clients: this.connectedClients.size,
      symbols: this.config.symbols,
      timeframe: this.config.timeframe,
      broadcastIntervalMs: this.config.broadcastIntervalMs,
      latestScoresCount: this.latestScores.size
    };
  }

  /**
   * Get latest score for a symbol
   */
  getLatestScore(symbol: string): LiveScoreResult | null {
    return this.latestScores.get(symbol) || null;
  }

  /**
   * Get all latest scores
   */
  getAllLatestScores(): LiveScoreResult[] {
    return Array.from(this.latestScores.values());
  }

  /**
   * Update stream configuration
   */
  updateConfig(config: Partial<ScoreStreamConfig>): void {
    if (config.symbols) this.config.symbols = config.symbols;
    if (config.timeframe) this.config.timeframe = config.timeframe;
    if (config.broadcastIntervalMs) {
      this.config.broadcastIntervalMs = config.broadcastIntervalMs;
      // Restart streaming with new interval
      if (this.isStreaming) {
        this.stopStreaming();
        this.startStreaming();
      }
    }

    this.logger.info('Stream configuration updated', this.config);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopStreaming();
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    this.connectedClients.clear();
    this.latestScores.clear();
    this.logger.info('ScoreStreamGateway destroyed');
  }
}
