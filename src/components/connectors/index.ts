// Connector components - REFACTORED to use centralized data contexts
// Memory leak issue FIXED: Now uses DataContext/LiveDataContext instead of independent API calls

import { Logger } from '../../core/Logger.js';
const logger = Logger.getInstance();

// Re-enabled after refactoring to prevent memory leaks
export { RealPriceChartConnector } from './RealPriceChartConnector';
export { RealChartDataConnector } from './RealChartDataConnector';
export { RealDataProvider, useRealData } from './RealDataConnector';

// TODO: Refactor these remaining connectors to use contexts
/*
export { RealSignalFeedConnector } from './RealSignalFeedConnector';
export { RealPortfolioConnector } from './RealPortfolioConnector';
*/

logger.info('✅ Chart connectors re-enabled (refactored to use DataContext/LiveDataContext)');