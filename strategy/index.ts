/**
 * STRATEGY MODULE - MAIN EXPORTS
 */

// Export all features
export {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollinger,
  calculateATR,
  calculateADX,
  calculateROC,
  detectSupportResistance,
  detectSwingPoints,
  detectSMCMarkers,
  calculateFibonacci,
  generateFeatures
} from './features.js';

// Export all detectors (note: detectSupportResistance in detectors will shadow the one from features)
export {
  detectMLAI,
  detectRSI,
  detectMACD,
  detectMACross,
  detectBollinger,
  detectVolume,
  detectADX,
  detectROC,
  detectMarketStructure,
  detectReversal
} from './detectors.js';

// Export engine
export * from './engine.js';
