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

  public async getR1Response(prompt: string): Promise<string> {
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
      strategyUsed: 'r1_sonnet'
    };
  }
}
