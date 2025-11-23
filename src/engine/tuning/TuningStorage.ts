/**
 * TuningStorage - Persistence layer for tuning results
 *
 * Responsibilities:
 * - Save TuningRunResult to disk
 * - Maintain index of tuning runs
 * - Retrieve tuning results by ID
 * - Rotate old results to prevent unbounded growth
 *
 * NO FAKE DATA - Only stores actual tuning results
 */

import fs from 'fs';
import path from 'path';
import { Logger } from '../../core/Logger.js';
import { TuningRunResult } from '../../types/index.js';

interface TuningIndexEntry {
  id: string;
  mode: 'grid' | 'ga';
  startedAt: string;
  finishedAt: string | null;
  metric: 'sharpe' | 'winRate' | 'pnl';
  bestMetricValue: number | null;
  error?: string | null;
}

interface TuningIndex {
  version: string;
  runs: TuningIndexEntry[];
  lastUpdated: string;
}

export class TuningStorage {
  private static instance: TuningStorage;
  private logger = Logger.getInstance();
  private storagePath: string;
  private indexPath: string;
  private maxStoredRuns = 50; // Keep latest 50 runs

  private constructor() {
    this.storagePath = path.join(process.cwd(), 'storage', 'tuning');
    this.indexPath = path.join(this.storagePath, 'index.json');
    this.ensureStorageExists();
  }

  public static getInstance(): TuningStorage {
    if (!TuningStorage.instance) {
      TuningStorage.instance = new TuningStorage();
    }
    return TuningStorage.instance;
  }

  /**
   * Ensure storage directory exists
   */
  private ensureStorageExists(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
      this.logger.info('Created tuning storage directory', { path: this.storagePath });
    }
  }

  /**
   * Save a tuning run result
   */
  public async saveResult(result: TuningRunResult): Promise<void> {
    try {
      // Save full result to individual file
      const resultPath = path.join(this.storagePath, `${result.id}.json`);
      fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8');

      this.logger.info('Saved tuning result', { id: result.id, path: resultPath });

      // Update index
      await this.updateIndex(result);

      // Rotate old results if needed
      await this.rotateOldResults();

    } catch (error) {
      this.logger.error('Failed to save tuning result', { id: result.id }, error as Error);
      throw error;
    }
  }

  /**
   * Retrieve a tuning run result by ID
   */
  public async getResult(id: string): Promise<TuningRunResult | null> {
    try {
      const resultPath = path.join(this.storagePath, `${id}.json`);

      if (!fs.existsSync(resultPath)) {
        this.logger.warn('Tuning result not found', { id });
        return null;
      }

      const rawData = fs.readFileSync(resultPath, 'utf-8');
      const result = JSON.parse(rawData) as TuningRunResult;

      return result;

    } catch (error) {
      this.logger.error('Failed to retrieve tuning result', { id }, error as Error);
      return null;
    }
  }

  /**
   * Get the latest tuning run
   */
  public async getLatest(): Promise<TuningRunResult | null> {
    try {
      const index = this.loadIndex();

      if (index.runs.length === 0) {
        return null;
      }

      // Sort by startedAt descending
      const sorted = index.runs.sort((a, b) => {
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      });

      const latestId = sorted[0].id;
      return await this.getResult(latestId);

    } catch (error) {
      this.logger.error('Failed to get latest tuning result', {}, error as Error);
      return null;
    }
  }

  /**
   * Get all tuning run summaries from index
   */
  public async getAllSummaries(): Promise<TuningIndexEntry[]> {
    try {
      const index = this.loadIndex();
      return index.runs.sort((a, b) => {
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      });
    } catch (error) {
      this.logger.error('Failed to get tuning summaries', {}, error as Error);
      return [];
    }
  }

  /**
   * Update the index with a new result
   */
  private async updateIndex(result: TuningRunResult): Promise<void> {
    const index = this.loadIndex();

    // Extract best metric value
    let bestMetricValue: number | null = null;
    if (result.bestCandidate && result.bestCandidate.metrics) {
      const metrics = result.bestCandidate.metrics;
      bestMetricValue = metrics[result.metric] ?? null;
    }

    // Create index entry
    const entry: TuningIndexEntry = {
      id: result.id,
      mode: result.mode,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      metric: result.metric,
      bestMetricValue,
      error: result.error
    };

    // Check if entry already exists (update scenario)
    const existingIndex = index.runs.findIndex(r => r.id === result.id);
    if (existingIndex >= 0) {
      index.runs[existingIndex] = entry;
    } else {
      index.runs.push(entry);
    }

    // Save index
    index.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');

    this.logger.debug('Updated tuning index', { id: result.id });
  }

  /**
   * Load the index (or create if doesn't exist)
   */
  private loadIndex(): TuningIndex {
    try {
      if (fs.existsSync(this.indexPath)) {
        const rawData = fs.readFileSync(this.indexPath, 'utf-8');
        return JSON.parse(rawData) as TuningIndex;
      }
    } catch (error) {
      this.logger.warn('Failed to load tuning index, creating fresh', {}, error as Error);
    }

    // Return fresh index
    return {
      version: '1.0',
      runs: [],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Rotate old results to keep storage bounded
   */
  private async rotateOldResults(): Promise<void> {
    try {
      const index = this.loadIndex();

      if (index.runs.length <= this.maxStoredRuns) {
        return; // No rotation needed
      }

      // Sort by startedAt ascending (oldest first)
      const sorted = index.runs.sort((a, b) => {
        return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
      });

      // Delete oldest runs
      const toDelete = sorted.slice(0, sorted.length - this.maxStoredRuns);

      for (const entry of toDelete) {
        const resultPath = path.join(this.storagePath, `${entry.id}.json`);
        if (fs.existsSync(resultPath)) {
          fs.unlinkSync(resultPath);
          this.logger.debug('Deleted old tuning result', { id: entry.id });
        }
      }

      // Update index to keep only latest runs
      index.runs = sorted.slice(-this.maxStoredRuns);
      index.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');

      this.logger.info('Rotated tuning results', {
        deleted: toDelete.length,
        remaining: index.runs.length
      });

    } catch (error) {
      this.logger.error('Failed to rotate tuning results', {}, error as Error);
    }
  }

  /**
   * Delete a specific tuning result
   */
  public async deleteResult(id: string): Promise<boolean> {
    try {
      const resultPath = path.join(this.storagePath, `${id}.json`);

      if (!fs.existsSync(resultPath)) {
        this.logger.warn('Tuning result not found for deletion', { id });
        return false;
      }

      fs.unlinkSync(resultPath);

      // Update index
      const index = this.loadIndex();
      index.runs = index.runs.filter(r => r.id !== id);
      index.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');

      this.logger.info('Deleted tuning result', { id });
      return true;

    } catch (error) {
      this.logger.error('Failed to delete tuning result', { id }, error as Error);
      return false;
    }
  }
}
