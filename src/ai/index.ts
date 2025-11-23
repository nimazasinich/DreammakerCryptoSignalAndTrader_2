// AI Core Module Exports
export { XavierInitializer } from './XavierInitializer.js';
export { StableActivations } from './StableActivations.js';
export { NetworkArchitectures } from './NetworkArchitectures.js';
export { GradientClipper } from './GradientClipper.js';
export { AdamWOptimizer } from './AdamWOptimizer.js';
export { LearningRateScheduler } from './LearningRateScheduler.js';
export { InstabilityWatchdog } from './InstabilityWatchdog.js';
export { ExperienceBuffer } from './ExperienceBuffer.js';
export { ExplorationStrategies } from './ExplorationStrategies.js';
export { TrainingEngine } from './TrainingEngine.js';
export { RealTrainingEngine } from './RealTrainingEngine.js';
export { BullBearAgent } from './BullBearAgent.js';
export { BacktestEngine } from './BacktestEngine.js';
export { FeatureEngineering } from './FeatureEngineering.js';
export { TensorFlowModel } from './TensorFlowModel.js';

// Type exports
export type { InitializationMode, InitializationConfig } from './XavierInitializer.js';
export type { ActivationConfig } from './StableActivations.js';
export type { LayerConfig, NetworkConfig } from './NetworkArchitectures.js';
export type { TrainingConfig, TrainingState } from './TrainingEngine.js';
export type { RealTrainingConfig } from './RealTrainingEngine.js';
export type { BullBearPrediction, GoalConfig } from './BullBearAgent.js';
export type { BacktestConfig, Trade } from './BacktestEngine.js';
export type { TechnicalIndicators, SMCFeatures, ElliottWaveFeatures, HarmonicFeatures } from './FeatureEngineering.js';

// Re-export for convenience - Singleton instances
import { XavierInitializer } from './XavierInitializer.js';
import { StableActivations } from './StableActivations.js';
import { NetworkArchitectures } from './NetworkArchitectures.js';
import { GradientClipper } from './GradientClipper.js';
import { AdamWOptimizer } from './AdamWOptimizer.js';
import { LearningRateScheduler } from './LearningRateScheduler.js';
import { InstabilityWatchdog } from './InstabilityWatchdog.js';
import { ExperienceBuffer } from './ExperienceBuffer.js';
import { ExplorationStrategies } from './ExplorationStrategies.js';
import { TrainingEngine } from './TrainingEngine.js';
import { RealTrainingEngine } from './RealTrainingEngine.js';
import { BullBearAgent } from './BullBearAgent.js';
import { BacktestEngine } from './BacktestEngine.js';
import { FeatureEngineering } from './FeatureEngineering.js';
import { TensorFlowModel } from './TensorFlowModel.js';

export const AICore = {
  XavierInitializer: XavierInitializer.getInstance(),
  StableActivations: StableActivations.getInstance(),
  NetworkArchitectures: NetworkArchitectures.getInstance(),
  GradientClipper: GradientClipper.getInstance(),
  AdamWOptimizer: AdamWOptimizer.getInstance(),
  LearningRateScheduler: LearningRateScheduler.getInstance(),
  InstabilityWatchdog: InstabilityWatchdog.getInstance(),
  ExperienceBuffer: ExperienceBuffer.getInstance(),
  ExplorationStrategies: ExplorationStrategies.getInstance(),
  TrainingEngine: TrainingEngine.getInstance(),
  RealTrainingEngine: RealTrainingEngine.getInstance(),
  BullBearAgent: BullBearAgent.getInstance(),
  BacktestEngine: BacktestEngine.getInstance(),
  FeatureEngineering: FeatureEngineering.getInstance(),
  TensorFlowModel: TensorFlowModel.getInstance()
};