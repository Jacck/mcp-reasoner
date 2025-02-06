import { StateManager } from '../state.js';
import { Config } from '../types.js';
import { BaseStrategy } from './base.js';
import { BeamSearchStrategy } from './beam-search.js';
import { MonteCarloTreeSearchStrategy } from './mcts.js';
import { MCTS002AlphaStrategy } from './experiments/mcts-002-alpha.js';
import { MCTS002AltAlphaStrategy } from './experiments/mcts-002alt-alpha.js';
import { MCTS003AlphaStrategy } from './experiments/mcts-003-alpha.js';
import { R1SonnetStrategy } from './r1-sonnet.js';

export enum ReasoningStrategy {
  BEAM_SEARCH = 'beam_search',
  MCTS = 'mcts',
  MCTS_002_ALPHA = 'mcts_002_alpha',
  MCTS_002_ALT_ALPHA = 'mcts_002_alt_alpha',
  MCTS_003_ALPHA = 'mcts_003_alpha',
  R1_SONNET = 'r1_sonnet'
}

export class StrategyFactory {
  static createStrategy(
    type: ReasoningStrategy,
    stateManager: StateManager,
    beamWidth?: number,
    numSimulations?: number,
    config?: Partial<Config>
  ): BaseStrategy {
    switch (type) {
      case ReasoningStrategy.BEAM_SEARCH:
        return new BeamSearchStrategy(stateManager, beamWidth);
      case ReasoningStrategy.MCTS:
        return new MonteCarloTreeSearchStrategy(stateManager, numSimulations);
      case ReasoningStrategy.MCTS_002_ALPHA:
        return new MCTS002AlphaStrategy(stateManager, numSimulations);
      case ReasoningStrategy.MCTS_002_ALT_ALPHA:
        return new MCTS002AltAlphaStrategy(stateManager, numSimulations);
      case ReasoningStrategy.R1_SONNET:
        return new R1SonnetStrategy(stateManager);
      case ReasoningStrategy.MCTS_003_ALPHA:
        return new MCTS003AlphaStrategy(stateManager, numSimulations);
      default:
        throw new Error(`Unknown strategy type: ${type}`);
    }
  }
}
