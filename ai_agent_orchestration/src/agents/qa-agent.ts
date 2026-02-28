import OpenAI from 'openai';
import { AgentConfig } from '../types';
import { BaseAgent } from './base-agent';

// QA 에이전트: GPT-4o로 TEST_PLAN.md 생성
export class QAAgent extends BaseAgent {
  private client: OpenAI;

  constructor(config: AgentConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  protected async callModel(prompt: string, systemPrompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return response.choices[0]?.message?.content ?? '';
  }
}
