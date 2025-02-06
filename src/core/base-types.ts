export interface BaseNode {
  id: string;
  thought: string;
  depth: number;
  score: number;
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
}
