import { ThoughtNode, ReasoningRequest, ReasoningResponse, ReasoningStats, CONFIG } from './types.js';
import { StateManager } from './state.js';
import { StrategyFactory, ReasoningStrategy } from './strategies/factory.js';
import { BaseStrategy, StrategyMetrics } from './strategies/base.js';

export class Reasoner {
  private stateManager: StateManager;
  private currentStrategy: BaseStrategy;
  private strategies: Map<ReasoningStrategy, BaseStrategy>;

  constructor(config: Partial<Config> = {}) {
    const mergedConfig = { ...CONFIG, ...config };
    this.stateManager = new StateManager(mergedConfig.cacheSize);
    
    // Initialize available strategies
    this.strategies = new Map();
    
    // Initialize base strategies
    this.strategies.set(
      ReasoningStrategy.BEAM_SEARCH,
      StrategyFactory.createStrategy(ReasoningStrategy.BEAM_SEARCH, this.stateManager, mergedConfig.beamWidth, undefined, mergedConfig)
    );
    this.strategies.set(
      ReasoningStrategy.MCTS,
      StrategyFactory.createStrategy(ReasoningStrategy.MCTS, this.stateManager, undefined, mergedConfig.numSimulations, mergedConfig)
    );
    
    // Initialize experimental MCTS strategies
    this.strategies.set(
      ReasoningStrategy.MCTS_002_ALPHA,
      StrategyFactory.createStrategy(ReasoningStrategy.MCTS_002_ALPHA, this.stateManager, undefined, mergedConfig.numSimulations, mergedConfig)
    );
    this.strategies.set(
      ReasoningStrategy.MCTS_002_ALT_ALPHA,
      StrategyFactory.createStrategy(ReasoningStrategy.MCTS_002_ALT_ALPHA, this.stateManager, undefined, mergedConfig.numSimulations, mergedConfig)
    );

    // Set default strategy
    const defaultStrategy = mergedConfig.defaultStrategy as ReasoningStrategy;
    this.currentStrategy = this.strategies.get(defaultStrategy) ||
      this.strategies.get(ReasoningStrategy.BEAM_SEARCH)!;
  }

  public async processThought(request: ReasoningRequest): Promise<ReasoningResponse> {
    // Switch strategy if requested
    if (request.strategyType && this.strategies.has(request.strategyType as ReasoningStrategy)) {
      const strategyType = request.strategyType as ReasoningStrategy;
      
      // Create new strategy instance with appropriate parameters
      if (strategyType === ReasoningStrategy.BEAM_SEARCH) {
        this.currentStrategy = StrategyFactory.createStrategy(
          strategyType,
          this.stateManager,
          request.beamWidth
        );
      } else {
        // All MCTS variants (base and experimental) use numSimulations
        this.currentStrategy = StrategyFactory.createStrategy(
          strategyType,
          this.stateManager,
          undefined,
          request.numSimulations
        );
      }
      // Update strategy in map
      this.strategies.set(strategyType, this.currentStrategy);
    }

    // Process thought using current strategy
    const response = await this.currentStrategy.processThought(request);

    // Add strategy information to response
    return {
      ...response,
      strategyUsed: this.getCurrentStrategyName()
    };
  }

  public async getStats(): Promise<ReasoningStats> {
    const nodes = await this.stateManager.getAllNodes();
    
    if (nodes.length === 0) {
      return {
        totalNodes: 0,
        averageScore: 0,
        maxDepth: 0,
        branchingFactor: 0,
        strategyMetrics: {}
      };
    }

    const scores = nodes.map(n => n.score);
    const depths = nodes.map(n => n.depth);
    const branchingFactors = nodes.map(n => n.children.length);

    const metrics = await this.getStrategyMetrics();

    return {
      totalNodes: nodes.length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      maxDepth: Math.max(...depths),
      branchingFactor: branchingFactors.reduce((a, b) => a + b, 0) / nodes.length,
      strategyMetrics: metrics
    };
  }

  private async getStrategyMetrics(): Promise<Record<string, StrategyMetrics>> {
    const metrics: Record<string, StrategyMetrics> = {};
    
    for (const [name, strategy] of this.strategies.entries()) {
      metrics[name] = await strategy.getMetrics();
      if (strategy === this.currentStrategy) {
        metrics[name] = {
          ...metrics[name],
          active: true
        };
      }
    }

    return metrics;
  }

  public getCurrentStrategyName(): ReasoningStrategy {
    for (const [name, strategy] of this.strategies.entries()) {
      if (strategy === this.currentStrategy) {
        return name;
      }
    }
    return ReasoningStrategy.BEAM_SEARCH;
  }

  public async getBestPath(): Promise<ThoughtNode[]> {
    return this.currentStrategy.getBestPath();
  }

  public async clear(): Promise<void> {
    await this.stateManager.clear();
    // Clear all strategies
    for (const strategy of this.strategies.values()) {
      await strategy.clear();
    }
  }

  public setStrategy(strategyType: ReasoningStrategy, beamWidth?: number, numSimulations?: number): void {
    if (!this.strategies.has(strategyType)) {
      throw new Error(`Unknown strategy type: ${strategyType}`);
    }
    // Create new strategy instance with appropriate parameters
    if (strategyType === ReasoningStrategy.BEAM_SEARCH) {
      this.currentStrategy = StrategyFactory.createStrategy(strategyType, this.stateManager, beamWidth);
    } else {
      // All MCTS variants (base and experimental) use numSimulations
      this.currentStrategy = StrategyFactory.createStrategy(strategyType, this.stateManager, undefined, numSimulations);
    }
    // Update strategy in map
    this.strategies.set(strategyType, this.currentStrategy);
  }

  public getAvailableStrategies(): ReasoningStrategy[] {
    return Array.from(this.strategies.keys());
  }
}
