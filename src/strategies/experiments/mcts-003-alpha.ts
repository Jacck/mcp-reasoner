import { v4 as uuidv4 } from 'uuid';
import { ThoughtNode, ReasoningRequest, ReasoningResponse, CONFIG } from '../../types.js';
import { MCTS002AlphaStrategy } from './mcts-002-alpha.js';

interface ReasoningPrompt {
  instruction: string;
  context: {
    currentPath: string[];
    alternativePaths: string[];
    bestOutcomes: string[];
    failedAttempts: string[];
    reasoning: string[];
  };
  reflection: {
    mistakes: string[];
    improvements: string[];
    confidence: number;
  };
}

interface GPROPolicyNode extends ThoughtNode {
  visits: number;
  totalReward: number;
  untriedActions?: string[];
  policyScore: number;
  valueEstimate: number;
  priorActionProbs: Map<string, number>;
  puct?: number;
  actionHistory?: string[];
  noveltyScore?: number;
  // GPRO specific additions
  advantageEstimate: number;
  entropyBonus: number;
  proximityScore: number;
  clipRange: number;
  kl_div: number;
  trustRegionViolation?: boolean;
  importanceSamplingRatio?: number;
  // Prompting additions
  prompts?: ReasoningPrompt[];
  reflections?: string[];
  confidence: number;
  mistakeHistory?: string[];
  improvements?: string[];
}

interface GPROMetrics {
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
}

export class MCTS003AlphaStrategy extends MCTS002AlphaStrategy {
  private readonly epsilon: number = 0.2; // PPO clip range
  private readonly entropyCoef: number = 0.01;
  private readonly valueCoef: number = 0.5;
  private readonly maxKLDiv: number = 0.01;
  private readonly trustRegionDelta: number = 0.01;
  private gproMetrics: GPROMetrics;

  constructor(stateManager: any, numSimulations: number = CONFIG.numSimulations) {
    super(stateManager, numSimulations);
    this.gproMetrics = this.initializeGPROMetrics();
  }

  private async generateReasoningPrompt(node: GPROPolicyNode): Promise<ReasoningPrompt> {
    const path = await this.stateManager.getPath(node.id);
    const alternatives = await this.getAlternativePaths(node);
    const mistakes = await this.analyzeMistakes(path);
    
    return {
      instruction: this.constructPromptInstruction(node, mistakes),
      context: {
        currentPath: path.map(n => n.thought),
        alternativePaths: alternatives.map(p => p.map(n => n.thought)),
        bestOutcomes: await this.getBestOutcomes(node),
        failedAttempts: mistakes,
        reasoning: path.map(n => (n as GPROPolicyNode).reflections || []).flat()
      },
      reflection: {
        mistakes: mistakes,
        improvements: await this.suggestImprovements(node),
        confidence: node.confidence
      }
    };
  }

  private constructPromptInstruction(node: GPROPolicyNode, mistakes: string[]): string {
    let prompt = `Let's carefully analyze the current reasoning path:\n\n`;
    
    if (mistakes.length > 0) {
      prompt += `Previous mistakes to avoid:\n${mistakes.join('\n')}\n\n`;
    }

    prompt += `Current thought: "${node.thought}"\n\n`;
    prompt += `Consider these aspects:\n`;
    prompt += `1. Is this reasoning step logically sound?\n`;
    prompt += `2. What alternative approaches might be better?\n`;
    prompt += `3. How does this connect to the overall goal?\n\n`;
    
    if (node.valueEstimate < 0.5) {
      prompt += `The current path seems suboptimal. Consider backtracking or exploring alternatives.\n`;
    }

    return prompt;
  }

  private initializeGPROMetrics(): GPROMetrics {
    return {
      policyLoss: 0,
      valueLoss: 0,
      entropyLoss: 0,
      totalLoss: 0,
      advantageStats: {
        mean: 0,
        std: 0,
        min: 0,
        max: 0
      },
      proximityStats: {
        meanDivergence: 0,
        clipFraction: 0,
        trustRegionViolations: 0
      },
      samplingStats: {
        meanRatio: 1.0,
        minRatio: 1.0,
        maxRatio: 1.0
      }
    };
  }

  public async processThought(request: ReasoningRequest): Promise<ReasoningResponse> {
    const baseResponse = await super.processThought(request);

    const nodeId = uuidv4();
    const parentNode = request.parentId ? 
      await this.getNode(request.parentId) as GPROPolicyNode : undefined;

    // Generate initial node
    const node: GPROPolicyNode = {
      id: nodeId,
      thought: request.thought,
      depth: request.thoughtNumber - 1,
      score: 0,
      children: [],
      parentId: request.parentId,
      isComplete: !request.nextThoughtNeeded,
      visits: 0,
      totalReward: 0,
      policyScore: 0,
      valueEstimate: 0,
      priorActionProbs: new Map(),
      advantageEstimate: 0,
      entropyBonus: 0,
      proximityScore: 0,
      clipRange: this.epsilon,
      kl_div: 0,
      importanceSamplingRatio: 1.0
    };

    // Initialize GPRO components
    await this.initializeGPRONode(node, parentNode);
    
    // Run GPRO optimization
    if (!node.isComplete) {
      await this.runGPROOptimization(node);
    }

    return {
      ...baseResponse,
      score: this.calculateGPROEnhancedScore(node)
    };
  }

  private async initializeGPRONode(node: GPROPolicyNode, parent?: GPROPolicyNode): Promise<void> {
    // Calculate advantage estimate
    node.advantageEstimate = this.estimateAdvantage(node, parent);
    
    // Calculate entropy bonus with improved exploration
    node.entropyBonus = this.calculateEntropyBonus(node);
    
    // Calculate proximity score with trust region
    node.proximityScore = parent ? 
      this.calculateProximityScore(node, parent) : 1.0;
    
    // Calculate KL divergence for trust region
    node.kl_div = parent ?
      this.calculateKLDivergence(node, parent) : 0;

    // Check trust region violation
    node.trustRegionViolation = node.kl_div > this.trustRegionDelta;

    // Calculate importance sampling ratio
    node.importanceSamplingRatio = parent ?
      this.calculateImportanceSamplingRatio(node, parent) : 1.0;
  }

  private estimateAdvantage(node: GPROPolicyNode, parent?: GPROPolicyNode): number {
    const baseline = parent ? parent.valueEstimate : 0;
    const advantage = node.valueEstimate - baseline;
    return this.normalizeAdvantage(advantage);
  }

  private normalizeAdvantage(advantage: number): number {
    return advantage / (Math.abs(advantage) + 1);
  }

  private calculateEntropyBonus(node: GPROPolicyNode): number {
    const probs = Array.from(node.priorActionProbs.values());
    const entropy = -probs.reduce((sum, p) => sum + p * Math.log(p + 1e-10), 0);
    return this.entropyCoef * entropy;
  }

  private calculateProximityScore(current: GPROPolicyNode, old: GPROPolicyNode): number {
    const ratio = current.valueEstimate / (old.valueEstimate + 1e-10);
    const clipped = Math.max(
      Math.min(ratio, 1 + this.epsilon),
      1 - this.epsilon
    );
    return Math.min(ratio * current.advantageEstimate, clipped * current.advantageEstimate);
  }

  private calculateKLDivergence(current: GPROPolicyNode, old: GPROPolicyNode): number {
    let kl = 0;
    for (const [action, newProb] of current.priorActionProbs) {
      const oldProb = old.priorActionProbs.get(action) || 1e-10;
      kl += oldProb * Math.log(oldProb / (newProb + 1e-10));
    }
    return kl;
  }

  private calculateImportanceSamplingRatio(current: GPROPolicyNode, old: GPROPolicyNode): number {
    let totalRatio = 0;
    let count = 0;
    
    for (const [action, newProb] of current.priorActionProbs) {
      const oldProb = old.priorActionProbs.get(action) || 1e-10;
      totalRatio += newProb / (oldProb + 1e-10);
      count++;
    }
    
    return count > 0 ? totalRatio / count : 1.0;
  }

  private async runGPROOptimization(node: GPROPolicyNode): Promise<void> {
    const iterations = 3;
    let violationCount = 0;
    
    for (let i = 0; i < iterations; i++) {
      // Sample trajectories using current policy
      const trajectories = await this.sampleTrajectories(node);
      
      // Update policy and value functions with trust region
      const updated = await this.updateGPROPolicy(trajectories);
      
      // Track trust region violations
      if (updated.trustRegionViolated) {
        violationCount++;
        this.gproMetrics.proximityStats.trustRegionViolations++;
      }
      
      // Early stopping if too many violations
      if (violationCount >= 2) {
        break;
      }
    }
  }

  private async sampleTrajectories(node: GPROPolicyNode): Promise<GPROPolicyNode[]> {
    const trajectories: GPROPolicyNode[] = [];
    const numSamples = Math.min(10, this.simulationCount);
    
    for (let i = 0; i < numSamples; i++) {
      const trajectory = await this.simulateTrajectory(node);
      trajectories.push(...trajectory);
    }
    
    return trajectories;
  }

  private async simulateTrajectory(startNode: GPROPolicyNode): Promise<GPROPolicyNode[]> {
    const trajectory: GPROPolicyNode[] = [startNode];
    let current = startNode;
    
    while (!current.isComplete && trajectory.length < CONFIG.maxDepth) {
      const nextNode = await this.selectNextNode(current);
      if (!nextNode) break;
      
      trajectory.push(nextNode);
      current = nextNode;
    }
    
    return trajectory;
  }

  private async selectNextNode(node: GPROPolicyNode): Promise<GPROPolicyNode | null> {
    const children = await Promise.all(
      node.children.map(id => this.getNode(id))
    ) as GPROPolicyNode[];
    
    if (children.length === 0) return null;
    
    return children.reduce((best, current) => {
      const score = this.calculateNodeScore(current, node);
      return score > this.calculateNodeScore(best, node) ? current : best;
    });
  }

  private calculateNodeScore(node: GPROPolicyNode, parent: GPROPolicyNode): number {
    return (
      node.policyScore +
      node.advantageEstimate +
      node.entropyBonus -
      (node.trustRegionViolation ? 0.5 : 0)
    );
  }

  private async updateGPROPolicy(trajectories: GPROPolicyNode[]): Promise<{
    trustRegionViolated: boolean;
  }> {
    let trustRegionViolated = false;
    
    for (const node of trajectories) {
      // Update value estimate
      const newValue = node.valueEstimate + 
        this.learningRate * node.advantageEstimate;
      node.valueEstimate = newValue;
      
      // Update policy with trust region constraint
      if (node.kl_div > this.trustRegionDelta) {
        trustRegionViolated = true;
        continue;
      }
      
      // Update action probabilities
      for (const [action, prob] of node.priorActionProbs) {
        const newProb = prob * (1 + this.learningRate * node.advantageEstimate);
        node.priorActionProbs.set(action, newProb);
      }
      
      await this.saveNode(node);
    }
    
    // Update metrics
    this.updateGPROMetrics(trajectories);
    
    return { trustRegionViolated };
  }

  private updateGPROMetrics(trajectories: GPROPolicyNode[]): void {
    const advantages = trajectories.map(n => n.advantageEstimate);
    const ratios = trajectories.map(n => n.importanceSamplingRatio || 1);
    
    this.gproMetrics.advantageStats = {
      mean: advantages.reduce((a, b) => a + b, 0) / advantages.length,
      std: Math.sqrt(advantages.reduce((a, b) => a + b * b, 0) / advantages.length),
      min: Math.min(...advantages),
      max: Math.max(...advantages)
    };
    
    this.gproMetrics.samplingStats = {
      meanRatio: ratios.reduce((a, b) => a + b, 0) / ratios.length,
      minRatio: Math.min(...ratios),
      maxRatio: Math.max(...ratios)
    };
  }

  private calculateGPROEnhancedScore(node: GPROPolicyNode): number {
    const baseScore = node.score;
    const policyBonus = node.policyScore * 0.3;
    const advantageBonus = node.advantageEstimate * 0.2;
    const entropyBonus = node.entropyBonus * 0.1;
    const proximityBonus = node.proximityScore * 0.2;
    const trustPenalty = node.trustRegionViolation ? -0.2 : 0;
    
    return (
      baseScore +
      policyBonus +
      advantageBonus +
      entropyBonus +
      proximityBonus +
      trustPenalty
    );
  }

  public async getMetrics(): Promise<any> {
    const baseMetrics = await super.getMetrics();
    return {
      ...baseMetrics,
      name: 'MCTS-003-Alpha (GPRO Enhanced)',
      gproMetrics: this.gproMetrics
    };
  }
}
