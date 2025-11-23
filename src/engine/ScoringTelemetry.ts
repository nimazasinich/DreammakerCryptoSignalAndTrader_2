/**
 * Scoring Telemetry Module
 *
 * Tracks performance metrics for detectors and categories to enable adaptive weighting.
 *
 * Metrics tracked:
 * - Per-detector: wins, losses, winRate, avgPnL, totalSignals
 * - Per-category: aggregated metrics from constituent detectors
 *
 * Data is persisted to disk periodically for long-term learning.
 */

import fs from 'fs';
import path from 'path';
import { Logger } from '../core/Logger';

export type DetectorMetrics = {
  wins: number;
  losses: number;
  totalSignals: number;
  winRate: number;         // wins / totalSignals
  avgPnL?: number;         // average PnL (if available)
  avgConfidence?: number;  // average confidence of signals
  lastUpdated: number;     // timestamp
};

export type CategoryMetrics = {
  name: 'core' | 'smc' | 'patterns' | 'sentiment' | 'ml';
  wins: number;
  losses: number;
  totalSignals: number;
  winRate: number;
  avgConfidence?: number;
  detectors: string[];     // contributing detectors
  lastUpdated: number;
};

export type TelemetryData = {
  version: string;
  detectors: Record<string, DetectorMetrics>;
  categories: Record<string, CategoryMetrics>;
  globalStats: {
    totalSignals: number;
    totalWins: number;
    totalLosses: number;
    globalWinRate: number;
  };
  lastSaved: number;
};

/**
 * ScoringTelemetry - Singleton for tracking scoring performance
 */
export class ScoringTelemetry {
  private static instance: ScoringTelemetry;
  private data: TelemetryData;
  private logger = Logger.getInstance();
  private telemetryPath: string;
  private autosaveInterval: NodeJS.Timeout | null = null;
  private isDirty = false;

  private constructor(telemetryPath?: string) {
    this.telemetryPath = telemetryPath || path.join(process.cwd(), 'storage', 'mlOutputs', 'scoring_telemetry.json');
    this.data = this.loadTelemetry();

    // Auto-save every 5 minutes if dirty
    this.autosaveInterval = setInterval(() => {
      if (this.isDirty) {
        this.saveTelemetry();
        this.isDirty = false;
      }
    }, 5 * 60 * 1000);
  }

  public static getInstance(telemetryPath?: string): ScoringTelemetry {
    if (!ScoringTelemetry.instance) {
      ScoringTelemetry.instance = new ScoringTelemetry(telemetryPath);
    }
    return ScoringTelemetry.instance;
  }

  /**
   * Load telemetry from disk (or create fresh if not exists)
   */
  private loadTelemetry(): TelemetryData {
    try {
      if (fs.existsSync(this.telemetryPath)) {
        const raw = fs.readFileSync(this.telemetryPath, 'utf-8');
        const data = JSON.parse(raw) as TelemetryData;
        this.logger.info('Loaded telemetry data', { path: this.telemetryPath, signals: data.globalStats.totalSignals });
        return data;
      }
    } catch (error) {
      this.logger.warn('Failed to load telemetry, starting fresh', {}, error as Error);
    }

    // Return fresh telemetry
    return {
      version: '1.0',
      detectors: {},
      categories: {
        core: { name: 'core', wins: 0, losses: 0, totalSignals: 0, winRate: 0, detectors: [], lastUpdated: Date.now() },
        smc: { name: 'smc', wins: 0, losses: 0, totalSignals: 0, winRate: 0, detectors: [], lastUpdated: Date.now() },
        patterns: { name: 'patterns', wins: 0, losses: 0, totalSignals: 0, winRate: 0, detectors: [], lastUpdated: Date.now() },
        sentiment: { name: 'sentiment', wins: 0, losses: 0, totalSignals: 0, winRate: 0, detectors: [], lastUpdated: Date.now() },
        ml: { name: 'ml', wins: 0, losses: 0, totalSignals: 0, winRate: 0, detectors: [], lastUpdated: Date.now() }
      },
      globalStats: {
        totalSignals: 0,
        totalWins: 0,
        totalLosses: 0,
        globalWinRate: 0
      },
      lastSaved: Date.now()
    };
  }

  /**
   * Save telemetry to disk
   */
  private saveTelemetry(): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.telemetryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.data.lastSaved = Date.now();
      fs.writeFileSync(this.telemetryPath, JSON.stringify(this.data, null, 2), 'utf-8');
      this.logger.debug('Saved telemetry data', { path: this.telemetryPath });
    } catch (error) {
      this.logger.error('Failed to save telemetry', {}, error as Error);
    }
  }

  /**
   * Record a signal outcome
   * @param detectorName - name of the detector
   * @param category - category of the detector
   * @param isWin - whether the signal was profitable
   * @param pnl - profit/loss (optional)
   * @param confidence - signal confidence (optional)
   */
  public recordOutcome(
    detectorName: string,
    category: 'core' | 'smc' | 'patterns' | 'sentiment' | 'ml',
    isWin: boolean,
    pnl?: number,
    confidence?: number
  ): void {
    // Update detector metrics
    if (!this.data.detectors[detectorName]) {
      this.data.detectors[detectorName] = {
        wins: 0,
        losses: 0,
        totalSignals: 0,
        winRate: 0,
        lastUpdated: Date.now()
      };
    }

    const detector = this.data.detectors[detectorName];
    detector.totalSignals++;
    if (isWin) {
      detector.wins++;
    } else {
      detector.losses++;
    }
    detector.winRate = detector.totalSignals > 0 ? detector.wins / detector.totalSignals : 0;

    if (pnl !== undefined) {
      detector.avgPnL = detector.avgPnL
        ? (detector.avgPnL * (detector.totalSignals - 1) + pnl) / detector.totalSignals
        : pnl;
    }

    if (confidence !== undefined) {
      detector.avgConfidence = detector.avgConfidence
        ? (detector.avgConfidence * (detector.totalSignals - 1) + confidence) / detector.totalSignals
        : confidence;
    }

    detector.lastUpdated = Date.now();

    // Update category metrics
    const cat = this.data.categories[category];
    if (cat) {
      cat.totalSignals++;
      if (isWin) {
        cat.wins++;
      } else {
        cat.losses++;
      }
      cat.winRate = cat.totalSignals > 0 ? cat.wins / cat.totalSignals : 0;

      if (confidence !== undefined) {
        cat.avgConfidence = cat.avgConfidence
          ? (cat.avgConfidence * (cat.totalSignals - 1) + confidence) / cat.totalSignals
          : confidence;
      }

      if (!cat.detectors.includes(detectorName)) {
        cat.detectors.push(detectorName);
      }

      cat.lastUpdated = Date.now();
    }

    // Update global stats
    this.data.globalStats.totalSignals++;
    if (isWin) {
      this.data.globalStats.totalWins++;
    } else {
      this.data.globalStats.totalLosses++;
    }
    this.data.globalStats.globalWinRate = this.data.globalStats.totalSignals > 0
      ? this.data.globalStats.totalWins / this.data.globalStats.totalSignals
      : 0;

    this.isDirty = true;
  }

  /**
   * Get metrics for a specific detector
   */
  public getDetectorMetrics(detectorName: string): DetectorMetrics | null {
    return this.data.detectors[detectorName] || null;
  }

  /**
   * Get metrics for a specific category
   */
  public getCategoryMetrics(category: 'core' | 'smc' | 'patterns' | 'sentiment' | 'ml'): CategoryMetrics | null {
    return this.data.categories[category] || null;
  }

  /**
   * Get all telemetry data
   */
  public getAllData(): TelemetryData {
    return this.data;
  }

  /**
   * Get lightweight summary for UI/API responses
   */
  public getSummary() {
    const bestCategory = Object.entries(this.data.categories)
      .filter(([_, cat]) => cat.totalSignals >= 10) // minimum sample size
      .sort(([_, a], [__, b]) => b.winRate - a.winRate)[0];

    return {
      totalSignals: this.data.globalStats.totalSignals,
      winRate: this.data.globalStats.globalWinRate,
      avgConfidence: Object.values(this.data.categories)
        .filter(cat => cat.avgConfidence !== undefined)
        .reduce((sum, cat) => sum + (cat.avgConfidence || 0), 0) / 5,
      bestCategory: bestCategory ? bestCategory[0] : undefined,
      lastUpdate: this.data.lastSaved
    };
  }

  /**
   * Force save (e.g., on shutdown)
   */
  public forceSave(): void {
    this.saveTelemetry();
    this.isDirty = false;
  }

  /**
   * Reset all telemetry (use with caution!)
   */
  public reset(): void {
    this.logger.warn('Resetting all telemetry data');
    this.data = this.loadTelemetry();
    this.data.detectors = {};
    this.data.categories = {
      core: { name: 'core', wins: 0, losses: 0, totalSignals: 0, winRate: 0, detectors: [], lastUpdated: Date.now() },
      smc: { name: 'smc', wins: 0, losses: 0, totalSignals: 0, winRate: 0, detectors: [], lastUpdated: Date.now() },
      patterns: { name: 'patterns', wins: 0, losses: 0, totalSignals: 0, winRate: 0, detectors: [], lastUpdated: Date.now() },
      sentiment: { name: 'sentiment', wins: 0, losses: 0, totalSignals: 0, winRate: 0, detectors: [], lastUpdated: Date.now() },
      ml: { name: 'ml', wins: 0, losses: 0, totalSignals: 0, winRate: 0, detectors: [], lastUpdated: Date.now() }
    };
    this.data.globalStats = { totalSignals: 0, totalWins: 0, totalLosses: 0, globalWinRate: 0 };
    this.saveTelemetry();
  }

  /**
   * Cleanup on shutdown
   */
  public shutdown(): void {
    if (this.autosaveInterval) {
      clearInterval(this.autosaveInterval);
    }
    this.forceSave();
  }
}
