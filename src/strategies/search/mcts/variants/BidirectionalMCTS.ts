import { v4 as uuidv4 } from 'uuid';
import { ThoughtNode, ReasoningRequest, ReasoningResponse, CONFIG } from '../../types.js';
import { MCTS002AlphaStrategy } from './mcts-002-alpha.js';

// Queue implementation for bidirectional search
class Queue<T> {
  private items: T[];

  constructor() {
    this.items = [];
  }

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }
}

// Extend PolicyGuidedNode to include both A* and bidirectional properties
interface BidirectionalPolicyNode extends ThoughtNode {
  visits: number;
  totalReward: number;
  untriedActions?: string[];
  g: number;  // A* cost from start
  h: number;  // A* heuristic to goal
  f: number;  // A* f = g + h
  policyScore: number;
  valueEstimate: number;
  priorActionProbs: Map<string, number>;
  puct?: number;
  actionHistory?: string[];
  noveltyScore?: number;
  parent?: string;  // For path reconstruction
  direction?: 'forward' | 'backward';
  searchDepth?: number;
  meetingPoint?: boolean;
}

export class MCTS002AltAlphaStrategy extends MCTS002AlphaStrategy {
  private startNode: BidirectionalPolicyNode | null = null;
  private goalNode: BidirectionalPolicyNode | null = null;
  private bidirectionalStats: {
    forwardExplorationRate: number;
    backwardExplorationRate: number;
    meetingPoints: number;
    pathQuality: number;
  };

  constructor(stateManager: any, numSimulations: number = CONFIG.numSimulations) {
    super(stateManager, numSimulations);
    this.bidirectionalStats = {
      forwardExplorationRate: Math.sqrt(2),
      backwardExplorationRate: Math.sqrt(2),
      meetingPoints: 0,
      pathQuality: 0
    };
  }

  public async processThought(request: ReasoningRequest): Promise<ReasoningResponse> {
    // Get base response first to ensure proper MCTS initialization
    const baseResponse = await super.processThought(request);

    const nodeId = uuidv4();
    const parentNode = request.parentId ? 
      await this.getNode(request.parentId) as BidirectionalPolicyNode : undefined;

    const node: BidirectionalPolicyNode = {
      id: nodeId,
      thought: request.thought,
      depth: request.thoughtNumber - 1,
      score: 0,
      children: [],
      parentId: request.parentId,
      isComplete: !request.nextThoughtNeeded,
      visits: 0,
      totalReward: 0,
      untriedActions: [],
      g: parentNode ? parentNode.g + 1 : 0,
      h: 0,
      f: 0,
      policyScore: 0,
      valueEstimate: 0,
      priorActionProbs: new Map(),
      actionHistory: parentNode ? 
        [...(parentNode.actionHistory || []), this.getActionKey(request.thought)] :
        [this.getActionKey(request.thought)],
      searchDepth: 0,
      direction: parentNode ? parentNode.direction : 'forward'
    };

    // Track start and goal nodes for bidirectional search
    if (!parentNode) {
      this.startNode = node;
      node.direction = 'forward';
    }
    if (node.isComplete) {
      this.goalNode = node;
      node.direction = 'backward';
    }

    // Run bidirectional search if we have both endpoints
    if (this.startNode && this.goalNode) {
      const path = await this.bidirectionalSearch(this.startNode, this.goalNode);
      if (path.length > 0) {
        await this.updatePathWithPolicyGuidance(path);
      }
    }

    // Calculate enhanced path statistics
    const currentPath = await this.stateManager.getPath(nodeId);
    const enhancedScore = this.calculateBidirectionalPolicyScore(currentPath);

    return {
      ...baseResponse,
      score: enhancedScore,
      bestScore: Math.max(baseResponse.bestScore || 0, enhancedScore)
    };
  }

  protected getActionKey(thought: string): string {
    // Simple action extraction based on first few words
    return thought.split(/\s+/).slice(0, 3).join('_').toLowerCase();
  }

  private async searchLevel(
    queue: Queue<BidirectionalPolicyNode>,
    visited: Map<string, BidirectionalPolicyNode>,
    otherVisited: Map<string, BidirectionalPolicyNode>,
    direction: 'forward' | 'backward'
  ): Promise<BidirectionalPolicyNode | null> {
    const levelSize = queue.size();
    
    for (let i = 0; i < levelSize; i++) {
      const current = queue.dequeue();
      if (!current) continue;

      // Check if we've found a meeting point
      if (otherVisited.has(current.id)) {
        current.meetingPoint = true;
        this.bidirectionalStats.meetingPoints++;
        await this.saveNode(current);
        return current;
      }

      // Get neighbors based on direction and policy scores
      const neighbors = direction === 'forward' ?
        await Promise.all(current.children.map(id => this.getNode(id))) :
        await Promise.all([current.parentId].filter((id): id is string => !!id).map(id => this.getNode(id)));

      const validNeighbors = neighbors.filter((n): n is BidirectionalPolicyNode => !!n)
        .sort((a, b) => b.policyScore - a.policyScore); // Use policy scores for neighbor selection

      for (const neighbor of validNeighbors) {
        if (!visited.has(neighbor.id)) {
          visited.set(neighbor.id, neighbor);
          neighbor.parent = current.id;
          neighbor.direction = direction;
          neighbor.searchDepth = (current.searchDepth || 0) + 1;
          await this.saveNode(neighbor);
          queue.enqueue(neighbor);
        }
      }
    }

    return null;
  }

  private async bidirectionalSearch(
    start: BidirectionalPolicyNode, 
    goal: BidirectionalPolicyNode
  ): Promise<BidirectionalPolicyNode[]> {
    const forwardQueue = new Queue<BidirectionalPolicyNode>();
    const backwardQueue = new Queue<BidirectionalPolicyNode>();
    const forwardVisited = new Map<string, BidirectionalPolicyNode>();
    const backwardVisited = new Map<string, BidirectionalPolicyNode>();
    
    forwardQueue.enqueue(start);
    backwardQueue.enqueue(goal);
    forwardVisited.set(start.id, start);
    backwardVisited.set(goal.id, goal);
    
    while (!forwardQueue.isEmpty() && !backwardQueue.isEmpty()) {
      // Search from both directions with policy guidance
      const meetingPoint = await this.searchLevel(
        forwardQueue, 
        forwardVisited, 
        backwardVisited,
        'forward'
      );
      
      if (meetingPoint) {
        const path = this.reconstructPath(
          meetingPoint, 
          forwardVisited, 
          backwardVisited
        );
        this.updateBidirectionalStats(path);
        return path;
      }

      const backMeetingPoint = await this.searchLevel(
        backwardQueue,
        backwardVisited,
        forwardVisited,
        'backward'
      );

      if (backMeetingPoint) {
        const path = this.reconstructPath(
          backMeetingPoint,
          forwardVisited,
          backwardVisited
        );
        this.updateBidirectionalStats(path);
        return path;
      }

      // Adapt exploration rates based on progress
      this.adaptBidirectionalExploration(forwardVisited, backwardVisited);
    }
    
    return [];
  }

  private reconstructPath(
    meetingPoint: BidirectionalPolicyNode,
    forwardVisited: Map<string, BidirectionalPolicyNode>,
    backwardVisited: Map<string, BidirectionalPolicyNode>
  ): BidirectionalPolicyNode[] {
    const path: BidirectionalPolicyNode[] = [meetingPoint];
    
    // Reconstruct forward path
    let current = meetingPoint;
    while (current.parent && forwardVisited.has(current.parent)) {
      current = forwardVisited.get(current.parent)!;
      path.unshift(current);
    }
    
    // Reconstruct backward path
    current = meetingPoint;
    while (current.parent && backwardVisited.has(current.parent)) {
      current = backwardVisited.get(current.parent)!;
      path.push(current);
    }
    
    return path;
  }

  private async updatePathWithPolicyGuidance(path: BidirectionalPolicyNode[]): Promise<void> {
    const pathBonus = 0.2;
    
    for (const node of path) {
      // Boost both policy and value estimates for nodes along the path
      node.policyScore += pathBonus;
      node.valueEstimate = (node.valueEstimate + 1) / 2;
      
      // Update action probabilities with path information
      if (node.parentId) {
        const parentNode = await this.getNode(node.parentId) as BidirectionalPolicyNode;
        const actionKey = this.getActionKey(node.thought);
        const currentProb = parentNode.priorActionProbs.get(actionKey) || 0;
        const newProb = Math.max(currentProb, 0.8); // Strong preference for path actions
        parentNode.priorActionProbs.set(actionKey, newProb);
        await this.saveNode(parentNode);
      }

      await this.saveNode(node);
    }

    // Update path quality metric
    this.bidirectionalStats.pathQuality = path.reduce((acc, node) => 
      acc + node.policyScore + node.valueEstimate, 0) / (path.length * 2);
  }

  private adaptBidirectionalExploration(
    forwardVisited: Map<string, BidirectionalPolicyNode>,
    backwardVisited: Map<string, BidirectionalPolicyNode>
  ): void {
    // Adjust exploration rates based on search progress
    const forwardProgress = Array.from(forwardVisited.values())
      .reduce((acc, node) => acc + node.policyScore, 0) / forwardVisited.size;
    const backwardProgress = Array.from(backwardVisited.values())
      .reduce((acc, node) => acc + node.policyScore, 0) / backwardVisited.size;

    // Increase exploration in the direction making less progress
    if (forwardProgress > backwardProgress) {
      this.bidirectionalStats.backwardExplorationRate *= 1.05;
      this.bidirectionalStats.forwardExplorationRate *= 0.95;
    } else {
      this.bidirectionalStats.forwardExplorationRate *= 1.05;
      this.bidirectionalStats.backwardExplorationRate *= 0.95;
    }
  }

  private updateBidirectionalStats(path: BidirectionalPolicyNode[]): void {
    const forwardNodes = path.filter(n => n.direction === 'forward');
    const backwardNodes = path.filter(n => n.direction === 'backward');
    
    // Update exploration rates based on path composition
    const forwardQuality = forwardNodes.reduce((acc, n) => acc + n.policyScore, 0) / forwardNodes.length;
    const backwardQuality = backwardNodes.reduce((acc, n) => acc + n.policyScore, 0) / backwardNodes.length;
    
    this.bidirectionalStats.pathQuality = (forwardQuality + backwardQuality) / 2;
  }

  private calculateBidirectionalPolicyScore(path: ThoughtNode[]): number {
    if (path.length === 0) return 0;
    
    return path.reduce((acc, node) => {
      const biNode = node as BidirectionalPolicyNode;
      const baseScore = node.score;
      const policyBonus = biNode.policyScore || 0;
      const valueBonus = biNode.valueEstimate || 0;
      const meetingPointBonus = biNode.meetingPoint ? 0.2 : 0;
      const directionBonus = biNode.direction === 'forward' ? 
        this.bidirectionalStats.forwardExplorationRate * 0.1 :
        this.bidirectionalStats.backwardExplorationRate * 0.1;
      
      return acc + (
        baseScore + 
        policyBonus + 
        valueBonus + 
        meetingPointBonus +
        directionBonus
      ) / 5;
    }, 0) / path.length;
  }

  public async getMetrics(): Promise<any> {
    const baseMetrics = await super.getMetrics();
    const nodes = await this.stateManager.getAllNodes() as BidirectionalPolicyNode[];
    
    const forwardNodes = nodes.filter(n => n.direction === 'forward');
    const backwardNodes = nodes.filter(n => n.direction === 'backward');
    const meetingPoints = nodes.filter(n => n.meetingPoint);

    const bidirectionalMetrics = {
      forwardSearch: {
        nodesExplored: forwardNodes.length,
        averagePolicyScore: forwardNodes.reduce((sum, n) => sum + n.policyScore, 0) / forwardNodes.length,
        explorationRate: this.bidirectionalStats.forwardExplorationRate
      },
      backwardSearch: {
        nodesExplored: backwardNodes.length,
        averagePolicyScore: backwardNodes.reduce((sum, n) => sum + n.policyScore, 0) / backwardNodes.length,
        explorationRate: this.bidirectionalStats.backwardExplorationRate
      },
      meetingPoints: {
        count: this.bidirectionalStats.meetingPoints,
        averageDepth: meetingPoints.reduce((sum, n) => sum + n.depth, 0) / (meetingPoints.length || 1)
      },
      pathQuality: this.bidirectionalStats.pathQuality
    };

    return {
      ...baseMetrics,
      name: 'MCTS-002Alt-Alpha (Bidirectional + Policy Enhanced)',
      hasStartNode: !!this.startNode,
      hasGoalNode: !!this.goalNode,
      bidirectionalMetrics
    };
  }

  public async clear(): Promise<void> {
    await super.clear();
    this.startNode = null;
    this.goalNode = null;
    this.bidirectionalStats = {
      forwardExplorationRate: Math.sqrt(2),
      backwardExplorationRate: Math.sqrt(2),
      meetingPoints: 0,
      pathQuality: 0
    };
  }
}
