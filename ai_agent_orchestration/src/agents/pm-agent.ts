import Anthropic from '@anthropic-ai/sdk';
import { AgentConfig } from '../types';
import { BaseAgent } from './base-agent';

// PM 에이전트: Claude (Anthropic)로 PRD.md 생성
export class PMAgent extends BaseAgent {
  private client: Anthropic;

  constructor(config: AgentConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  protected async callModel(prompt: string, systemPrompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // 텍스트 블록만 추출
    const textContent = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n');

    return textContent;
  }
}
