// ============================================================
// Clairo - 계약 관리 서비스
// 계약서 파일 처리, 알림 스케줄 등록, 상태 관리
// ============================================================

import type { Contract, ContractAnalysisResult, RiskLevel } from './lib_types.example';
import { analyzeContract } from './lib_ai_service.example';

// ── 계약서 텍스트 추출 ────────────────────────────────────
export async function extractContractText(
  fileBuffer: Buffer,
  fileType: 'pdf' | 'docx' | 'image'
): Promise<string> {
  switch (fileType) {
    case 'pdf': {
      // pdf-parse 라이브러리 사용
      // const pdfParse = await import('pdf-parse');
      // const data = await pdfParse.default(fileBuffer);
      // return data.text;
      throw new Error('pdf-parse 라이브러리 설치 필요: npm install pdf-parse');
    }

    case 'docx': {
      // mammoth 라이브러리 사용
      // const mammoth = await import('mammoth');
      // const result = await mammoth.extractRawText({ buffer: fileBuffer });
      // return result.value;
      throw new Error('mammoth 라이브러리 설치 필요: npm install mammoth');
    }

    case 'image': {
      // 이미지는 AI 분석 시 직접 Vision API로 처리
      // base64로 변환하여 analyzeContract에 전달
      return '[IMAGE_CONTENT]';
    }

    default:
      throw new Error(`지원하지 않는 파일 형식: ${fileType}`);
  }
}

// ── 계약서 분석 + 알림 스케줄 생성 ──────────────────────
export async function processContract(params: {
  file_buffer: Buffer;
  file_name: string;
  file_type: 'pdf' | 'docx' | 'image';
  freelancer_name: string;
  user_id: string;
}): Promise<{
  extracted_text: string;
  analysis: ContractAnalysisResult;
  alert_schedules: AlertSchedule[];
}> {
  // 1. 텍스트 추출
  const extractedText = await extractContractText(params.file_buffer, params.file_type);

  // 2. AI 계약서 분석
  const analysis = await analyzeContract(extractedText, params.freelancer_name);

  // 3. 알림 스케줄 생성
  const alertSchedules = buildAlertSchedules(analysis);

  return {
    extracted_text: extractedText,
    analysis,
    alert_schedules: alertSchedules,
  };
}

// 알림 스케줄 타입
export interface AlertSchedule {
  type: string;
  scheduled_at: Date;
  title: string;
  message: string;
}

// ── 알림 스케줄 계산 ──────────────────────────────────────
function buildAlertSchedules(analysis: ContractAnalysisResult): AlertSchedule[] {
  const schedules: AlertSchedule[] = [];

  // AI가 제안한 알림 추가
  for (const alert of analysis.suggested_alerts) {
    const alertDate = new Date(alert.date);
    if (alertDate > new Date()) {
      schedules.push({
        type: alert.type,
        scheduled_at: alertDate,
        title: `계약 알림: ${alert.type}`,
        message: alert.description,
      });
    }
  }

  // 지급 일정 알림 추가
  for (const payment of analysis.analysis.payment.schedule) {
    const paymentDate = new Date(payment.date);
    if (paymentDate > new Date()) {
      // 지급일 3일 전 알림
      const reminderDate = new Date(paymentDate);
      reminderDate.setDate(reminderDate.getDate() - 3);

      schedules.push({
        type: 'payment_due',
        scheduled_at: reminderDate,
        title: `대금 수령 예정 알림`,
        message: `${payment.amount.toLocaleString()}원 대금 수령 3일 전입니다. (${payment.description})`,
      });
    }
  }

  return schedules.sort((a, b) => a.scheduled_at.getTime() - b.scheduled_at.getTime());
}

// ── 계약 만료 임박 목록 조회 ─────────────────────────────
export function getExpiringContracts(
  contracts: Contract[],
  daysThreshold: number = 30
): Array<Contract & { days_remaining: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return contracts
    .filter((c) => c.status === 'active' && c.end_date)
    .map((c) => {
      const endDate = new Date(c.end_date!);
      const daysRemaining = Math.ceil(
        (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return { ...c, days_remaining: daysRemaining };
    })
    .filter((c) => c.days_remaining >= 0 && c.days_remaining <= daysThreshold)
    .sort((a, b) => a.days_remaining - b.days_remaining);
}

// ── 계약별 수익 집계 ──────────────────────────────────────
export function aggregateContractRevenue(
  contracts: Contract[],
  incomes: Array<{ contract_id?: string; amount: number; income_date: string }>
): Array<{
  contract: Contract;
  total_received: number;
  remaining: number;
  completion_rate: number;
}> {
  return contracts.map((contract) => {
    const contractIncomes = incomes.filter((i) => i.contract_id === contract.id);
    const totalReceived = contractIncomes.reduce((sum, i) => sum + i.amount, 0);
    const contractTotal = contract.total_amount ?? 0;
    const remaining = contractTotal - totalReceived;
    const completionRate = contractTotal > 0 ? (totalReceived / contractTotal) * 100 : 0;

    return {
      contract,
      total_received: totalReceived,
      remaining,
      completion_rate: Math.min(100, Math.round(completionRate)),
    };
  });
}

// ── 리스크 레벨별 계약 필터링 ────────────────────────────
export function filterContractsByRisk(
  contracts: Contract[],
  riskLevel: RiskLevel
): Contract[] {
  return contracts.filter((c) => c.risk_level === riskLevel);
}

// ── 계약서 번호 자동 생성 ─────────────────────────────────
export function generateContractNumber(
  existingCount: number,
  year: number = new Date().getFullYear()
): string {
  const sequence = String(existingCount + 1).padStart(3, '0');
  return `CTR-${year}-${sequence}`;
}
