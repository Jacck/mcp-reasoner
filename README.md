# MCP Reasoner
A reasoning implementation for Claude Desktop that lets you use both Beam Search and Monte Carlo Tree Search (MCTS). tbh this started as a way to see if we could make Claude even better at complex problem-solving... turns out we definitely can.

### Current Version:
**v2.1.0**

#### What's New:

> Added R1-Sonnet Integration:
>
>     - New tool schema `mcp-reasoner-r1`:
>
>         - Direct integration with deepseek/deepseek-r1 model
>
>         - Allows Claude to leverage R1's reasoning capabilities
>
>         - Simplified API for direct model access
>
>     *NOTE* Requires OpenRouter API key for accessing the R1 model.
>     *NOTE* While OpenRouter selects deepseek/deepseek-r1 as the default model to lower costs, often Fireworks/TogetherAI is selected as the provider as fallback.

#### Previous Version:
**v2.0.0**

#### What's New:

> Added 3 Experimental Reasoning Algorithms:
>
>     - `mcts-002-alpha`
>
>         - Uses the A* Search Method along with an early *alpha* implementation of a Policy Simulation Layer
>
>         - Also includes an early *alpha* implementation of Adaptive Exploration Simulator & Outcome Based Reasoning Simulator
>
>     *NOTE* the implementation of these alpha simulators is not complete and is subject to change
>
>     - `mcts-002alt-alpha`
>
>         - Uses the Bidirectional Search Method along with an early *alpha* implementation of a Policy Simulation Layer
>
>         - Also includes an early *alpha* implementation of Adaptive Exploration Simulator & Outcome Based Reasoning Simulator
>
>     *NOTE* the implementation of these alpha simulators is not complete and is subject to change
>
>     - `mcts-003-alpha`
>
>         - Implements GPRO (Guided Policy with Recursive Optimization)
>
>         - Enhanced policy network with recursive optimization for improved path selection
>
>         - Dynamic adaptation of exploration/exploitation balance
>
>     *NOTE* GPRO implementation is in alpha stage and undergoing active development
>
>         - Uses the Bidirectional Search Method along with an early *alpha* implementation of a Policy Simulation Layer
>
>         - Also includes an early *alpha* implementation of Adaptive Exploration Simulator & Outcome Based Reasoning Simulator
>
>     *NOTE* the implementation of these alpha simulators is not complete and is subject to change


## Features
- Two search strategies that you can switch between:
   - Beam search (good for straightforward stuff)
   - MCTS (when stuff gets complex) with alpha variations (see above)
- Tracks how good different reasoning paths are
- Maps out all the different ways Claude thinks through problems
- Analyzes how the reasoning process went
- Follows the MCP protocol (obviously)

## Installation
```
git clone https://github.com/frgmt0/mcp-reasoner.git

OR clone the original:

git clone https://github.com/Jacck/mcp-reasoner.git

cd mcp-reasoner
npm install
npm run build
```

## Configuration
Add to Claude Desktop config:
```
{
  "mcpServers": {
    "mcp-reasoner": {
      "command": "node",
      "args": ["path/to/mcp-reasoner/dist/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "your-openrouter-api-key"
        "SITE_URL": "https://github.com/Jacck/mcp-reasoner.git", // you dont have to change this
        "SITE_NAME": "mcp-reasoner" // you dont have to change this
      }
    }
  }
}
```

## Testing

[More Testing Coming Soon]

## Benchmarks

[Benchmarking will be added soon]

Key Benchmarks to test against:

- MATH500

- GPQA-Diamond

- GMSK8

- Maybe Polyglot &/or SWE-Bench

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
