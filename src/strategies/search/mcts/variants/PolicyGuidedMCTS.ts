import { v4 as uuidv4 } from 'uuid';
import { ThoughtNode, ReasoningRequest, ReasoningResponse, DEFAULT_CONFIG } from '../../../../core/types.js';
import { MonteCarloTreeSearchStrategy } from '../MCTSStrategy.js';

interface PolicyGuidedNode extends ThoughtNode {
  visits: number;
  totalReward: number;
  untriedActions?: string[];
  policyScore: number;  // Policy network prediction
  valueEstimate: number;  // Value network estimate
  priorActionProbs: Map<string, number>;  // Action probabilities
  puct?: number;  // PUCT score for selection
  actionHistory?: string[];  // Track sequence of actions
  noveltyScore?: number;  // Measure of thought novelty
}

interface PolicyMetrics {
  averagePolicyScore: number;
  averageValueEstimate: number;
  actionDistribution: { [action: string]: number };
  explorationStats: {
    temperature: number;
    explorationRate: number;
    noveltyBonus: number;
  };
  convergenceMetrics: {
    policyEntropy: number;
    valueStability: number;
  };
}

export class PolicyGuidedMCTS extends MonteCarloTreeSearchStrategy {
  private readonly temperature: number;
  private explorationRate: number;
  protected readonly learningRate: number;
  private readonly noveltyBonus: number;
  private policyMetrics: PolicyMetrics;
  protected readonly simulationCount: number;

  constructor(stateManager: any, numSimulations: number = CONFIG.numSimulations) {
    super(stateManager, numSimulations);
    this.temperature = 1.0;
    this.explorationRate = Math.sqrt(2);
    this.learningRate = 0.1;
    this.noveltyBonus = 0.2;
    this.simulationCount = numSimulations;
    this.policyMetrics = this.initializePolicyMetrics();
  }

  private initializePolicyMetrics(): PolicyMetrics {
    return {
      averagePolicyScore: 0,
      averageValueEstimate: 0,
      actionDistribution: {},
      explorationStats: {
        temperature: this.temperature,
        explorationRate: this.explorationRate,
        noveltyBonus: this.noveltyBonus
      },
      convergenceMetrics: {
        policyEntropy: 0,
        valueStability: 0
      }
    };
  }

  public async processThought(request: ReasoningRequest): Promise<ReasoningResponse> {
    // Get base MCTS response
    const baseResponse = await super.processThought(request);

    const nodeId = uuidv4();
    const parentNode = request.parentId ? 
      await this.getNode(request.parentId) as PolicyGuidedNode : undefined;

    const node: PolicyGuidedNode = {
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
      policyScore: 0,
      valueEstimate: 0,
      priorActionProbs: new Map(),
      actionHistory: parentNode ? 
        [...(parentNode.actionHistory || []), this.extractAction(request.thought)] :
        [this.extractAction(request.thought)]
    };

    // Initialize node with policy guidance
    node.score = this.evaluateThought(node, parentNode);
    node.visits = 1;
    node.totalReward = node.score;
    node.policyScore = this.calculatePolicyScore(node, parentNode);
    node.valueEstimate = this.estimateValue(node);
    node.noveltyScore = this.calculateNovelty(node);
    
    await this.saveNode(node);

    // Update parent if exists
    if (parentNode) {
      parentNode.children.push(node.id);
      await this.saveNode(parentNode);
      await this.updatePolicyMetrics(node, parentNode);
    }

    // Run policy-guided search
    if (!node.isComplete) {
      await this.runPolicyGuidedSearch(node);
    }

    // Calculate enhanced path statistics
    const currentPath = await this.stateManager.getPath(nodeId);
    const enhancedScore = this.calculatePolicyEnhancedScore(currentPath);

    return {
      ...baseResponse,
      score: enhancedScore,
      bestScore: Math.max(baseResponse.bestScore || 0, enhancedScore)
    };
  }

  private extractAction(thought: string): string {
    // Simple action extraction based on first few words
    return thought.split(/\s+/).slice(0, 3).join('_').toLowerCase();
  }

  private calculatePolicyScore(node: PolicyGuidedNode, parent?: PolicyGuidedNode): number {
    // Combine multiple policy factors
    const depthFactor = Math.exp(-0.1 * node.depth);
    const parentAlignment = parent ? 
      this.thoughtCoherence(node.thought, parent.thought) : 1;
    const noveltyBonus = node.noveltyScore || 0;
    
    return (
      0.4 * depthFactor +
      0.4 * parentAlignment +
      0.2 * noveltyBonus
    );
  }

  private estimateValue(node: PolicyGuidedNode): number {
    // Combine immediate score with future potential
    const immediateValue = node.score;
    const depthPotential = 1 - (node.depth / CONFIG.maxDepth);
    const noveltyValue = node.noveltyScore || 0;
    
    return (
      0.5 * immediateValue +
      0.3 * depthPotential +
      0.2 * noveltyValue
    );
  }

  private calculateNovelty(node: PolicyGuidedNode): number {
    // Measure thought novelty based on action history
    const uniqueActions = new Set(node.actionHistory).size;
    const historyLength = node.actionHistory?.length || 1;
    const uniquenessRatio = uniqueActions / historyLength;

    // Combine with linguistic novelty
    const complexityScore = (node.thought.match(/[.!?;]|therefore|because|if|then/g) || []).length / 10;
    
    return (0.7 * uniquenessRatio + 0.3 * complexityScore);
  }

  private thoughtCoherence(thought1: string, thought2: string): number {
    const words1 = new Set(thought1.toLowerCase().split(/\W+/));
    const words2 = new Set(thought2.toLowerCase().split(/\W+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }

  private async runPolicyGuidedSearch(node: PolicyGuidedNode): Promise<void> {
    for (let i = 0; i < this.simulationCount; i++) {
      const selectedNode = await this.selectWithPUCT(node);
      const expandedNode = await this.expandWithPolicy(selectedNode);
      const reward = await this.simulateWithValueGuidance(expandedNode);
      await this.backpropagateWithPolicyUpdate(expandedNode, reward);
      
      // Adapt exploration rate
      this.adaptExplorationRate(expandedNode);
    }
  }

  private async selectWithPUCT(root: PolicyGuidedNode): Promise<PolicyGuidedNode> {
    let node = root;
    
    while (node.children.length > 0) {
      const children = await Promise.all(
        node.children.map(id => this.getNode(id))
      ) as PolicyGuidedNode[];
      
      node = this.selectBestPUCTChild(children);
    }
    
    return node;
  }

  private selectBestPUCTChild(nodes: PolicyGuidedNode[]): PolicyGuidedNode {
    const totalVisits = nodes.reduce((sum, node) => sum + node.visits, 0);
    
    return nodes.reduce((best, node) => {
      const exploitation = node.valueEstimate;
      const exploration = Math.sqrt(Math.log(totalVisits) / node.visits);
      const policyTerm = node.policyScore * this.explorationRate;
      const noveltyBonus = (node.noveltyScore || 0) * this.noveltyBonus;
      
      const puct = exploitation + 
                  exploration * policyTerm +
                  noveltyBonus;
      
      node.puct = puct;
      return puct > (best.puct || 0) ? node : best;
    });
  }

  private async expandWithPolicy(node: PolicyGuidedNode): Promise<PolicyGuidedNode> {
    if (node.isComplete) return node;

    const newNode: PolicyGuidedNode = {
      ...node,
      id: uuidv4(),
      depth: node.depth + 1,
      parentId: node.id,
      children: [],
      visits: 1,
      totalReward: 0,
      policyScore: 0,
      valueEstimate: 0,
      priorActionProbs: new Map(),
      actionHistory: [...(node.actionHistory || [])]
    };

    newNode.policyScore = this.calculatePolicyScore(newNode, node);
    newNode.score = this.evaluateThought(newNode, node);
    newNode.valueEstimate = this.estimateValue(newNode);
    newNode.noveltyScore = this.calculateNovelty(newNode);

    await this.saveNode(newNode);
    return newNode;
  }

  private async simulateWithValueGuidance(node: PolicyGuidedNode): Promise<number> {
    let current = node;
    let totalReward = 0;
    let depth = 0;
    
    while (!current.isComplete && depth < CONFIG.maxDepth) {
      const reward = current.valueEstimate;
      totalReward += reward;
      
      const expanded = await this.expandWithPolicy(current);
      current = expanded;
      depth++;
    }
    
    return totalReward / depth;
  }

  private async backpropagateWithPolicyUpdate(
    node: PolicyGuidedNode,
    reward: number
  ): Promise<void> {
    let current: PolicyGuidedNode | undefined = node;
    
    while (current) {
      current.visits++;
      current.totalReward += reward;
      
      // Update value estimate with temporal difference
      const newValue = (1 - this.learningRate) * current.valueEstimate +
                      this.learningRate * reward;
      current.valueEstimate = newValue;

      // Update action probabilities
      if (current.parentId) {
        const parentNode = await this.getNode(current.parentId) as PolicyGuidedNode;
        const actionKey = this.extractAction(current.thought);
        const currentProb = parentNode.priorActionProbs.get(actionKey) || 0;
        const newProb = currentProb + this.learningRate * (reward - currentProb);
        parentNode.priorActionProbs.set(actionKey, newProb);
        await this.saveNode(parentNode);
      }

      await this.saveNode(current);
      
      current = current.parentId ? 
        await this.getNode(current.parentId) as PolicyGuidedNode : 
        undefined;
    }
  }

  private adaptExplorationRate(node: PolicyGuidedNode): void {
    const successRate = node.totalReward / node.visits;
    const targetRate = 0.6;
    
    if (successRate > targetRate) {
      // Reduce exploration when doing well
      this.explorationRate = Math.max(0.5, this.explorationRate * 0.95);
    } else {
      // Increase exploration when results are poor
      this.explorationRate = Math.min(2.0, this.explorationRate / 0.95);
    }
  }

  private async updatePolicyMetrics(node: PolicyGuidedNode, parent: PolicyGuidedNode): Promise<void> {
    // Update running averages
    this.policyMetrics.averagePolicyScore = 
      (this.policyMetrics.averagePolicyScore + node.policyScore) / 2;
    this.policyMetrics.averageValueEstimate = 
      (this.policyMetrics.averageValueEstimate + node.valueEstimate) / 2;

    // Update action distribution
    const action = this.extractAction(node.thought);
    this.policyMetrics.actionDistribution[action] = 
      (this.policyMetrics.actionDistribution[action] || 0) + 1;

    // Update exploration stats
    this.policyMetrics.explorationStats = {
      temperature: this.temperature,
      explorationRate: this.explorationRate,
      noveltyBonus: this.noveltyBonus
    };

    // Calculate policy entropy and value stability
    const probs = Array.from(parent.priorActionProbs.values());
    this.policyMetrics.convergenceMetrics = {
      policyEntropy: this.calculateEntropy(probs),
      valueStability: Math.abs(node.valueEstimate - parent.valueEstimate)
    };
  }

  private calculateEntropy(probs: number[]): number {
    const sum = probs.reduce((a, b) => a + b, 0);
    return -probs.reduce((acc, p) => {
      const norm = p / sum;
      return acc + (norm * Math.log2(norm + 1e-10));
    }, 0);
  }

  private calculatePolicyEnhancedScore(path: ThoughtNode[]): number {
    if (path.length === 0) return 0;
    
    return path.reduce((acc, node) => {
      const policyNode = node as PolicyGuidedNode;
      const baseScore = node.score;
      const policyBonus = policyNode.policyScore || 0;
      const valueBonus = policyNode.valueEstimate || 0;
      const noveltyBonus = (policyNode.noveltyScore || 0) * this.noveltyBonus;
      
      return acc + (baseScore + policyBonus + valueBonus + noveltyBonus) / 4;
    }, 0) / path.length;
  }

  public async getMetrics(): Promise<any> {
    const baseMetrics = await super.getMetrics();
    const nodes = await this.stateManager.getAllNodes() as PolicyGuidedNode[];
    
    // Calculate additional policy-specific metrics
    const currentNode = nodes[nodes.length - 1];
    const policyStats = {
      currentNode: currentNode ? {
        policyScore: currentNode.policyScore,
        valueEstimate: currentNode.valueEstimate,
        noveltyScore: currentNode.noveltyScore,
        actionHistory: currentNode.actionHistory
      } : null,
      averages: {
        policyScore: nodes.reduce((sum, n) => sum + n.policyScore, 0) / nodes.length,
        valueEstimate: nodes.reduce((sum, n) => sum + n.valueEstimate, 0) / nodes.length,
        noveltyScore: nodes.reduce((sum, n) => sum + (n.noveltyScore || 0), 0) / nodes.length
      },
      policyMetrics: this.policyMetrics
    };

    return {
      ...baseMetrics,
      name: 'MCTS-002-Alpha (Policy Enhanced)',
      temperature: this.temperature,
      explorationRate: this.explorationRate,
      learningRate: this.learningRate,
      policyStats
    };
  }
}
