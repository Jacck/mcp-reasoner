// Core shared types for MCP Reasoner

export interface BaseNode {
  id: string;
  thought: string;
  score: number;
  depth: number;
  children: string[];
  parentId?: string;
  isComplete: boolean;
}

export interface BaseRequest {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  parentId?: string;
  strategyType?: string;
}

export interface BaseResponse {
  nodeId: string;
  thought: string;
  score: number;
  depth: number;
  isComplete: boolean;
  nextThoughtNeeded: boolean;
  possiblePaths?: number;
  bestScore?: number;
  strategyUsed?: string;
}

export interface BaseMetrics {
  totalNodes: number;
  averageScore: number;
  maxDepth: number;
  branchingFactor: number;
  strategyMetrics?: Record<string, any>;
}

export interface Config {
  beamWidth: number;
  maxDepth: number;
  minScore: number;
  temperature: number;
  cacheSize: number;
  defaultStrategy: string;
  numSimulations: number;
}

export const DEFAULT_CONFIG: Config = {
  beamWidth: 3,
  maxDepth: 5,
  minScore: 0.5,
  temperature: 0.7,
  cacheSize: 1000,
  defaultStrategy: 'beam_search',
  numSimulations: 50
};

export interface StrategyMetrics {
  name: string;
  nodesExplored: number;
  averageScore: number;
  maxDepth: number;
  active?: boolean;
  [key: string]: number | string | boolean | undefined;
}

// Strategy-specific extensions of base types
export interface ThoughtNode extends BaseNode {
  visits?: number;
  totalReward?: number;
  untriedActions?: string[];
  policyScore?: number;
  valueEstimate?: number;
  priorActionProbs?: Map<string, number>;
  puct?: number;
  actionHistory?: string[];
  noveltyScore?: number;
  confidence?: number;
}

export interface ReasoningRequest extends BaseRequest {
  beamWidth?: number;
  numSimulations?: number;
  strategyType?: string;
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
}

export interface ReasoningStats extends BaseMetrics {
  strategyMetrics: Record<string, any>;
}

export * from './config';
export * from './base-types';
