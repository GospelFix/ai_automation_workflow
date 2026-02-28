import * as fs from 'fs';
import * as path from 'path';
import { AgentConfig, AgentResult, PipelineContext } from '../types';

// 모든 에이전트가 구현해야 하는 기본 인터페이스
export abstract class BaseAgent {
  protected config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  // 하위 클래스에서 구현: 실제 AI 모델 호출
  protected abstract callModel(prompt: string, systemPrompt: string): Promise<string>;

  // 시스템 프롬프트 파일 로드
  protected loadSystemPrompt(): string {
    if (!fs.existsSync(this.config.systemPromptFile)) {
      throw new Error(`시스템 프롬프트 파일을 찾을 수 없습니다: ${this.config.systemPromptFile}`);
    }
    return fs.readFileSync(this.config.systemPromptFile, 'utf-8');
  }

  // 이전 에이전트 산출물을 컨텍스트로 조합
  protected buildPrompt(context: PipelineContext): string {
    const parts: string[] = [];

    parts.push(`## 프로젝트 요구사항\n\n${context.projectRequirements}`);

    // 누적된 이전 산출물 추가
    const outputEntries = Object.entries(context.outputs);
    if (outputEntries.length > 0) {
      parts.push('\n## 이전 단계 산출물\n');
      for (const [file, content] of outputEntries) {
        parts.push(`### ${file}\n\n${content}`);
      }
    }

    return parts.join('\n\n---\n\n');
  }

  // 산출물 파일 저장
  protected saveOutput(content: string, outputDir: string): string {
    const filePath = path.join(outputDir, this.config.outputFile);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  // 에이전트 실행 (공통 로직)
  async run(context: PipelineContext, outputDir: string): Promise<AgentResult> {
    const startTime = Date.now();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${this.config.name}] ${this.config.role} 에이전트 시작`);
    console.log(`  모델: ${this.config.model}`);
    console.log(`  출력: ${this.config.outputFile}`);
    console.log(`${'='.repeat(60)}`);

    const systemPrompt = this.loadSystemPrompt();
    const userPrompt = this.buildPrompt(context);

    console.log(`  입력 컨텍스트: 요구사항 + ${Object.keys(context.outputs).length}개 이전 산출물`);

    const content = await this.callModel(userPrompt, systemPrompt);
    const filePath = this.saveOutput(content, outputDir);

    const duration = Date.now() - startTime;

    console.log(`  완료 (${(duration / 1000).toFixed(1)}초)`);
    console.log(`  저장: ${filePath}`);

    return {
      agentName: this.config.name,
      outputFile: this.config.outputFile,
      content,
      duration,
    };
  }
}
