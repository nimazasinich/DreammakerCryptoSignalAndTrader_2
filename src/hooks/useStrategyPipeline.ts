/**
 * useStrategyPipeline Hook
 *
 * React hook for managing strategy pipeline execution state
 * Provides loading, error, and data states for the UI
 */

import { useState, useCallback } from 'react';
import { Logger } from '../core/Logger';
import { strategyPipelineService } from '../services/StrategyPipelineService';
import {
  StrategyPipelineResult,
  StrategyPipelineParams
} from '../types/strategyPipeline';

export interface UseStrategyPipelineState {
  data: StrategyPipelineResult | null;
  isLoading: boolean;
  error: string | null;
  isAdaptiveEnabled: boolean;
}

export interface UseStrategyPipelineActions {
  runDefaultPipeline: () => Promise<void>;
  runCustomPipeline: (params: StrategyPipelineParams) => Promise<void>;
  runPipelineForSymbols: (symbols: string[]) => Promise<void>;
  reset: () => void;
}

export type UseStrategyPipelineReturn = UseStrategyPipelineState & UseStrategyPipelineActions;

/**
 * Hook for managing strategy pipeline execution
 */
export function useStrategyPipeline(): UseStrategyPipelineReturn {
  const logger = Logger.getInstance();

  const [data, setData] = useState<StrategyPipelineResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdaptiveEnabled, setIsAdaptiveEnabled] = useState(false);

  /**
   * Run default pipeline (top 20 symbols, standard timeframes)
   */
  const runDefaultPipeline = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Running default strategy pipeline');
      const result = await strategyPipelineService.runDefaultPipeline();
      setData(result);
      setIsAdaptiveEnabled(result.scoring.adaptiveEnabled);
      logger.info('Default pipeline completed', {
        s1: result.strategy1.symbols.length,
        s2: result.strategy2.symbols.length,
        s3: result.strategy3.symbols.length
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Pipeline execution failed';
      setError(errorMessage);
      logger.error('Default pipeline failed', {}, err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [logger]);

  /**
   * Run pipeline with custom parameters
   */
  const runCustomPipeline = useCallback(async (params: StrategyPipelineParams) => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Running custom strategy pipeline', { params });
      const result = await strategyPipelineService.runPipeline(params);
      setData(result);
      setIsAdaptiveEnabled(result.scoring.adaptiveEnabled);
      logger.info('Custom pipeline completed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Pipeline execution failed';
      setError(errorMessage);
      logger.error('Custom pipeline failed', {}, err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [logger]);

  /**
   * Run pipeline for specific symbols
   */
  const runPipelineForSymbols = useCallback(async (symbols: string[]) => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Running pipeline for specific symbols', { symbols });
      const result = await strategyPipelineService.runPipelineForSymbols(symbols);
      setData(result);
      setIsAdaptiveEnabled(result.scoring.adaptiveEnabled);
      logger.info('Symbol-specific pipeline completed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Pipeline execution failed';
      setError(errorMessage);
      logger.error('Symbol-specific pipeline failed', {}, err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [logger]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setIsAdaptiveEnabled(false);
  }, []);

  return {
    data,
    isLoading,
    error,
    isAdaptiveEnabled,
    runDefaultPipeline,
    runCustomPipeline,
    runPipelineForSymbols,
    reset
  };
}
