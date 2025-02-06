import { v4 as uuidv4 } from 'uuid';
import { ThoughtNode, ReasoningRequest, ReasoningResponse, DEFAULT_CONFIG } from '../../../core/types.js';
import { BaseStrategy } from '../../base/BaseStrategy.js';

interface MCTSNode extends ThoughtNode {
  visits: number;
  totalReward: number;
  untriedActions?: string[];
}

export class MonteCarloTreeSearchStrategy extends BaseStrategy {
  private readonly explorationConstant = Math.sqrt(2);
  private readonly simulationDepth = DEFAULT_CONFIG.maxDepth;
  private numSimulations: number;
  private root: MCTSNode | null = null;

  constructor(stateManager: any, numSimulations: number = DEFAULT_CONFIG.numSimulations) {
    super(stateManager);
    // Ensure numSimulations is within reasonable bounds
    this.numSimulations = Math.max(1, Math.min(150, numSimulations));
  }

  public async processThought(request: ReasoningRequest): Promise<ReasoningResponse> {
    const nodeId = uuidv4();
    const parentNode = request.parentId ? 
      await this.getNode(request.parentId) as MCTSNode : undefined;

    const node: MCTSNode = {
      id: nodeId,
      thought: request.thought,
      depth: request.thoughtNumber - 1,
      score: 0,
      children: [],
      parentId: request.parentId,
      isComplete: !request.nextThoughtNeeded,
      visits: 0,
      totalReward: 0,
      untriedActions: []
    };

    // Initialize node
    node.score = this.evaluateThought(node, parentNode);
    node.visits = 1;
    node.totalReward = node.score;
    await this.saveNode(node);

    // Update parent if exists
    if (parentNode) {
      parentNode.children.push(node.id);
      await this.saveNode(parentNode);
    }

    // If this is a root node, store it
    if (!parentNode) {
      this.root = node;
    }

    // Run MCTS simulations
    if (!node.isComplete) {
      await this.runSimulations(node);
    }

    // Calculate path statistics
    const currentPath = await this.stateManager.getPath(nodeId);
    const pathScore = this.calculatePathScore(currentPath);

    return {
      nodeId: node.id,
      thought: node.thought,
      score: node.score,
      depth: node.depth,
      isComplete: node.isComplete,
      nextThoughtNeeded: request.nextThoughtNeeded,
      possiblePaths: this.calculatePossiblePaths(node),
      bestScore: pathScore
    };
  }

  private async runSimulations(node: MCTSNode): Promise<void> {
    for (let i = 0; i < this.numSimulations; i++) {
      const selectedNode = await this.select(node);
      const expandedNode = await this.expand(selectedNode);
      const reward = await this.simulate(expandedNode);
      await this.backpropagate(expandedNode, reward);
    }
  }

  private async select(node: MCTSNode): Promise<MCTSNode> {
    let current = node;

    while (current.children.length > 0 && !current.untriedActions?.length) {
      const children = await Promise.all(
        current.children.map(id => this.getNode(id))
      ) as MCTSNode[];

      current = this.selectBestUCT(children);
    }

    return current;
  }

  private async expand(node: MCTSNode): Promise<MCTSNode> {
    if (node.isComplete || node.depth >= this.simulationDepth) {
      return node;
    }

    // Create a new thought node as expansion
    const newNode: MCTSNode = {
      id: uuidv4(),
      thought: `Simulated thought at depth ${node.depth + 1}`,
      depth: node.depth + 1,
      score: 0,
      children: [],
      parentId: node.id,
      isComplete: false,
      visits: 1,
      totalReward: 0
    };

    newNode.score = this.evaluateThought(newNode, node);
    await this.saveNode(newNode);

    node.children.push(newNode.id);
    await this.saveNode(node);

    return newNode;
  }

  private async simulate(node: MCTSNode): Promise<number> {
    let current = node;
    let totalScore = current.score;
    let depth = current.depth;

    while (depth < this.simulationDepth && !current.isComplete) {
      const simulatedNode: MCTSNode = {
        id: uuidv4(),
        thought: `Random simulation at depth ${depth + 1}`,
        depth: depth + 1,
        score: 0,
        children: [],
        parentId: current.id,
        isComplete: depth + 1 >= this.simulationDepth,
        visits: 1,
        totalReward: 0
      };

      simulatedNode.score = this.evaluateThought(simulatedNode, current);
      totalScore += simulatedNode.score;
      current = simulatedNode;
      depth++;
    }

    return totalScore / (depth - node.depth + 1);
  }

  private async backpropagate(node: MCTSNode, reward: number): Promise<void> {
    let current: MCTSNode | undefined = node;

    while (current) {
      current.visits++;
      current.totalReward += reward;
      await this.saveNode(current);
      current = current.parentId ? 
        await this.getNode(current.parentId) as MCTSNode : 
        undefined;
    }
  }

  private selectBestUCT(nodes: MCTSNode[]): MCTSNode {
    const totalVisits = nodes.reduce((sum, node) => sum + node.visits, 0);
    
    return nodes.reduce((best, node) => {
      const exploitation = node.totalReward / node.visits;
      const exploration = Math.sqrt(Math.log(totalVisits) / node.visits);
      const uct = exploitation + this.explorationConstant * exploration;
      
      return uct > (best.totalReward / best.visits + 
        this.explorationConstant * Math.sqrt(Math.log(totalVisits) / best.visits)) 
        ? node : best;
    });
  }

  private calculatePathScore(path: ThoughtNode[]): number {
    if (path.length === 0) return 0;
    return path.reduce((acc, node) => acc + node.score, 0) / path.length;
  }

  private calculatePossiblePaths(node: MCTSNode): number {
    return Math.pow(2, this.simulationDepth - node.depth);
  }

  public async getBestPath(): Promise<ThoughtNode[]> {
    if (!this.root) return [];
    
    const bestChild = (await Promise.all(
      this.root.children.map(id => this.getNode(id))
    ) as MCTSNode[])
      .reduce((best, node) => 
        node.visits > best.visits ? node : best
      );

    return this.stateManager.getPath(bestChild.id);
  }

  public async getMetrics(): Promise<any> {
    const baseMetrics = await super.getMetrics();
    return {
      ...baseMetrics,
      simulationDepth: this.simulationDepth,
      numSimulations: this.numSimulations,
      explorationConstant: this.explorationConstant,
      totalSimulations: this.root?.visits || 0
    };
  }

  public async clear(): Promise<void> {
    await super.clear();
    this.root = null;
  }
}
