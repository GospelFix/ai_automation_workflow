import * as fs from 'fs';
import * as path from 'path';
import { AGENT_CONFIGS, OUTPUTS_BASE_DIR, validateEnv } from './config';
import { AgentConfig, AgentResult, PipelineContext, PipelineSummary } from './types';
import { BaseAgent } from './agents/base-agent';
import { PMAgent } from './agents/pm-agent';
import { DesignerAgent } from './agents/designer-agent';
import { DevAgent } from './agents/dev-agent';
import { QAAgent } from './agents/qa-agent';

// 에이전트 인스턴스 생성 팩토리
function createAgent(config: AgentConfig): BaseAgent {
  switch (config.provider) {
    case 'anthropic':
      return new PMAgent(config);
    case 'google':
      return new DesignerAgent(config);
    case 'openai':
      if (config.name === 'Dev') return new DevAgent(config);
      if (config.name === 'QA') return new QAAgent(config);
      throw new Error(`알 수 없는 OpenAI 에이전트: ${config.name}`);
    default:
      throw new Error(`지원하지 않는 provider: ${config.provider}`);
  }
}

// 타임스탬프 기반 출력 디렉토리 생성
function createOutputDir(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join(OUTPUTS_BASE_DIR, timestamp);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'code'), { recursive: true });
  return outputDir;
}

// 파이프라인 요약 저장
function saveSummary(summary: PipelineSummary, outputDir: string): void {
  const summaryPath = path.join(outputDir, 'PIPELINE_SUMMARY.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
}

// 파이프라인 완료 보고서 출력
function printSummary(summary: PipelineSummary): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log('파이프라인 실행 완료');
  console.log(`${'='.repeat(60)}`);
  console.log(`\n총 실행 시간: ${(summary.totalDuration / 1000).toFixed(1)}초`);
  console.log(`산출물 위치: ${summary.outputDir}\n`);
  console.log('생성된 파일:');
  for (const result of summary.results) {
    console.log(`  ✓ [${result.agentName}] ${result.outputFile} (${(result.duration / 1000).toFixed(1)}초)`);
  }
  console.log(`\n프로젝트 요구사항:\n  ${summary.projectRequirements.slice(0, 100)}...`);
}

// 메인 파이프라인 실행
async function runPipeline(projectRequirements: string): Promise<void> {
  // 환경 변수 검증
  validateEnv();

  const startTime = Date.now();
  const startedAt = new Date().toISOString();
  const outputDir = createOutputDir();

  console.log('\n멀티 에이전트 파이프라인 시작');
  console.log(`산출물 폴더: ${outputDir}`);
  console.log(`\n프로젝트 요구사항:\n${projectRequirements}\n`);

  // 파이프라인 컨텍스트 (이전 산출물 누적)
  const context: PipelineContext = {
    projectRequirements,
    outputs: {},
  };

  const results: AgentResult[] = [];

  // 에이전트 순차 실행
  for (const agentConfig of AGENT_CONFIGS) {
    const agent = createAgent(agentConfig);
    const result = await agent.run(context, outputDir);

    results.push(result);

    // 다음 에이전트를 위해 컨텍스트에 산출물 누적
    context.outputs[result.outputFile] = result.content;
  }

  const totalDuration = Date.now() - startTime;
  const completedAt = new Date().toISOString();

  // 요약 저장
  const summary: PipelineSummary = {
    projectRequirements,
    outputDir,
    results,
    totalDuration,
    startedAt,
    completedAt,
  };

  saveSummary(summary, outputDir);
  printSummary(summary);
}

// CLI 진입점
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('사용법: npx ts-node src/pipeline.ts "프로젝트 요구사항 설명"');
  process.exit(1);
}

const projectRequirements = args.join(' ');

runPipeline(projectRequirements).catch((error) => {
  console.error('\n파이프라인 실행 중 오류 발생:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
