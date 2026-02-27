-- ============================================================
-- Clairo - AI 프리랜서 세금·계약 통합 관리 서비스
-- Database Schema (PostgreSQL / Supabase)
-- ============================================================

-- 사용자 프로필
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,

  -- 프리랜서 유형
  freelancer_type VARCHAR(50),    -- 'developer' | 'designer' | 'writer' | 'marketer' | 'other'

  -- 사업자 정보
  business_type VARCHAR(20) DEFAULT 'individual', -- 'individual' | 'sole_proprietor'
  business_number VARCHAR(20),     -- 사업자등록번호 (개인사업자)

  -- 과세 유형
  tax_type VARCHAR(20) DEFAULT 'simplified', -- 'simplified' 간이과세 | 'general' 일반과세

  -- 부가세 신고 유형
  vat_period VARCHAR(20) DEFAULT 'semi_annual', -- 'semi_annual' 반기 | 'quarterly' 분기

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 클라이언트
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company VARCHAR(200),
  business_number VARCHAR(20),  -- 클라이언트 사업자번호
  address TEXT,

  -- AI 분석 메모
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 수입 내역
CREATE TABLE incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  contract_id UUID,               -- 연결된 계약 (하단 contracts 테이블 참조)

  -- 수입 정보
  title VARCHAR(500) NOT NULL,    -- 프로젝트명 / 수입 설명
  amount DECIMAL(15, 2) NOT NULL, -- 총 금액
  currency VARCHAR(10) DEFAULT 'KRW',

  -- 세금 처리
  tax_withheld DECIMAL(15, 2) DEFAULT 0,    -- 원천징수 세액 (3.3%)
  tax_rate DECIMAL(5, 2) DEFAULT 3.3,
  net_amount DECIMAL(15, 2),                -- 실수령액

  -- 부가세
  vat_included BOOLEAN DEFAULT FALSE,       -- 부가세 포함 여부
  vat_amount DECIMAL(15, 2) DEFAULT 0,

  income_date DATE NOT NULL,      -- 수입 발생일
  received_date DATE,             -- 실제 수령일

  -- 분류
  income_type VARCHAR(50) DEFAULT 'project', -- 'project' | 'salary' | 'royalty' | 'other'

  -- 증빙
  invoice_id UUID,                -- 연결된 인보이스

  memo TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 지출 내역
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 지출 정보
  title VARCHAR(500) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'KRW',

  -- 부가세
  vat_included BOOLEAN DEFAULT FALSE,
  vat_amount DECIMAL(15, 2) DEFAULT 0,

  expense_date DATE NOT NULL,

  -- 분류 (AI가 자동 분류)
  category VARCHAR(100),  -- 'software' | 'equipment' | 'meal' | 'transport' | 'education' | 'communication' | 'other'

  -- 필요경비 인정 여부 (AI 판단)
  is_deductible BOOLEAN DEFAULT TRUE,
  deductible_rate DECIMAL(5, 2) DEFAULT 100, -- 공제 비율 (%)
  deductible_amount DECIMAL(15, 2),

  -- AI 분류 근거
  ai_classification_reason TEXT,

  -- 영수증
  receipt_image_url TEXT,
  receipt_ocr_data JSONB,         -- OCR 추출 원본 데이터

  -- 증빙 유형
  receipt_type VARCHAR(50),       -- 'card' | 'cash' | 'bank_transfer' | 'invoice'

  memo TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 계약서
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),

  -- 계약 기본 정보
  title VARCHAR(500) NOT NULL,
  contract_number VARCHAR(100),   -- 계약 번호

  -- 기간
  start_date DATE,
  end_date DATE,

  -- 금액
  total_amount DECIMAL(15, 2),
  currency VARCHAR(10) DEFAULT 'KRW',
  payment_terms TEXT,             -- 지급 조건

  -- 상태
  status VARCHAR(50) DEFAULT 'active', -- 'draft' | 'active' | 'completed' | 'terminated'

  -- 원본 파일
  file_url TEXT,
  file_name VARCHAR(500),
  file_type VARCHAR(50),          -- 'pdf' | 'docx' | 'image'

  -- AI 분석 결과
  ai_summary TEXT,                -- AI 요약
  ai_analysis JSONB,              -- 상세 분석 결과
  /*
    ai_analysis 구조:
    {
      "parties": { "client": {...}, "freelancer": {...} },
      "scope": "프로젝트 범위 설명",
      "deliverables": ["결과물1", "결과물2"],
      "payment": {
        "schedule": [{"date": "2024-03-01", "amount": 500000}],
        "method": "계좌이체"
      },
      "ip_ownership": "납품 후 클라이언트 귀속",
      "confidentiality": "계약 종료 후 3년",
      "termination_clause": "30일 전 서면 통보",
      "risks": [
        {"level": "high", "description": "리스크 내용"}
      ]
    }
  */

  risk_level VARCHAR(20),         -- 'low' | 'medium' | 'high'
  risk_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- contracts 테이블 생성 후 incomes의 외래키 추가
ALTER TABLE incomes ADD CONSTRAINT fk_incomes_contract
  FOREIGN KEY (contract_id) REFERENCES contracts(id);

-- 인보이스
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  contract_id UUID REFERENCES contracts(id),
  income_id UUID REFERENCES incomes(id),

  -- 인보이스 정보
  invoice_number VARCHAR(100) NOT NULL, -- 자동 생성: INV-2024-001
  title VARCHAR(500) NOT NULL,

  -- 금액
  subtotal DECIMAL(15, 2) NOT NULL,
  vat_rate DECIMAL(5, 2) DEFAULT 10,
  vat_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'KRW',

  -- 일정
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,

  -- 상태
  status VARCHAR(50) DEFAULT 'draft', -- 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

  -- 내용
  line_items JSONB,               -- [{"description": "...", "quantity": 1, "unit_price": 1000000}]
  notes TEXT,                     -- 추가 메모

  -- AI 생성 여부
  ai_generated BOOLEAN DEFAULT FALSE,

  -- 파일
  pdf_url TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 세금 신고 기록
CREATE TABLE tax_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 신고 유형 및 기간
  report_type VARCHAR(50) NOT NULL, -- 'income_tax' 종합소득세 | 'vat' 부가세 | 'prepayment' 중간예납
  tax_year INTEGER NOT NULL,
  period VARCHAR(20),               -- 'annual' | 'H1' | 'H2' | 'Q1' | 'Q2' | 'Q3' | 'Q4'

  -- 수입·지출 요약
  total_income DECIMAL(15, 2) DEFAULT 0,
  total_expense DECIMAL(15, 2) DEFAULT 0,
  deductible_expense DECIMAL(15, 2) DEFAULT 0,
  taxable_income DECIMAL(15, 2) DEFAULT 0,

  -- 세금 계산
  tax_withheld DECIMAL(15, 2) DEFAULT 0,   -- 기납부 원천징수액
  calculated_tax DECIMAL(15, 2) DEFAULT 0, -- 산출세액
  final_tax DECIMAL(15, 2) DEFAULT 0,      -- 최종 납부세액 (차감 후)

  -- AI 분석
  ai_summary TEXT,                -- AI 절세 제안 요약
  ai_recommendations JSONB,       -- 절세 항목 상세
  /*
    [
      {
        "type": "노란우산공제",
        "description": "가입 시 최대 500만원 소득공제",
        "potential_saving": 800000,
        "action": "가입 필요"
      }
    ]
  */

  -- 신고 상태
  status VARCHAR(50) DEFAULT 'draft', -- 'draft' | 'reviewed' | 'filed'
  filed_date DATE,

  -- 생성된 신고서 데이터 (홈택스 입력용 가이드)
  report_data JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 알림 설정
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 알림 유형
  type VARCHAR(100) NOT NULL,
  -- 'contract_expiry' | 'payment_due' | 'tax_deadline' | 'monthly_report'

  -- 연결된 항목
  reference_type VARCHAR(50),     -- 'contract' | 'income' | 'tax_report'
  reference_id UUID,

  -- 알림 내용
  title VARCHAR(500) NOT NULL,
  message TEXT,

  -- 발송 일정
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,

  -- 상태
  is_read BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'sent' | 'failed'

  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI 채팅 내역
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 대화 맥락
  context_snapshot JSONB,         -- 대화 시점의 사용자 재무 현황 스냅샷

  -- 대화 내용
  messages JSONB NOT NULL DEFAULT '[]',
  /*
    [
      {"role": "user", "content": "...", "timestamp": "..."},
      {"role": "assistant", "content": "...", "timestamp": "..."}
    ]
  */

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 인덱스
-- ============================================================
CREATE INDEX idx_incomes_user_date ON incomes(user_id, income_date);
CREATE INDEX idx_expenses_user_date ON expenses(user_id, expense_date);
CREATE INDEX idx_contracts_user_status ON contracts(user_id, status);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);
CREATE INDEX idx_invoices_user_status ON invoices(user_id, status);
CREATE INDEX idx_notifications_user_scheduled ON notifications(user_id, scheduled_at);

-- ============================================================
-- RLS (Row Level Security) - Supabase 보안 정책
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- 본인 데이터만 접근 가능
CREATE POLICY "본인 프로필만 접근" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "본인 클라이언트만 접근" ON clients FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "본인 수입만 접근" ON incomes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "본인 지출만 접근" ON expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "본인 계약만 접근" ON contracts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "본인 인보이스만 접근" ON invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "본인 세금신고만 접근" ON tax_reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "본인 알림만 접근" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "본인 대화만 접근" ON ai_conversations FOR ALL USING (auth.uid() = user_id);
