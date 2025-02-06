export interface ThoughtNode {
  id: string;
  thought: string;
  score: number;
  depth: number;
  children: string[];  // Store child IDs
  parentId?: string;   // Store parent ID
  isComplete: boolean;
}

export interface ReasoningRequest {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  parentId?: string;   // For branching thoughts
  strategyType?: string; // Strategy to use for reasoning
  beamWidth?: number;  // Number of top paths to maintain (n-sampling)
  numSimulations?: number; // Number of MCTS simulations to run
}

export interface ReasoningResponse {
  nodeId: string;
  thought: string;
  score: number;
  depth: number;
  isComplete: boolean;
  nextThoughtNeeded: boolean;
  possiblePaths?: number;
  bestScore?: number;
  strategyUsed?: string;
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

export interface ReasoningStats {
  totalNodes: number;
  averageScore: number;
  maxDepth: number;
  branchingFactor: number;
  strategyMetrics?: Record<string, any>;
}

export interface Config {
  beamWidth: number;     // Keep top N paths
  maxDepth: number;      // Reasonable depth limit
  minScore: number;    // Threshold for path viability
  temperature: number; // For thought diversity
  cacheSize: number;  // LRU cache size
  defaultStrategy: string; // Default reasoning strategy
  numSimulations: number; // Default number of MCTS simulations
}

export const CONFIG: Config = {
  beamWidth: 3,
  maxDepth: 5,
  minScore: 0.5,
  temperature: 0.7,
  cacheSize: 1000,
  defaultStrategy: 'beam_search',
  numSimulations: 50
};
