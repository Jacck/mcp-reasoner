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
      const structuredPrompt = `
Please analyze the following and provide your complete thinking process in a clear, structured format:

${prompt}

Format your response as a detailed analysis with these sections:
1. Initial Understanding
2. Key Considerations
3. Analysis & Reasoning
4. Conclusions & Insights

Keep each section concise but thorough. Focus on deep analytical thinking.`;

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
              "role": "system",
              "content": "You are an advanced analytical engine focused on deep reasoning and structured thinking. Provide thorough analysis while maintaining clarity and conciseness."
            },
            {
              "role": "user",
              "content": structuredPrompt
            }
          ],
          "temperature": 0.7
        })
      });

      const data = await response.json() as R1Response;
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling R1 API:', error);
      throw new Error('Failed to get response from R1 API');
    }
  }

  private calculateScore(thinking: string): number {
    // More sophisticated scoring based on section presence and content
    const sections = [
      "Initial Understanding",
      "Key Considerations",
      "Analysis & Reasoning",
      "Conclusions & Insights"
    ];
    
    let score = 0;
    
    // Check for presence of each section
    sections.forEach(section => {
      if (thinking.includes(section)) {
        score += 0.25;
      }
    });

    // Add points for depth (measured by length of meaningful content)
    const contentLength = thinking.length;
    score += Math.min(0.5, contentLength / 1000); // Cap at 0.5 for length

    // Penalize extremely short responses
    if (contentLength < 200) {
      score *= 0.5;
    }

    return Math.min(1, score);
  }

  async processThought(request: ReasoningRequest): Promise<ReasoningResponse> {
    // Get R1's structured thinking on the current thought
    const r1Response = await this.callR1API(request.thought);

    // Create a node for this thought
    const nodeId = `r1-sonnet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate score based on response quality
    const score = this.calculateScore(r1Response);

    return {
      nodeId,
      thought: r1Response,
      score,
      depth: request.thoughtNumber,
      isComplete: !request.nextThoughtNeeded,
      nextThoughtNeeded: request.nextThoughtNeeded,
      strategyUsed: 'r1_sonnet'
    };
  }
}
