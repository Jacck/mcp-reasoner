import { BaseStrategy } from './base.js';
import { ReasoningRequest, ReasoningResponse } from '../types.js';

interface R1Response {
  choices: [{
    message: {
      content: string;
    }
  }];
}

export class R1SonnetStrategy extends BaseStrategy {
  private apiKey: string;
  private siteUrl: string;
  private siteName: string;

  constructor(stateManager: any, config?: { 
    apiKey?: string;
    siteUrl?: string;
    siteName?: string;
  }) {
    super(stateManager);
    this.apiKey = config?.apiKey || process.env.OPENROUTER_API_KEY || '';
    this.siteUrl = config?.siteUrl || process.env.SITE_URL || '';
    this.siteName = config?.siteName || process.env.SITE_NAME || '';
  }

  private async callR1API(prompt: string): Promise<string> {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": this.siteUrl,
          "X-Title": this.siteName,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "deepseek/deepseek-r1",
          "messages": [
            {
              "role": "user",
              "content": prompt
            }
          ]
        })
      });

      const data = await response.json() as R1Response;
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling R1 API:', error);
      throw new Error('Failed to get response from R1 API');
    }
  }

  private extractThinking(response: string): string {
    // Remove any <answer></answer> tags and clean up the response
    return response.replace(/<answer>.*?<\/answer>/gs, '').trim();
  }

  async processThought(request: ReasoningRequest): Promise<ReasoningResponse> {
    // Get R1's thinking on the current thought
    const r1Response = await this.callR1API(request.thought);
    const r1Thinking = this.extractThinking(r1Response);

    // Create a node for this thought
    const nodeId = `r1-sonnet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // For now, use a simple scoring mechanism
    const score = r1Thinking.length / 100; // Simple score based on response length

    return {
      nodeId,
      thought: r1Thinking,
      score,
      depth: request.thoughtNumber,
      isComplete: !request.nextThoughtNeeded,
      nextThoughtNeeded: request.nextThoughtNeeded,
      strategyUsed: 'r1_sonnet'
    };
  }
}
