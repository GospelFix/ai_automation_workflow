// ============================================================
// Clairo - 세금 계산 서비스
// 종합소득세, 부가가치세 계산 로직 (2024년 한국 세법 기준)
// ============================================================

import type { TaxType, BusinessType, TaxReport } from './lib_types.example';

// ── 종합소득세 세율 구간 (2024년 기준) ───────────────────
const INCOME_TAX_BRACKETS = [
  { min: 0,          max: 14_000_000,  rate: 0.06, deduction: 0 },
  { min: 14_000_001, max: 50_000_000,  rate: 0.15, deduction: 1_260_000 },
  { min: 50_000_001, max: 88_000_000,  rate: 0.24, deduction: 5_760_000 },
  { min: 88_000_001, max: 150_000_000, rate: 0.35, deduction: 15_440_000 },
  { min: 150_000_001, max: 300_000_000, rate: 0.38, deduction: 19_940_000 },
  { min: 300_000_001, max: 500_000_000, rate: 0.40, deduction: 25_940_000 },
  { min: 500_000_001, max: Infinity,    rate: 0.42, deduction: 35_940_000 },
];

// 기본 공제
const BASIC_DEDUCTION = 1_500_000; // 기본공제 150만원

// ── 종합소득세 계산 ───────────────────────────────────────
export function calculateIncomeTax(params: {
  total_income: number;
  deductible_expense: number;
  tax_type: TaxType;
  business_type: BusinessType;
  extra_deductions?: number; // 노란우산공제 등 추가 공제
}): {
  taxable_income: number;
  calculated_tax: number;
  applied_rate: number;
  effective_rate: number;
} {
  // 과세표준 계산
  const standardExpenseDeduction = calculateStandardExpenseDeduction(
    params.total_income,
    params.business_type
  );

  // 필요경비 = Max(실제 공제 가능 지출, 표준경비율)
  const expenseDeduction = Math.max(
    params.deductible_expense,
    standardExpenseDeduction
  );

  const taxableIncome = Math.max(
    0,
    params.total_income
      - expenseDeduction
      - BASIC_DEDUCTION
      - (params.extra_deductions ?? 0)
  );

  // 세율 구간 적용
  const bracket = INCOME_TAX_BRACKETS.find(
    (b) => taxableIncome >= b.min && taxableIncome <= b.max
  );

  if (!bracket) return { taxable_income: 0, calculated_tax: 0, applied_rate: 0, effective_rate: 0 };

  const calculatedTax = Math.floor(taxableIncome * bracket.rate - bracket.deduction);

  return {
    taxable_income: taxableIncome,
    calculated_tax: Math.max(0, calculatedTax),
    applied_rate: bracket.rate,
    effective_rate: taxableIncome > 0 ? calculatedTax / params.total_income : 0,
  };
}

// 표준경비율 계산 (업종별 다름 - 여기서는 프리랜서 서비스업 기준)
function calculateStandardExpenseDeduction(
  income: number,
  businessType: BusinessType
): number {
  if (businessType === 'individual') {
    // 무사업자(3.3% 원천징수) 표준경비율: 수입의 약 63.4%
    return Math.floor(income * 0.634);
  }
  // 개인사업자: 업종별 표준경비율 (서비스업 기준 약 20%)
  return Math.floor(income * 0.20);
}

// ── 부가가치세 계산 ───────────────────────────────────────
export function calculateVAT(params: {
  tax_type: TaxType;
  total_income: number;         // 공급가액 (부가세 별도)
  total_deductible_expense: number; // 매입세액 공제 가능 지출
  period: 'H1' | 'H2';
}): {
  output_vat: number;   // 매출세액
  input_vat: number;    // 매입세액
  payable_vat: number;  // 납부세액
  is_simplified: boolean;
} {
  const outputVat = Math.floor(params.total_income * 0.1);
  const inputVat = Math.floor(params.total_deductible_expense * 0.1);

  if (params.tax_type === 'simplified') {
    // 간이과세자: 업종별 부가가치율 적용 (서비스업 약 30%)
    const VAT_RATE_SIMPLIFIED = 0.3;
    const simplifiedVat = Math.floor(outputVat * VAT_RATE_SIMPLIFIED);
    return {
      output_vat: outputVat,
      input_vat: 0,
      payable_vat: Math.max(0, simplifiedVat),
      is_simplified: true,
    };
  }

  // 일반과세자
  return {
    output_vat: outputVat,
    input_vat: inputVat,
    payable_vat: Math.max(0, outputVat - inputVat),
    is_simplified: false,
  };
}

// ── 최종 납부세액 계산 (원천징수 차감) ───────────────────
export function calculateFinalTax(params: {
  calculated_tax: number;
  tax_withheld: number;         // 기납부 원천징수액
  local_income_tax_rate?: number; // 지방소득세율 (기본 10%)
}): {
  local_income_tax: number;
  total_tax: number;
  final_payable: number;        // 최종 납부액 (음수 = 환급)
} {
  const localIncomeTax = Math.floor(
    params.calculated_tax * (params.local_income_tax_rate ?? 0.1)
  );
  const totalTax = params.calculated_tax + localIncomeTax;
  const finalPayable = totalTax - params.tax_withheld;

  return {
    local_income_tax: localIncomeTax,
    total_tax: totalTax,
    final_payable: finalPayable,
  };
}

// ── 세금 신고 기간 체크 ───────────────────────────────────
export function getTaxDeadlines(year: number): Array<{
  type: string;
  name: string;
  start: Date;
  end: Date;
  description: string;
}> {
  return [
    {
      type: 'vat_h1',
      name: '부가세 1기 확정신고',
      start: new Date(year, 0, 1),   // 1월 1일
      end: new Date(year, 0, 25),    // 1월 25일
      description: '전년도 7~12월 부가가치세 신고',
    },
    {
      type: 'vat_h2_preliminary',
      name: '부가세 2기 예정신고',
      start: new Date(year, 6, 1),   // 7월 1일
      end: new Date(year, 6, 25),    // 7월 25일
      description: '당해 1~6월 부가가치세 신고',
    },
    {
      type: 'income_tax',
      name: '종합소득세 확정신고',
      start: new Date(year, 4, 1),   // 5월 1일
      end: new Date(year, 4, 31),    // 5월 31일
      description: '전년도 종합소득에 대한 세금 신고',
    },
    {
      type: 'prepayment',
      name: '종합소득세 중간예납',
      start: new Date(year, 10, 1),  // 11월 1일
      end: new Date(year, 10, 30),   // 11월 30일
      description: '당해 종합소득세 중간 납부',
    },
  ];
}

// ── 세금 신고 알림 계산 ───────────────────────────────────
export function getUpcomingTaxDeadlines(
  currentDate: Date = new Date()
): Array<{
  type: string;
  name: string;
  deadline: Date;
  days_remaining: number;
  is_urgent: boolean;
}> {
  const year = currentDate.getFullYear();
  const deadlines = getTaxDeadlines(year);

  return deadlines
    .map((d) => {
      const daysRemaining = Math.ceil(
        (d.end.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        type: d.type,
        name: d.name,
        deadline: d.end,
        days_remaining: daysRemaining,
        is_urgent: daysRemaining <= 14 && daysRemaining >= 0,
      };
    })
    .filter((d) => d.days_remaining >= 0)
    .sort((a, b) => a.days_remaining - b.days_remaining);
}

// ── 연간 수익 요약 집계 ───────────────────────────────────
export function aggregateAnnualSummary(
  incomes: Array<{ amount: number; tax_withheld: number; income_date: string }>,
  expenses: Array<{ amount: number; is_deductible: boolean; deductible_rate: number }>
): {
  total_income: number;
  total_expense: number;
  deductible_expense: number;
  tax_withheld: number;
  net_income: number;
} {
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const taxWithheld = incomes.reduce((sum, i) => sum + i.tax_withheld, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const deductibleExpense = expenses
    .filter((e) => e.is_deductible)
    .reduce((sum, e) => sum + Math.floor(e.amount * (e.deductible_rate / 100)), 0);

  return {
    total_income: totalIncome,
    total_expense: totalExpense,
    deductible_expense: deductibleExpense,
    tax_withheld: taxWithheld,
    net_income: totalIncome - totalExpense,
  };
}
