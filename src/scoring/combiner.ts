/**
 * SUPREME JUDICIAL COMBINER
 * Multi-Timeframe Supreme Court - Combines detector scores across timeframes
 */

import { 
  TFResult, 
  StrategicVerdict, 
  DistrictVerdict,
  DetectorComponent,
  QuantumScore,
  DetectorName,
  ConstitutionalDetectorOutput,
  MarketContext
} from './types.js';
import { DetectorWeights, TimeframeWeights } from './types.js';
import { WeightParliament } from './weights.js';
import { Logger } from '../core/Logger.js';

/**
 * Timeframe Jurisdiction
 */
interface TimeframeJurisdiction {
  tf: string;
  weight: number;
  priority: 'TACTICAL' | 'STRATEGIC' | 'OPERATIONAL';
}

/**
 * Default Timeframe Jurisdictions
 */
const TIME_FRAME_COURTS: TimeframeJurisdiction[] = [
  { tf: '5m', weight: 0.15, priority: 'TACTICAL' },
  { tf: '15m', weight: 0.25, priority: 'TACTICAL' },
  { tf: '1h', weight: 0.30, priority: 'OPERATIONAL' },
  { tf: '4h', weight: 0.20, priority: 'STRATEGIC' },
  { tf: '1d', weight: 0.10, priority: 'STRATEGIC' }
];

/**
 * Supreme Judicial Combiner
 * Combines detector scores across multiple timeframes
 */
export class SupremeJudicialCombiner {
  private static instance: SupremeJudicialCombiner;
  private logger = Logger.getInstance();
  private weightParliament = WeightParliament.getInstance();
  
  private static readonly NEUTRAL_TERRITORY = 0.05;
  private static readonly STRONG_SIGNAL_OVERRIDE = 0.65;
  private static readonly MAJORITY_CONSENSUS = 0.60;

  private constructor() {}

  static getInstance(): SupremeJudicialCombiner {
    if (!SupremeJudicialCombiner.instance) {
      SupremeJudicialCombiner.instance = new SupremeJudicialCombiner();
    }
    return SupremeJudicialCombiner.instance;
  }

  /**
   * Combine scores for a single timeframe
   */
  combineOneTF(
    timeframe: string,
    detectorScores: Map<DetectorName, ConstitutionalDetectorOutput>,
    weights?: DetectorWeights
  ): TFResult {
    const detectorWeights = weights || this.weightParliament.getDetectorWeights();
    const timeframeWeight = this.weightParliament.getTimeframeWeight(timeframe);
    
    const components: DetectorComponent[] = [];
    let weightedSum = 0;
    let totalWeight = 0;

    // Process each detector
    detectorScores.forEach((output, detectorName) => {
      const weight = this.getDetectorWeight(detectorName, detectorWeights);
      
      if (weight > 0) {
        const weighted = output.score * weight;
        weightedSum += weighted;
        totalWeight += weight;

        components.push({
          name: detectorName,
          raw: output.meta,
          signed: output.score,
          weighted,
          meta: {
            confidence: output.confidence,
            timestamp: output.timestamp,
            ...output.meta
          }
        });
      }
    });

    // Normalize if weights don't sum to 1
    const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Determine direction
    const direction = this.determineDirection(finalScore);

    // Get timeframe priority
    const jurisdiction = TIME_FRAME_COURTS.find(j => j.tf === timeframe);
    const priority = jurisdiction?.priority || 'OPERATIONAL';

    return {
      tf: timeframe,
      direction,
      final_score: finalScore as QuantumScore,
      components,
      weight: timeframeWeight,
      priority
    };
  }

  /**
   * Deliver supreme verdict (combine across timeframes)
   */
  deliverVerdict(
    timeframeResults: TFResult[],
    marketContext?: MarketContext
  ): StrategicVerdict {
    // Phase 1: Individual Timeframe Analysis
    const districtVerdicts = (timeframeResults || []).map(district => 
      this.analyzeDistrictTestimony(district)
    );

    // Phase 2: Cross-Timeframe Consensus Building
    const supremeConsensus = this.buildSupremeConsensus(
      timeframeResults,
      districtVerdicts
    );

    // Phase 3: Constitutional Action Determination
    return this.determineConstitutionalAction(
      supremeConsensus,
      timeframeResults,
      marketContext
    );
  }

  /**
   * Analyze district testimony (single timeframe judicial interpretation)
   */
  private analyzeDistrictTestimony(district: TFResult): DistrictVerdict {
    const detectorTestimony = (district.components || []).map(detector => ({
      name: detector.name,
      rawEvidence: detector.raw,
      weightedInfluence: detector.signed,
      credibility: Math.abs(detector.signed) // How strongly they believe their story
    }));

    const judicialNotes = this.generateJudicialNotes(detectorTestimony);

    return {
      timeframe: district.tf,
      direction: district.direction,
      convictionStrength: Math.abs(district.final_score),
      detectorTestimony,
      judicialNotes
    };
  }

  /**
   * Build supreme consensus across timeframes
   */
  private buildSupremeConsensus(
    timeframeResults: TFResult[],
    districtVerdicts: DistrictVerdict[]
  ): {
    weightedScore: QuantumScore;
    consensusStrength: number;
    alignment: number;
  } {
    let weightedSum = 0;
    let totalWeight = 0;
    const scores: QuantumScore[] = [];

    timeframeResults.forEach(result => {
      const weight = result.weight || this.weightParliament.getTimeframeWeight(result.tf);
      weightedSum += result.final_score * weight;
      totalWeight += weight;
      scores.push(result.final_score);
    });

    const weightedScore = (totalWeight > 0 ? weightedSum / totalWeight : 0) as QuantumScore;

    // Calculate consensus strength (how aligned are the timeframes)
    const alignment = this.calculateAlignment(scores);
    const consensusStrength = Math.abs(weightedScore) * alignment;

    return {
      weightedScore,
      consensusStrength,
      alignment
    };
  }

  /**
   * Determine constitutional action from consensus
   */
  private determineConstitutionalAction(
    consensus: { weightedScore: QuantumScore; consensusStrength: number; alignment: number },
    timeframeResults: TFResult[],
    marketContext?: MarketContext
  ): StrategicVerdict {
    const { weightedScore, consensusStrength, alignment } = consensus;

    // Determine direction
    const direction = this.determineDirection(weightedScore);

    // Determine action level
    const absScore = Math.abs(weightedScore);
    let action: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

    if (absScore > SupremeJudicialCombiner.STRONG_SIGNAL_OVERRIDE) {
      action = direction === 'BULLISH' ? 'STRONG_BUY' : 'STRONG_SELL';
    } else if (absScore > SupremeJudicialCombiner.MAJORITY_CONSENSUS) {
      action = direction === 'BULLISH' ? 'BUY' : 'SELL';
    } else if (absScore > SupremeJudicialCombiner.NEUTRAL_TERRITORY) {
      action = 'HOLD';
    } else {
      action = 'HOLD'; // Neutral territory
    }

    // Find dissenting opinions
    const dissentingOpinions = this.findDissentingOpinions(
      timeframeResults,
      direction
    );

    return {
      direction,
      quantumScore: weightedScore,
      conviction: absScore,
      action,
      timeframeResults,
      dissentingOpinions,
      consensusStrength: alignment
    };
  }

  /**
   * Determine direction from score
   */
  private determineDirection(score: QuantumScore): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    if (Math.abs(score) < SupremeJudicialCombiner.NEUTRAL_TERRITORY) {
      return 'NEUTRAL';
    }
    return score > 0 ? 'BULLISH' : 'BEARISH';
  }

  /**
   * Calculate alignment between timeframe scores
   */
  private calculateAlignment(scores: QuantumScore[]): number {
    if (scores.length === 0) return 0;
    if (scores.length === 1) return 1;

    // Calculate variance
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    
    // Normalize variance to [0, 1] alignment score
    // Lower variance = higher alignment
    const maxVariance = 4; // Maximum possible variance (range is -1 to +1)
    const alignment = Math.max(0, 1 - (variance / maxVariance));

    return alignment;
  }

  /**
   * Generate judicial notes for detector testimony
   */
  private generateJudicialNotes(
    testimony: Array<{ name: DetectorName; weightedInfluence: QuantumScore; credibility: number }>
  ): string[] {
    const notes: string[] = [];

    // Find strongest contributors
    const sorted = [...testimony].sort((a, b) => 
      Math.abs(b.weightedInfluence) - Math.abs(a.weightedInfluence)
    );

    if ((sorted?.length || 0) > 0 && Math.abs(sorted[0].weightedInfluence) > 0.5) {
      notes.push(`${sorted[0].name} provides strongest signal (${sorted[0].weightedInfluence.toFixed(2)})`);
    }

    // Check for conflicts
    const bullish = testimony.filter(t => t.weightedInfluence > 0.3);
    const bearish = testimony.filter(t => t.weightedInfluence < -0.3);

    if ((bullish?.length || 0) > 0 && (bearish?.length || 0) > 0) {
      notes.push(`Conflicting signals: ${bullish.length} bullish vs ${bearish.length} bearish`);
    }

    // Check consensus
    const consensus = testimony.filter(t => Math.abs(t.weightedInfluence) > 0.5).length;
    if (consensus === testimony.length) {
      notes.push('Strong consensus across all detectors');
    }

    return notes;
  }

  /**
   * Find dissenting opinions
   */
  private findDissentingOpinions(
    timeframeResults: TFResult[],
    consensusDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  ): Array<{
    detector: DetectorName;
    timeframe: string;
    opinion: string;
    score: QuantumScore;
  }> {
    const dissents: Array<{
      detector: DetectorName;
      timeframe: string;
      opinion: string;
      score: QuantumScore;
    }> = [];

    timeframeResults.forEach(result => {
      // Check if timeframe disagrees with consensus
      if (result.direction !== consensusDirection && 
          result.direction !== 'NEUTRAL' &&
          Math.abs(result.final_score) > 0.3) {
        
        // Find detectors that disagree
        result.components.forEach(component => {
          const componentDirection = component.signed > 0 ? 'BULLISH' : 
                                   component.signed < 0 ? 'BEARISH' : 'NEUTRAL';
          
          if (componentDirection !== consensusDirection && 
              componentDirection !== 'NEUTRAL' &&
              Math.abs(component.signed) > 0.3) {
            dissents.push({
              detector: component.name,
              timeframe: result.tf,
              opinion: `${component.name} on ${result.tf} indicates ${componentDirection.toLowerCase()} (${component.signed.toFixed(2)})`,
              score: component.signed
            });
          }
        });
      }
    });

    return dissents;
  }

  /**
   * Get detector weight from weights configuration
   */
  private getDetectorWeight(
    detector: DetectorName,
    weights: DetectorWeights
  ): number {
    if (weights.technical_analysis[detector as keyof typeof weights.technical_analysis] !== undefined) {
      return weights.technical_analysis[detector as keyof typeof weights.technical_analysis];
    }
    
    if (weights.fundamental_analysis[detector as keyof typeof weights.fundamental_analysis] !== undefined) {
      return weights.fundamental_analysis[detector as keyof typeof weights.fundamental_analysis];
    }
    
    return 0;
  }
}
