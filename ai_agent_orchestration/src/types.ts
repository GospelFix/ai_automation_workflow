// 에이전트 설정 타입
export interface AgentConfig {
  name: string;
  role: string;
  provider: 'anthropic' | 'openai' | 'google';
  model: string;
  outputFile: string;
  tokenMultiplier: number; // 직급별 글 분량 조정
  maxTokens: number;
  systemPromptFile: string;
}

// 파이프라인 컨텍스트 - 이전 에이전트 산출물 누적
export interface PipelineContext {
  projectRequirements: string;
  outputs: Record<string, string>; // key: outputFile명, value: 내용
}

// 에이전트 실행 결과
export interface AgentResult {
  agentName: string;
  outputFile: string;
  content: string;
  duration: number; // 실행 시간 (ms)
}

// 파이프라인 실행 요약
export interface PipelineSummary {
  projectRequirements: string;
  outputDir: string;
  results: AgentResult[];
  totalDuration: number;
  startedAt: string;
  completedAt: string;
}
