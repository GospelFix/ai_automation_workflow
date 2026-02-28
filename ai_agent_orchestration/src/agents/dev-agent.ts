import OpenAI from 'openai';
import { AgentConfig } from '../types';
import { BaseAgent } from './base-agent';

// Dev 에이전트: OpenAI Codex로 TECH_SPEC.md + 코드 생성
export class DevAgent extends BaseAgent {
  private client: OpenAI;

  constructor(config: AgentConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  protected async callModel(prompt: string, systemPrompt: string): Promise<string> {
    // codex-mini-latest는 responses API 사용
    const response = await this.client.responses.create({
      model: this.config.model,
      instructions: systemPrompt,
      input: prompt,
      max_output_tokens: this.config.maxTokens,
    });

    return response.output_text;
  }
}
