import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import {
  DataSourceType,
  getAvailableDataSources,
  getDataSourceConfig,
  getPrimaryDataSource,
  setPrimaryDataSourceOverride,
  clearPrimaryDataSourceOverride
} from '../config/dataSource.js';
import { createErrorResponse } from '../utils/errorResponse.js';

const runtimeOverrideSupported = true;

export class DataSourceController {
  private logger = Logger.getInstance();

  getConfig(_req: Request, res: Response): void {
    const config = getDataSourceConfig();

    res.json({
      ok: true,
      primarySource: config.primarySource,
      availableSources: config.availableSources,
      overrides: config.overrides,
      huggingface: config.huggingface,
      runtimeOverrideSupported,
      timestamp: Date.now()
    });
  }

  setPrimarySource(req: Request, res: Response): void {
    if (!runtimeOverrideSupported) {
      res.status(405).json(
        createErrorResponse({
          source: 'config',
          reason: 'NOT_IMPLEMENTED',
          message: 'Runtime overrides are disabled in this deployment.'
        })
      );
      return;
    }

    const { primarySource } = req.body as { primarySource?: DataSourceType | 'env' };

    if (!primarySource) {
      res.status(400).json(
        createErrorResponse({
          source: 'config',
          reason: 'VALIDATION_ERROR',
          message: 'primarySource is required'
        })
      );
      return;
    }

    if (primarySource === 'env') {
      clearPrimaryDataSourceOverride();
      const config = getDataSourceConfig();
      res.json({
        ok: true,
        primarySource: config.primarySource,
        overrides: config.overrides,
        runtimeOverrideSupported
      });
      return;
    }

    const availableSources = getAvailableDataSources();

    if (!availableSources.includes(primarySource)) {
      res.status(400).json(
        createErrorResponse({
          source: 'config',
          reason: 'VALIDATION_ERROR',
          message: `Unsupported data source "${primarySource}".`,
          details: { availableSources }
        })
      );
      return;
    }

    if (primarySource !== 'huggingface') {
      res.status(400).json(
        createErrorResponse({
          source: primarySource,
          reason: 'NOT_IMPLEMENTED',
          message: `Primary data source "${primarySource}" is not implemented yet. Please keep using HuggingFace.`
        })
      );
      return;
    }

    setPrimaryDataSourceOverride(primarySource);
    const config = getDataSourceConfig();

    this.logger.info('Primary data source override updated', {
      primarySource: config.primarySource
    });

    res.json({
      ok: true,
      primarySource: config.primarySource,
      overrides: config.overrides,
      runtimeOverrideSupported
    });
  }
}

