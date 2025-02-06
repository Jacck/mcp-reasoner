# MCP Reasoner
A reasoning implementation for Claude Desktop that lets you use both Beam Search and Monte Carlo Tree Search (MCTS). A sophisticated tool for enhancing Claude's problem-solving capabilities through structured reasoning strategies.

### Current Version:
**v2.3.0**

#### What's New:

> Added R1-Sonnet Integration:
>
>     - New tool schema `mcp-reasoner-r1`:
>
>         - Integration with Groq's deepseek-r1-distill-llama-70b model
>
>         - Chain-of-thought reasoning with critique cycle
>
>         - Enhanced problem-solving through iterative refinement
>
>     *NOTE* Requires Groq API key for accessing the models.
>     *NOTE* Uses both deepseek-r1-distill-llama-70b for reasoning and llama-3.3-70b-versatile for critique.

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
- Multiple sophisticated reasoning strategies:
   - Beam Search: Optimized for linear, sequential reasoning
   - MCTS: Enhanced tree search for complex problem spaces
   - Policy-Guided MCTS: Advanced policy network integration
   - Bidirectional MCTS: Efficient path exploration
   - GPRO MCTS: State-of-the-art policy optimization
   - Groq Integration: External model reasoning support
- Comprehensive reasoning analysis:
   - Path quality evaluation
   - Alternative path exploration
   - Reasoning critique and refinement
   - Detailed metrics collection
- Advanced features:
   - Dynamic strategy switching
   - Adaptive exploration rates
   - Trust region optimization
   - Streaming response support
- Full MCP protocol compliance

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
        "GROQ_API_KEY": "your-groq-api-key"
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
