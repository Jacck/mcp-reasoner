import { StateManager } from "../state.js";
import { Config } from "../core/types.js";
import { BaseStrategy } from "./base/BaseStrategy.js";
import { BeamSearchStrategy } from "./search/beam/BeamStrategy.js";
import { MonteCarloTreeSearchStrategy } from "./search/mcts/MCTSStrategy.js";
import { PolicyGuidedMCTS } from "./search/mcts/variants/PolicyGuidedMCTS.js";
import { BidirectionalMCTS } from "./search/mcts/variants/BidirectionalMCTS.js";
import { GPROMCTS } from "./search/mcts/variants/GPROMCTS.js";
import { GroqStrategy } from "./external/GroqStrategy.js";

export enum ReasoningStrategy {
  BEAM_SEARCH = "beam_search",
  MCTS = "mcts",
  MCTS_002_ALPHA = "mcts_002_alpha",
  MCTS_002_ALT_ALPHA = "mcts_002_alt_alpha",
  MCTS_003_ALPHA = "mcts_003_alpha",
  R1_SONNET = "r1_sonnet",
}

export class StrategyFactory {
  static createStrategy(
    type: ReasoningStrategy,
    stateManager: StateManager,
    beamWidth?: number,
    numSimulations?: number,
    config?: Partial<Config>,
  ): BaseStrategy {
    switch (type) {
      case ReasoningStrategy.BEAM_SEARCH:
        return new BeamSearchStrategy(stateManager, beamWidth);
      case ReasoningStrategy.MCTS:
        return new MonteCarloTreeSearchStrategy(stateManager, numSimulations);
      case ReasoningStrategy.MCTS_002_ALPHA:
        return new PolicyGuidedMCTS(stateManager, numSimulations);
      case ReasoningStrategy.MCTS_002_ALT_ALPHA:
        return new BidirectionalMCTS(stateManager, numSimulations);
      case ReasoningStrategy.R1_SONNET:
        return new GroqStrategy(stateManager);
      case ReasoningStrategy.MCTS_003_ALPHA:
        return new GPROMCTS(stateManager, numSimulations);
      default:
        throw new Error(`Unknown strategy type: ${type}`);
    }
  }
}
