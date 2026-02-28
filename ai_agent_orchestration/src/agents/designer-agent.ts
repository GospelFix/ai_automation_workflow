import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentConfig } from '../types';
import { BaseAgent } from './base-agent';

// Designer 에이전트: Gemini (Google)로 DESIGN.md 생성
export class DesignerAgent extends BaseAgent {
  private client: GoogleGenerativeAI;

  constructor(config: AgentConfig) {
    super(config);
    this.client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  }

  protected async callModel(prompt: string, systemPrompt: string): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: this.config.model,
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: this.config.maxTokens,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  }
}
