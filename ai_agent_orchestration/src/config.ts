import * as dotenv from 'dotenv';
import * as path from 'path';
import { AgentConfig } from './types';

dotenv.config();

// 프롬프트 파일 기본 경로
const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');

// API 키 검증
export function validateEnv(): void {
  const required = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GOOGLE_API_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`누락된 환경 변수: ${missing.join(', ')}\n.env.example을 참고하여 .env 파일을 설정하세요.`);
  }
}

// 에이전트 설정 목록 (파이프라인 실행 순서)
export const AGENT_CONFIGS: AgentConfig[] = [
  {
    name: 'PM',
    role: '제품 관리자 (Product Manager)',
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    outputFile: 'PRD.md',
    tokenMultiplier: 1.25, // 단호하고 명확, 분량 25% 증가
    maxTokens: 4096,
    systemPromptFile: path.join(PROMPTS_DIR, 'pm.md'),
  },
  {
    name: 'Designer',
    role: 'UI/UX 디자이너',
    provider: 'google',
    model: 'gemini-2.0-flash',
    outputFile: 'DESIGN.md',
    tokenMultiplier: 1.0, // 실용적·균형감, 기본 분량
    maxTokens: 4096,
    systemPromptFile: path.join(PROMPTS_DIR, 'designer.md'),
  },
  {
    name: 'Dev',
    role: '소프트웨어 개발자',
    provider: 'openai',
    model: 'codex-mini-latest',
    outputFile: 'TECH_SPEC.md',
    tokenMultiplier: 0.75, // 겸손하고 꼼꼼, 분량 25% 감소
    maxTokens: 4096,
    systemPromptFile: path.join(PROMPTS_DIR, 'dev.md'),
  },
  {
    name: 'QA',
    role: 'QA 엔지니어 (팀장급)',
    provider: 'openai',
    model: 'gpt-4o',
    outputFile: 'TEST_PLAN.md',
    tokenMultiplier: 1.0, // 꼼꼼한 검증, 기본 분량
    maxTokens: 4096,
    systemPromptFile: path.join(PROMPTS_DIR, 'qa.md'),
  },
];

// 출력 디렉토리 기본 경로
export const OUTPUTS_BASE_DIR = path.join(__dirname, '..', 'outputs');
