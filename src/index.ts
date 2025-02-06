#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Reasoner } from "./reasoner.js";
import { ReasoningStrategy } from "./strategies/factory.js";
import { R1SonnetStrategy } from "./strategies/r1-sonnet.js";

// Initialize server
const server = new Server(
  {
    name: "mcp-reasoner",
    version: "2.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Initialize reasoner
const reasoner = new Reasoner();

// Process input and ensure correct types
function processInput(input: any) {
  const result = {
    thought: String(input.thought || ""),
    thoughtNumber: Number(input.thoughtNumber || 0),
    totalThoughts: Number(input.totalThoughts || 0),
    nextThoughtNeeded: Boolean(input.nextThoughtNeeded),
    strategyType: input.strategyType as ReasoningStrategy | undefined,
    beamWidth: Number(input.beamWidth || 3),
    numSimulations: Number(input.numSimulations || 50),
  };

  // Validate
  if (!result.thought) {
    throw new Error("thought must be provided");
  }
  if (result.thoughtNumber < 1) {
    throw new Error("thoughtNumber must be >= 1");
  }
  if (result.totalThoughts < 1) {
    throw new Error("totalThoughts must be >= 1");
  }
  if (result.beamWidth < 1 || result.beamWidth > 10) {
    throw new Error("beamWidth must be between 1 and 10");
  }
  if (result.numSimulations < 1 || result.numSimulations > 150) {
    throw new Error("numSimulations must be between 1 and 150");
  }

  return result;
}

// Register the tool
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "mcp-reasoner",
      description:
        "Advanced reasoning tool with multiple strategies including Beam Search and Monte Carlo Tree Search",
      inputSchema: {
        type: "object",
        properties: {
          thought: {
            type: "string",
            description: "Current reasoning step",
          },
          thoughtNumber: {
            type: "integer",
            description: "Current step number",
            minimum: 1,
          },
          totalThoughts: {
            type: "integer",
            description: "Total expected steps",
            minimum: 1,
          },
          nextThoughtNeeded: {
            type: "boolean",
            description: "Whether another step is needed",
          },
          strategyType: {
            type: "string",
            enum: Object.values(ReasoningStrategy),
            description: "Reasoning strategy to use (beam_search or mcts)",
          },
          beamWidth: {
            type: "integer",
            description:
              "Number of top paths to maintain (n-sampling). Defaults to 3 if not specified",
            minimum: 1,
            maximum: 10,
          },
          numSimulations: {
            type: "integer",
            description:
              "Number of MCTS simulations to run. Defaults to 50 if not specified",
            minimum: 1,
            maximum: 150,
          },
        },
        required: [
          "thought",
          "thoughtNumber",
          "totalThoughts",
          "nextThoughtNeeded",
        ],
      },
    },
    {
      name: "mcp-reasoner-r1",
      description: "Use deepseek/deepseek-r1 to think about the given topic.",
      inputSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "what the user's prompt was/is",
          },
        },
        required: ["prompt"],
      },
    },
  ],
}));

// Handle requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "mcp-reasoner") {
      // Process and validate input
      const step = processInput(request.params.arguments);

      // Process thought with selected strategy
      const response = await reasoner.processThought({
        thought: step.thought,
        thoughtNumber: step.thoughtNumber,
        totalThoughts: step.totalThoughts,
        nextThoughtNeeded: step.nextThoughtNeeded,
        strategyType: step.strategyType,
        beamWidth: step.beamWidth,
        numSimulations: step.numSimulations,
      });

      // Get reasoning stats
      const stats = await reasoner.getStats();

      // Return enhanced response
      // Format the reasoning context as a prefill for Claude
      const reasoningPrefill = response.reasoningContext
        ? `${response.currentPrompt}\n\n` +
          `Previous reasoning steps:\n${response.reasoningContext.currentPath.join("\n")}\n\n` +
          `Alternative approaches considered:\n${response.reasoningContext.alternativePaths.join("\n")}\n\n` +
          `Mistakes to avoid:\n${response.reasoningContext.mistakes.join("\n")}\n\n` +
          `Suggested improvements:\n${response.reasoningContext.improvements.join("\n")}\n\n` +
          `Confidence: ${response.reasoningContext.confidence}\n\n` +
          `Based on this context, please continue with the next reasoning step.`
        : "";

      try {
        // Sanitize values to ensure they're JSON-safe
        const sanitizedStats = {
          totalNodes: Number(stats.totalNodes) || 0,
          averageScore: Number(stats.averageScore) || 0,
          maxDepth: Number(stats.maxDepth) || 0,
          branchingFactor: Number(stats.branchingFactor) || 0,
          strategyMetrics: stats.strategyMetrics || {}
        };

        const result = {
          thoughtNumber: Number(step.thoughtNumber),
          totalThoughts: Number(step.totalThoughts),
          nextThoughtNeeded: Boolean(step.nextThoughtNeeded),
          thought: String(reasoningPrefill + "\n\n" + step.thought),
          nodeId: String(response.nodeId),
          score: Number(response.score) || 0,
          strategyUsed: String(response.strategyUsed || ''),
          stats: sanitizedStats
        };

        // Validate the result can be properly stringified
        const jsonString = JSON.stringify(result, (key, value) => {
          if (value === undefined) return null;
          if (typeof value === 'number' && !isFinite(value)) return 0;
          return value;
        });

        return {
          content: [
            {
              type: "text",
              text: jsonString
            }
          ]
        };
      } catch (error) {
        console.error('Error formatting response:', error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to format response",
                thought: step.thought,
                success: false
              })
            }
          ]
        };
      }
    } else if (request.params.name === "mcp-reasoner-r1") {
      try {
        console.log("R1 request received:", request.params.arguments);
        const r1Strategy = new R1SonnetStrategy(null);
        const response = await r1Strategy.getR1Response(
          request.params.arguments.prompt,
        );
        console.log("R1 response received:", response);

        const result = {
          success: true,
          response,
          metadata: {
            model: "deepseek-r1-distill-llama-70b",
            timestamp: new Date().toISOString(),
          },
        };
        console.log("Sending result:", result);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
                metadata: {
                  model: "deepseek-r1-distill-llama-70b",
                  timestamp: new Date().toISOString(),
                },
              }),
            },
          ],
          isError: true,
        };
      }
    } else {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: "Unknown tool", success: false }),
          },
        ],
        isError: true,
      };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            success: false,
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
  process.stderr.write(`Error starting server: ${error}\n`);
  process.exit(1);
});
