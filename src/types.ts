import { BaseNode, BaseRequest, BaseResponse, BaseMetrics, Config, DEFAULT_CONFIG } from './core/types';

// Strategy-specific extensions of base types
export interface ThoughtNode extends BaseNode {
  // Additional ThoughtNode properties can be added here
}

export interface ReasoningRequest extends BaseRequest {
  beamWidth?: number;
  numSimulations?: number;
}

export interface ReasoningResponse extends BaseResponse {
  currentPrompt?: string;
  reasoningContext?: {
    instruction: string;
    currentPath: string[];
    alternativePaths: string[];
    mistakes: string[];
    improvements: string[];
    confidence: number;
  };
  prompts?: {
    instruction: string;
    context: {
      currentPath: string;
      alternativePaths: string;
      bestOutcomes: string;
      failedAttempts: string;
      reasoning: string;
    };
    reflection: {
      mistakes: string;
      improvements: string;
      confidence: string;
    };
  };
  metrics?: {
    policyLoss: number;
    valueLoss: number;
    entropyLoss: number;
    totalLoss: number;
    advantageStats: {
      mean: number;
      std: number;
      min: number;
      max: number;
    };
    proximityStats: {
      meanDivergence: number;
      clipFraction: number;
      trustRegionViolations: number;
    };
    samplingStats: {
      meanRatio: number;
      minRatio: number;
      maxRatio: number;
    };
    nodeStats: {
      advantageEstimate: number;
      entropyBonus: number;
      proximityScore: number;
      trustRegionViolation: boolean;
    };
  };
}

export interface ReasoningStats extends BaseMetrics {
  // Additional ReasoningStats properties can be added here
}

export { Config, DEFAULT_CONFIG as CONFIG };
