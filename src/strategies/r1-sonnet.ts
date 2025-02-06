import { BaseStrategy } from './base.js';
import { ReasoningRequest, ReasoningResponse } from '../types.js';
import Groq from 'groq-sdk';

export class R1SonnetStrategy extends BaseStrategy {
  private client: Groq;
  private maxCycles: number;
  private reasoningModel: string;
  private critiqueModel: string;

  constructor(stateManager: any, config?: { 
    apiKey?: string;
    maxCycles?: number;
  }) {
    super(stateManager);
    this.client = new Groq({
      apiKey: config?.apiKey || process.env.GROQ_API_KEY
    });
    this.maxCycles = config?.maxCycles || 3;
    this.reasoningModel = "deepseek-r1-distill-llama-70b";
    this.critiqueModel = "llama-3.3-70b-versatile";
  }

  private async generateReasoning(prompt: string): Promise<string> {
    let fullResponse = '';
    const completion = await this.client.chat.completions.create({
      model: this.reasoningModel,
      messages: [
        {
          role: "system",
          content: "You are an expert reasoning engine. Analyze problems step by step, considering multiple angles and implications."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.6,
      max_completion_tokens: 1024,
      top_p: 0.95,
      stream: true,
      reasoning_format: "raw"
    });

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullResponse += content;
    }
    
    return fullResponse;
  }

  private async generateCritique(reasoning: string): Promise<string> {
    let fullResponse = '';
    const completion = await this.client.chat.completions.create({
      model: this.critiqueModel,
      messages: [
        {
          role: "system",
          content: "You are a critical analyzer. Examine reasoning for logical flaws, gaps, and potential improvements. Be constructive but thorough."
        },
        {
          role: "user",
          content: `Analyze this reasoning:\n\n${reasoning}\n\nWhat are the potential flaws or areas for improvement?`
        }
      ],
      temperature: 0.5,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: true
    });

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullResponse += content;
    }
    
    return fullResponse;
  }

  private async refineReasoning(original: string, critique: string): Promise<string> {
    let fullResponse = '';
    const completion = await this.client.chat.completions.create({
      model: this.reasoningModel,
      messages: [
        {
          role: "system",
          content: "You are an expert at refining and improving reasoning. Address critiques while maintaining logical coherence."
        },
        {
          role: "user",
          content: `Original reasoning:\n${original}\n\nCritique:\n${critique}\n\nProvide improved reasoning that addresses these points:`
        }
      ],
      temperature: 0.6,
      max_completion_tokens: 1024,
      top_p: 0.95,
      stream: true,
      reasoning_format: "raw"
    });

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullResponse += content;
    }
    
    return fullResponse;
  }

  private formatErrorMessage(error: any): string {
    if (error.name === 'AbortError') {
      return 'The request timed out. The model is taking too long to respond.';
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'Network error. Please check your internet connection.';
    }
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return 'Invalid or missing API key. Please check your OPENROUTER_API_KEY environment variable.';
      }
      return error.message;
    }
    return 'An unexpected error occurred while calling the R1 API.';
  }

  public async getR1Response(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout

      console.log('Sending request to OpenRouter API...');
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
          ],
          "stream": false,
          "max_tokens": 4096
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Received response from OpenRouter API');

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error?.message || `API returned status ${response.status}`);
        } catch (e) {
          throw new Error(`API returned status ${response.status}: ${responseText}`);
        }
      }

      let data: R1Response;
      try {
        data = JSON.parse(responseText) as R1Response;
        console.log('Parsed response data:', data);
      } catch (e) {
        console.error('Failed to parse response JSON:', e);
        throw new Error('Failed to parse API response as JSON');
      }
      
      if (!data.choices?.[0]?.message?.content) {
        console.error('Invalid response format:', data);
        throw new Error('Received invalid response format from API');
      }

      const content = data.choices[0].message.content;
      console.log('Successfully extracted content:', content);
      return content;
    } catch (error) {
      const friendlyMessage = this.formatErrorMessage(error);
      console.error('Error calling R1 API:', error);
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
      strategyUsed: 'r1_sonnet'
    };
  }
}
