# MCP Reasoner

A systematic reasoning MCP server implementation for Claude Desktop with beam search and thought evaluation capabilities.

<a href="https://glama.ai/mcp/servers/g71nwrrr8e"><img width="380" height="200" src="https://glama.ai/mcp/servers/g71nwrrr8e/badge" alt="mcp-reasoner MCP server" /></a>

## Features

- Beam search with configurable width
- Thought scoring and evaluation
- Tree-based reasoning paths
- Statistical analysis of reasoning process
- MCP protocol compliance

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Jacck/mcp-reasoner.git
cd mcp-reasoner
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

Add to Claude Desktop config:
```json
{
  "mcpServers": {
    "mcp-reasoner": {
      "command": "node",
      "args": [
        "path/to/mcp-reasoner/dist/index.js"
      ]
    }
  }
}
```

## Usage

The reasoner can be used with Claude Desktop for solving various problems requiring systematic thinking:

- Mathematical problems
- Logical puzzles
- Step-by-step analysis
- Complex problem decomposition

## Algorithm

The reasoner uses:
1. Beam search to explore multiple solution paths
2. Thought scoring based on:
   - Detail level
   - Mathematical expressions
   - Logical connectors
3. Tree-based state management
4. Statistical analysis of reasoning process

## License

MIT
