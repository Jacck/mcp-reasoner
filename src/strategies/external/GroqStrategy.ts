import { BaseStrategy } from "../base/BaseStrategy.js";
import { ReasoningRequest, ReasoningResponse } from "../../core/types.js";
import Groq from "groq-sdk";

export class R1SonnetStrategy extends BaseStrategy {
  private client: Groq;
  private maxCycles: number;
  private reasoningModel: string;
  private critiqueModel: string;

  constructor(
    stateManager: any,
    config?: {
      apiKey?: string;
      maxCycles?: number;
    },
  ) {
    super(stateManager);
    this.client = new Groq({
      apiKey: config?.apiKey || process.env.GROQ_API_KEY,
    });
    this.maxCycles = config?.maxCycles || 3;
    this.reasoningModel = "deepseek-r1-distill-llama-70b";
    this.critiqueModel = "llama-3.3-70b-versatile";
  }

  private async generateReasoning(prompt: string): Promise<string> {
    let fullResponse = "";
    const completion = await this.client.chat.completions.create({
      model: this.reasoningModel,
      messages: [
        {
          role: "system",
          content:
            "You are an expert reasoning engine. Analyze problems step by step, considering multiple angles and implications. Format your response as a clear list of points, using bullet points or numbers for each distinct thought or step.",
        },
        {
          role: "user",
          content: `Please analyze this step by step, using bullet points:\n\n${prompt}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 1024,
      top_p: 0.95,
      stream: true,
    });

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullResponse += content;
    }

    return fullResponse;
  }

  private async generateCritique(reasoning: string): Promise<string> {
    let fullResponse = "";
    const completion = await this.client.chat.completions.create({
      model: this.critiqueModel,
      messages: [
        {
          role: "system",
          content:
            "You are a critical analyzer. Examine reasoning for logical flaws, gaps, and potential improvements. Be constructive but thorough. Format your critique as a clear list using bullet points.",
        },
        {
          role: "user",
          content: `Analyze this reasoning and list your critiques using bullet points:\n\n${reasoning}\n\nWhat are the potential flaws or areas for improvement?`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1024,
      top_p: 1,
      stream: true,
    });

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullResponse += content;
    }

    return fullResponse;
  }

  private async refineReasoning(
    original: string,
    critique: string,
  ): Promise<string> {
    let fullResponse = "";
    const completion = await this.client.chat.completions.create({
      model: this.reasoningModel,
      messages: [
        {
          role: "system",
          content:
            "You are an expert at refining and improving reasoning. Address critiques while maintaining logical coherence. Format your improved reasoning as a clear list using bullet points.",
        },
        {
          role: "user",
          content: `Original reasoning:\n${original}\n\nCritique:\n${critique}\n\nProvide improved reasoning that addresses these points, using bullet points for each step or thought:`,
        },
      ],
      temperature: 0.6,
      max_tokens: 1024,
      top_p: 0.95,
      stream: true,
    });

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullResponse += content;
    }

    return fullResponse;
  }

  private formatErrorMessage(error: any): string {
    if (error.name === "AbortError") {
      return "The request timed out. The model is taking too long to respond.";
    }
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      return "Network error. Please check your internet connection.";
    }
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return "Invalid or missing API key. Please check your GROQ_API_KEY environment variable.";
      }
      return error.message;
    }
    return "An unexpected error occurred while calling the Groq API.";
  }

  private async executeReasoningCycle(initialPrompt: string): Promise<
    Array<{
      thought: string;
      critique: string;
      refinement: string;
      confidence: number;
    }>
  > {
    const cycles = [];
    let currentThought = await this.generateReasoning(initialPrompt);
    let confidence = 1.0;

    for (let i = 0; i < this.maxCycles; i++) {
      // Generate critique of current reasoning
      const critique = await this.generateCritique(currentThought);

      // Refine reasoning based on critique
      const refinement = await this.refineReasoning(currentThought, critique);

      // Calculate confidence based on changes made
      confidence *= 0.9; // Decrease confidence with each iteration

      cycles.push({
        thought: currentThought,
        critique,
        refinement,
        confidence,
      });

      // Update for next cycle
      currentThought = refinement;
    }

    return cycles;
  }

  public async getR1Response(prompt: string): Promise<string> {
    try {
      const thought = await this.generateReasoning(prompt);
      const critique = await this.generateCritique(thought);
      const refinement = await this.refineReasoning(thought, critique);
      return refinement;
    } catch (error) {
      const friendlyMessage = this.formatErrorMessage(error);
      console.error("Error in R1 reasoning cycle:", error);
      throw new Error(friendlyMessage);
    }
  }

  // Keep this method to satisfy the BaseStrategy interface
  async processThought(request: any): Promise<any> {
    const response = await this.getR1Response(request.thought);
    return {
      nodeId: `r1-${Date.now()}`,
      thought: response,
      score: 1,
      depth: 1,
      isComplete: true,
      nextThoughtNeeded: false,
      strategyUsed: "r1_sonnet",
    };
  }
}
