import { ThoughtNode, ReasoningRequest, ReasoningResponse } from '../../types.js';
import { StateManager } from '../../state.js';

export interface StrategyMetrics {
  name: string;
  nodesExplored: number;
  averageScore: number;
  maxDepth: number;
  active?: boolean;
  [key: string]: number | string | boolean | undefined; // Allow additional strategy-specific metrics including booleans
}

export abstract class BaseStrategy {
  protected stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  abstract processThought(request: ReasoningRequest): Promise<ReasoningResponse>;
  
  protected async getNode(id: string): Promise<ThoughtNode | undefined> {
    return this.stateManager.getNode(id);
  }

  protected async saveNode(node: ThoughtNode): Promise<void> {
    return this.stateManager.saveNode(node);
  }

  protected evaluateThought(node: ThoughtNode, parent?: ThoughtNode): number {
    // Base evaluation logic
    const logicalScore = this.calculateLogicalScore(node, parent);
    const depthPenalty = this.calculateDepthPenalty(node);
    const completionBonus = node.isComplete ? 0.2 : 0;
    
    return (logicalScore + depthPenalty + completionBonus) / 3;
  }

  private calculateLogicalScore(node: ThoughtNode, parent?: ThoughtNode): number {
    let score = 0;
    
    // Length and complexity
    score += Math.min(node.thought.length / 200, 0.3);
    
    // Logical connectors
    if (/\b(therefore|because|if|then|thus|hence|so)\b/i.test(node.thought)) {
      score += 0.2;
    }
    
    // Mathematical/logical expressions
    if (/[+\-*/=<>]/.test(node.thought)) {
      score += 0.2;
    }
    
    // Parent-child coherence
    if (parent) {
      const coherence = this.calculateCoherence(parent.thought, node.thought);
      score += coherence * 0.3;
    }
    
    return score;
  }

  private calculateDepthPenalty(node: ThoughtNode): number {
    return Math.max(0, 1 - (node.depth / 10) * 0.3);
  }

  private calculateCoherence(parentThought: string, childThought: string): number {
    // Simple coherence based on shared terms
    const parentTerms = new Set(parentThought.toLowerCase().split(/\W+/));
    const childTerms = childThought.toLowerCase().split(/\W+/);
    
    const sharedTerms = childTerms.filter(term => parentTerms.has(term)).length;
    return Math.min(sharedTerms / childTerms.length, 1);
  }

  // Required methods for all strategies
  public async getBestPath(): Promise<ThoughtNode[]> {
    const nodes = await this.stateManager.getAllNodes();
    if (nodes.length === 0) return [];

    // Default implementation - find highest scoring complete path
    const completedNodes = nodes.filter(n => n.isComplete)
      .sort((a, b) => b.score - a.score);

    if (completedNodes.length === 0) return [];

    return this.stateManager.getPath(completedNodes[0].id);
  }

  public async getMetrics(): Promise<StrategyMetrics> {
    const nodes = await this.stateManager.getAllNodes();
    
    return {
      name: this.constructor.name,
      nodesExplored: nodes.length,
      averageScore: nodes.length > 0 
        ? nodes.reduce((sum, n) => sum + n.score, 0) / nodes.length 
        : 0,
      maxDepth: nodes.length > 0
        ? Math.max(...nodes.map(n => n.depth))
        : 0
    };
  }

  public async clear(): Promise<void> {
    // Optional cleanup method for strategies
    // Default implementation does nothing
  }
}
