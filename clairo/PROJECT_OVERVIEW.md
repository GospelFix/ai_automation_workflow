# AI 기반 프리랜서 세금·계약 통합 관리 서비스 (Clairo)

## 서비스 개요

프리랜서 급증 시대에 맞춰 **세금신고 + 계약관리 + 수익분석**을 AI로 통합한 올인원 플랫폼.
기존 세금 앱의 한계를 AI로 극복하여, 비전문가도 쉽게 세금·계약을 관리할 수 있도록 한다.

---

## 핵심 기능

| 기능 | 설명 | AI 역할 |
|------|------|---------|
| **세금 신고** | 종합소득세, 부가세 자동 계산 | 공제항목 자동 추천, 절세 전략 제안 |
| **계약 관리** | 계약서 업로드 및 분석 | 조건 추출, 리스크 감지, 요약 생성 |
| **수익 분석** | 월별/분기별 수익 트래킹 | 트렌드 예측, 인사이트 리포트 |
| **영수증 처리** | 사진 촬영으로 자동 입력 | OCR + 카테고리 자동 분류 |
| **인보이스 생성** | 전문 인보이스 자동 생성 | 클라이언트별 맞춤 작성 |

---

## 기술 스택

```
Frontend:  Next.js 14 (App Router) + TypeScript + Tailwind CSS
Backend:   Next.js API Routes + Supabase
Database:  PostgreSQL (Supabase)
Storage:   Supabase Storage (계약서, 영수증 파일)
AI:        Claude claude-sonnet-4-6 (계약 분석, 세금 어드바이저)
           Claude Haiku (영수증 OCR 분류, 빠른 처리)
Auth:      Supabase Auth
```

---

## 디렉토리 구조

```
clairo/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/          # 메인 대시보드
│   ├── tax/                # 세금 관리
│   │   ├── income/         # 수입 입력
│   │   ├── expense/        # 지출 입력
│   │   └── report/         # 신고서 생성
│   ├── contracts/          # 계약 관리
│   │   ├── upload/         # 계약서 업로드
│   │   └── [id]/           # 계약서 상세
│   ├── invoices/           # 인보이스 관리
│   └── analytics/          # 수익 분석
├── lib/
│   ├── ai/
│   │   ├── contract-analyzer.ts   # 계약서 AI 분석
│   │   ├── tax-advisor.ts         # 세금 AI 어드바이저
│   │   ├── receipt-ocr.ts         # 영수증 OCR
│   │   └── income-predictor.ts    # 수익 예측
│   ├── services/
│   │   ├── tax-service.ts         # 세금 계산 로직
│   │   ├── contract-service.ts    # 계약 관리 로직
│   │   └── invoice-service.ts     # 인보이스 로직
│   ├── db.ts                      # Supabase 클라이언트
│   └── types.ts                   # 전체 타입 정의
├── PROJECT_OVERVIEW.md
├── WORKFLOW.md
└── database_schema.sql
```
