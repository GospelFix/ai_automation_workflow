// ============================================================
// Clairo - AI 서비스 (Claude API 연동)
// 계약 분석 / 세금 어드바이저 / 영수증 OCR / 수익 예측
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import type {
  ContractAnalysisResult,
  ReceiptAnalysisResult,
  TaxAnalysisResult,
  IncomeAnalysisResult,
  UserFinancialContext,
  ChatMessage,
  TaxType,
  BusinessType,
} from './lib_types.example';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── 1. 계약서 AI 분석 ─────────────────────────────────────
export async function analyzeContract(
  contractText: string,
  freelancerName: string
): Promise<ContractAnalysisResult> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `다음 계약서를 한국 프리랜서(${freelancerName}) 관점에서 분석해주세요.

계약서 내용:
${contractText}

다음 JSON 형식으로 정확하게 응답해주세요:
{
  "summary": "계약서 핵심 내용 3-5줄 요약",
  "analysis": {
    "parties": {
      "client": { "name": "클라이언트명", "contact": "연락처" },
      "freelancer": { "name": "프리랜서명" }
    },
    "scope": "프로젝트 범위 설명",
    "deliverables": ["결과물1", "결과물2"],
    "payment": {
      "schedule": [{"date": "YYYY-MM-DD", "amount": 0, "description": "설명"}],
      "method": "지급 방법",
      "currency": "KRW"
    },
    "ip_ownership": "지식재산권 귀속 내용",
    "confidentiality": "비밀유지 조건",
    "termination_clause": "계약 해지 조건",
    "dispute_resolution": "분쟁 해결 방법",
    "risks": [
      {"level": "high|medium|low", "description": "리스크 설명", "clause": "관련 조항"}
    ]
  },
  "risk_level": "high|medium|low",
  "risk_notes": "전반적인 리스크 평가 설명",
  "suggested_alerts": [
    {"type": "알림유형", "date": "YYYY-MM-DD", "description": "알림 내용"}
  ]
}

JSON만 응답하고 다른 텍스트는 포함하지 마세요.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('AI 응답 형식 오류');

  return JSON.parse(content.text) as ContractAnalysisResult;
}

// ── 2. 영수증 OCR + 자동 분류 ────────────────────────────
export async function analyzeReceipt(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<ReceiptAnalysisResult> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', // 빠른 처리용 Haiku
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `이 영수증을 분석하고 한국 프리랜서 세금 신고 관점에서 분류해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "merchant_name": "가맹점명",
  "amount": 숫자,
  "date": "YYYY-MM-DD",
  "category": "software|equipment|meal|transport|education|communication|workspace|marketing|other",
  "is_deductible": true|false,
  "deductible_rate": 0~100,
  "classification_reason": "분류 근거 한 문장 설명"
}

분류 기준:
- software: 소프트웨어 구독 (Adobe, GitHub 등) → 100% 공제
- equipment: 업무용 장비 (노트북, 카메라 등) → 100% 공제
- meal: 업무 미팅 식비 → 50% 공제 (사적 식비는 0%)
- transport: 업무용 교통비 → 100% 공제
- education: 업무 관련 교육 → 100% 공제
- communication: 업무용 통신비 → 100% 공제

JSON만 응답해주세요.`,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('AI 응답 형식 오류');

  return JSON.parse(content.text) as ReceiptAnalysisResult;
}

// ── 3. 세금 AI 분석 및 절세 제안 ─────────────────────────
export async function analyzeTax(params: {
  tax_year: number;
  report_type: 'income_tax' | 'vat' | 'prepayment';
  total_income: number;
  total_expense: number;
  deductible_expense: number;
  tax_withheld: number;
  tax_type: TaxType;
  business_type: BusinessType;
}): Promise<TaxAnalysisResult> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `한국 프리랜서 세금 분석을 수행해주세요.

입력 데이터:
- 신고 연도: ${params.tax_year}년
- 신고 유형: ${params.report_type === 'income_tax' ? '종합소득세' : params.report_type === 'vat' ? '부가가치세' : '중간예납'}
- 총 수입: ${params.total_income.toLocaleString()}원
- 총 지출: ${params.total_expense.toLocaleString()}원
- 공제 가능 지출: ${params.deductible_expense.toLocaleString()}원
- 기납부 원천징수액: ${params.tax_withheld.toLocaleString()}원
- 과세 유형: ${params.tax_type === 'simplified' ? '간이과세자' : '일반과세자'}
- 사업자 유형: ${params.business_type === 'individual' ? '개인(무사업자)' : '개인사업자'}

다음 JSON 형식으로 응답해주세요:
{
  "taxable_income": 과세표준 숫자,
  "calculated_tax": 산출세액 숫자,
  "final_tax": 최종납부세액 숫자 (음수면 환급),
  "effective_rate": 실효세율 숫자(소수점),
  "summary": "세금 현황 요약 2-3문장",
  "recommendations": [
    {
      "type": "공제항목명",
      "description": "설명",
      "potential_saving": 절세예상금액,
      "action": "필요한 조치"
    }
  ]
}

2024년 한국 세법 기준으로 정확하게 계산해주세요.
JSON만 응답해주세요.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('AI 응답 형식 오류');

  return JSON.parse(content.text) as TaxAnalysisResult;
}

// ── 4. 수익 트렌드 분석 ───────────────────────────────────
export async function analyzeIncome(params: {
  current_month_income: number;
  prev_month_income: number;
  ytd_income: number;
  ytd_expense: number;
  client_breakdown: Array<{ client_name: string; amount: number }>;
  monthly_history: Array<{ month: string; income: number; expense: number }>;
}): Promise<IncomeAnalysisResult> {
  const total = params.client_breakdown.reduce((sum, c) => sum + c.amount, 0);
  const clientBreakdownText = params.client_breakdown
    .map((c) => `  - ${c.client_name}: ${c.amount.toLocaleString()}원 (${((c.amount / total) * 100).toFixed(1)}%)`)
    .join('\n');

  const historyText = params.monthly_history
    .map((h) => `  - ${h.month}: 수입 ${h.income.toLocaleString()}원, 지출 ${h.expense.toLocaleString()}원`)
    .join('\n');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `프리랜서 수익 데이터를 분석하고 인사이트를 제공해주세요.

이번 달 수입: ${params.current_month_income.toLocaleString()}원
전달 수입: ${params.prev_month_income.toLocaleString()}원
연간 누계 수입: ${params.ytd_income.toLocaleString()}원
연간 누계 지출: ${params.ytd_expense.toLocaleString()}원

클라이언트별 수익:
${clientBreakdownText}

월별 히스토리:
${historyText}

다음 JSON 형식으로 응답해주세요:
{
  "period_summary": {
    "total_income": 숫자,
    "total_expense": 숫자,
    "net_income": 숫자,
    "growth_rate": 전월대비성장률_숫자
  },
  "insights": [
    "인사이트 문장1",
    "인사이트 문장2",
    "인사이트 문장3"
  ],
  "client_breakdown": [
    {"client_name": "이름", "amount": 숫자, "percentage": 숫자}
  ],
  "next_month_prediction": {
    "min": 최솟값_숫자,
    "max": 최댓값_숫자,
    "confidence": "high|medium|low"
  },
  "recommendations": [
    "추천사항 문장1",
    "추천사항 문장2"
  ]
}

JSON만 응답해주세요.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('AI 응답 형식 오류');

  return JSON.parse(content.text) as IncomeAnalysisResult;
}

// ── 5. AI 어드바이저 채팅 ─────────────────────────────────
export async function chatWithAdvisor(
  messages: ChatMessage[],
  userContext: UserFinancialContext
): Promise<string> {
  // 사용자 재무 현황을 시스템 프롬프트에 주입
  const systemPrompt = `당신은 한국 프리랜서 전문 세금·계약 어드바이저입니다.
사용자의 실제 재무 데이터를 바탕으로 구체적이고 개인화된 조언을 제공하세요.

현재 사용자 재무 현황:
- 올해 누적 수입: ${userContext.ytd_income.toLocaleString()}원
- 올해 누적 지출: ${userContext.ytd_expense.toLocaleString()}원
- 올해 순수익: ${userContext.ytd_net.toLocaleString()}원
- 이번 달 수입: ${userContext.current_month.toLocaleString()}원
- 과세 유형: ${userContext.tax_type === 'simplified' ? '간이과세자' : '일반과세자'}
- 사업자 유형: ${userContext.business_type === 'individual' ? '개인(무사업자)' : '개인사업자'}
- 활성 계약: ${userContext.active_contracts}건
- 미수금 인보이스: ${userContext.pending_invoices}건

답변 원칙:
1. 일반적인 정보가 아닌 사용자의 실제 데이터를 언급하며 답변하세요.
2. 한국 세법(2024년 기준)에 근거한 정확한 정보를 제공하세요.
3. 복잡한 내용은 쉬운 말로 설명하세요.
4. 필요 시 전문 세무사 상담을 권고하세요.
5. 답변은 3-5문장으로 간결하게 작성하세요.`;

  // ChatMessage → Anthropic MessageParam 변환
  const anthropicMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: anthropicMessages,
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('AI 응답 형식 오류');

  return content.text;
}

// ── 6. 인보이스 초안 AI 생성 ─────────────────────────────
export async function generateInvoiceDraft(params: {
  client_name: string;
  project_description: string;
  total_amount: number;
  freelancer_name: string;
}): Promise<{
  title: string;
  line_items: Array<{ description: string; quantity: number; unit_price: number; total: number }>;
  notes: string;
}> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `다음 정보로 전문적인 인보이스 항목을 생성해주세요.

클라이언트: ${params.client_name}
프로젝트 설명: ${params.project_description}
총 금액: ${params.total_amount.toLocaleString()}원
프리랜서: ${params.freelancer_name}

다음 JSON 형식으로 응답해주세요:
{
  "title": "인보이스 제목",
  "line_items": [
    {
      "description": "서비스 항목 설명",
      "quantity": 수량,
      "unit_price": 단가,
      "total": 합계
    }
  ],
  "notes": "결제 안내 및 기타 메모 (계좌 이체 안내, 감사 인사 등)"
}

JSON만 응답해주세요.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('AI 응답 형식 오류');

  return JSON.parse(content.text);
}
