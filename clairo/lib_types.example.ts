// ============================================================
// Clairo - 전체 TypeScript 타입 정의
// ============================================================

// 프리랜서 유형
export type FreelancerType = 'developer' | 'designer' | 'writer' | 'marketer' | 'other';

// 과세 유형
export type TaxType = 'simplified' | 'general'; // 간이과세 | 일반과세

// 사업자 유형
export type BusinessType = 'individual' | 'sole_proprietor'; // 개인 | 개인사업자

// ── 사용자 프로필 ──────────────────────────────────────────
export interface Profile {
  id: string;
  name: string;
  email: string;
  freelancer_type: FreelancerType;
  business_type: BusinessType;
  business_number?: string;
  tax_type: TaxType;
  vat_period: 'semi_annual' | 'quarterly';
  created_at: string;
  updated_at: string;
}

// ── 클라이언트 ────────────────────────────────────────────
export interface Client {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  business_number?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

// ── 수입 ──────────────────────────────────────────────────
export type IncomeType = 'project' | 'salary' | 'royalty' | 'other';

export interface Income {
  id: string;
  user_id: string;
  client_id?: string;
  contract_id?: string;
  title: string;
  amount: number;
  currency: string;
  tax_withheld: number;
  tax_rate: number;
  net_amount: number;
  vat_included: boolean;
  vat_amount: number;
  income_date: string;
  received_date?: string;
  income_type: IncomeType;
  invoice_id?: string;
  memo?: string;
  created_at: string;
}

// 수입 생성 요청
export interface CreateIncomeRequest {
  client_id?: string;
  contract_id?: string;
  title: string;
  amount: number;
  tax_rate?: number;           // 기본 3.3%
  vat_included?: boolean;
  income_date: string;
  income_type?: IncomeType;
  memo?: string;
}

// ── 지출 ──────────────────────────────────────────────────
export type ExpenseCategory =
  | 'software'      // 소프트웨어 구독
  | 'equipment'     // 장비·기기
  | 'meal'          // 식비 (미팅 등 업무 관련)
  | 'transport'     // 교통비
  | 'education'     // 교육·훈련
  | 'communication' // 통신비
  | 'workspace'     // 공간 임대
  | 'marketing'     // 마케팅·광고
  | 'other';        // 기타

export interface Expense {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  currency: string;
  vat_included: boolean;
  vat_amount: number;
  expense_date: string;
  category?: ExpenseCategory;
  is_deductible: boolean;
  deductible_rate: number;
  deductible_amount?: number;
  ai_classification_reason?: string;
  receipt_image_url?: string;
  receipt_ocr_data?: ReceiptOcrData;
  receipt_type?: 'card' | 'cash' | 'bank_transfer' | 'invoice';
  memo?: string;
  created_at: string;
}

// 영수증 OCR 결과
export interface ReceiptOcrData {
  merchant_name?: string;
  merchant_category?: string;
  amount?: number;
  date?: string;
  payment_method?: string;
  raw_text?: string;
}

// ── 계약서 ────────────────────────────────────────────────
export type ContractStatus = 'draft' | 'active' | 'completed' | 'terminated';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface ContractAnalysis {
  parties: {
    client: { name: string; contact?: string };
    freelancer: { name: string };
  };
  scope: string;
  deliverables: string[];
  payment: {
    schedule: Array<{ date: string; amount: number; description: string }>;
    method: string;
    currency: string;
  };
  ip_ownership: string;
  confidentiality: string;
  termination_clause: string;
  dispute_resolution: string;
  risks: Array<{
    level: RiskLevel;
    description: string;
    clause?: string;
  }>;
}

export interface Contract {
  id: string;
  user_id: string;
  client_id?: string;
  title: string;
  contract_number?: string;
  start_date?: string;
  end_date?: string;
  total_amount?: number;
  currency: string;
  payment_terms?: string;
  status: ContractStatus;
  file_url?: string;
  file_name?: string;
  file_type?: 'pdf' | 'docx' | 'image';
  ai_summary?: string;
  ai_analysis?: ContractAnalysis;
  risk_level?: RiskLevel;
  risk_notes?: string;
  created_at: string;
  updated_at: string;
}

// ── 인보이스 ──────────────────────────────────────────────
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id?: string;
  contract_id?: string;
  invoice_number: string;
  title: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  currency: string;
  issue_date: string;
  due_date?: string;
  paid_date?: string;
  status: InvoiceStatus;
  line_items?: InvoiceLineItem[];
  notes?: string;
  ai_generated: boolean;
  pdf_url?: string;
  created_at: string;
}

// ── 세금 신고 ─────────────────────────────────────────────
export type ReportType = 'income_tax' | 'vat' | 'prepayment';
export type ReportStatus = 'draft' | 'reviewed' | 'filed';

export interface TaxRecommendation {
  type: string;
  description: string;
  potential_saving: number;
  action: string;
}

export interface TaxReport {
  id: string;
  user_id: string;
  report_type: ReportType;
  tax_year: number;
  period: 'annual' | 'H1' | 'H2' | 'Q1' | 'Q2' | 'Q3' | 'Q4';
  total_income: number;
  total_expense: number;
  deductible_expense: number;
  taxable_income: number;
  tax_withheld: number;
  calculated_tax: number;
  final_tax: number;
  ai_summary?: string;
  ai_recommendations?: TaxRecommendation[];
  status: ReportStatus;
  filed_date?: string;
  report_data?: Record<string, unknown>;
  created_at: string;
}

// ── AI 응답 타입 ──────────────────────────────────────────

// 영수증 OCR + 분류 응답
export interface ReceiptAnalysisResult {
  merchant_name: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
  is_deductible: boolean;
  deductible_rate: number;
  classification_reason: string;
}

// 계약서 분석 응답
export interface ContractAnalysisResult {
  summary: string;
  analysis: ContractAnalysis;
  risk_level: RiskLevel;
  risk_notes: string;
  suggested_alerts: Array<{
    type: string;
    date: string;
    description: string;
  }>;
}

// 세금 분석 응답
export interface TaxAnalysisResult {
  taxable_income: number;
  calculated_tax: number;
  final_tax: number;
  effective_rate: number;
  summary: string;
  recommendations: TaxRecommendation[];
}

// 수익 분석 응답
export interface IncomeAnalysisResult {
  period_summary: {
    total_income: number;
    total_expense: number;
    net_income: number;
    growth_rate?: number;
  };
  insights: string[];
  client_breakdown: Array<{
    client_name: string;
    amount: number;
    percentage: number;
  }>;
  next_month_prediction: {
    min: number;
    max: number;
    confidence: string;
  };
  recommendations: string[];
}

// AI 채팅 메시지
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// AI 채팅 컨텍스트 (사용자 재무 현황)
export interface UserFinancialContext {
  ytd_income: number;           // 연도 누계 수입
  ytd_expense: number;          // 연도 누계 지출
  ytd_net: number;              // 연도 누계 순수익
  tax_type: TaxType;
  business_type: BusinessType;
  active_contracts: number;     // 활성 계약 수
  pending_invoices: number;     // 미수금 인보이스 수
  current_month: number;        // 현재 월 수입
}
