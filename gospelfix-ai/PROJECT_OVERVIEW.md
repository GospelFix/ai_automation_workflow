# Gospel Fix AI 자동화 솔루션 - 프로젝트 개요

**작성일**: 2026년 2월 27일
**목표 완성일**: 2026년 3월 5일 (중진공 상담 전)

---

## 프로젝트 소개

Gospel Fix AI 자동화 솔루션은 중소기업 및 자영업자를 위한 **이메일 자동 응답**과 **데이터 자동 분류** AI 서비스입니다.

기존 SI 업체 대비 **개발 기간 1/10 단축**, **비용 절감 60~70%** 를 목표로 합니다.

---

## 핵심 기능

### 1. 이메일 자동 응답 AI
- Gmail 수신 이메일을 실시간으로 감지
- OpenAI가 이메일 내용을 분석하여 자동 응답 생성
- 응답 발송 이력 및 통계를 대시보드에서 관리
- **예상 효과**: 월 40시간 업무 절감

### 2. 데이터 자동 분류
- CSV / JSON 파일 업로드 후 AI가 자동 분류
- 배치 처리로 대량 데이터도 빠르게 처리
- 분류 결과를 MySQL에 저장하고 다운로드 가능
- **예상 효과**: 분류 정확도 90% 이상

### 3. 자동화 스케줄러 (Cron Jobs)
- 매시간: Gmail 새 이메일 동기화 및 미응답 처리
- 매일 자정: 대기 중인 데이터 일괄 분류 및 리포트 생성

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | Next.js 14 (App Router), React, TypeScript, TailwindCSS |
| 백엔드 | Next.js API Routes, Node.js |
| 데이터베이스 | MySQL 8.4.3 |
| AI | OpenAI API (gpt-3.5-turbo) |
| 이메일 | Gmail API (OAuth 2.0) |
| 스케줄러 | node-cron |

---

## 아키텍처

```
사용자 (대시보드 UI)
        ↓
Next.js App Router (프론트 + API 라우트)
        ↓
비즈니스 로직 (lib/)
        ↓
외부 API           MySQL 데이터베이스
(OpenAI, Gmail)
```

---

## 프로젝트 구조

```
gospelfix-ai/
├── AI_AUTOMATION_WORKFLOW.md   # 전체 아키텍처 & 워크플로우 상세
├── FINAL_GUIDE.md              # 프로젝트 완성 가이드 (파일 목록, 단계별 계획)
├── PROJECT_OVERVIEW.md         # 이 파일 - 프로젝트 전체 요약
├── PROJECT_STRUCTURE.md        # 디렉토리 구조 상세 설명
├── QUICK_START.md              # 4~6시간 MVP 완성 가이드
├── config_files.txt            # 설정 파일 목록
├── database_schema.sql         # MySQL 테이블 스키마
│
├── lib_db.example.ts           # MySQL 연결 예제 코드
├── lib_openai.example.ts       # OpenAI API 연동 예제 코드
├── lib_email_service.example.ts # 이메일 자동 응답 로직 예제
├── lib_classify_service.example.ts # 데이터 분류 로직 예제
└── types_index.example.ts      # TypeScript 타입 정의 예제
```

### 실제 구현 시 디렉토리 구조 (MVP 기준)

```
gospel-fix-automation/
├── app/
│   ├── api/
│   │   ├── emails/             # 이메일 목록 조회, 자동 응답, 웹훅
│   │   ├── classify/           # 데이터 분류, 배치 분류
│   │   ├── cron/               # 이메일 동기화, 배치 분류 스케줄
│   │   └── auth/               # Gmail OAuth 인증
│   └── dashboard/
│       ├── emails/             # 이메일 자동 응답 관리 페이지
│       └── data-classify/      # 데이터 분류 관리 페이지
├── lib/
│   ├── db.ts                   # MySQL 연결
│   ├── openai.ts               # OpenAI 클라이언트
│   ├── gmail.ts                # Gmail 클라이언트
│   ├── email-service.ts        # 이메일 자동 응답 로직
│   └── classify-service.ts     # 데이터 분류 로직
├── components/                 # React 컴포넌트
├── types/                      # TypeScript 타입 정의
└── database/
    └── schema.sql              # MySQL 스키마
```

---

## 데이터베이스 테이블

| 테이블 | 설명 |
|---|---|
| `emails` | 수신 이메일 및 자동 응답 이력 |
| `classifications` | 데이터 분류 결과 |
| `api_tokens` | Gmail OAuth 토큰 관리 |
| `automation_logs` | 자동화 실행 로그 |

---

## 환경 변수 목록

```env
OPENAI_API_KEY=          # OpenAI API 키
GMAIL_CLIENT_ID=         # Gmail OAuth 클라이언트 ID
GMAIL_CLIENT_SECRET=     # Gmail OAuth 클라이언트 시크릿
GMAIL_REDIRECT_URI=      # OAuth 콜백 URL
DB_HOST=                 # MySQL 호스트 (기본: localhost)
DB_USER=                 # MySQL 사용자
DB_PASSWORD=             # MySQL 비밀번호
DB_NAME=                 # DB명 (gospel_fix_automation)
DB_PORT=                 # MySQL 포트 (기본: 3306)
NEXT_PUBLIC_API_URL=     # API 기본 URL
```

---

## 성공 지표 (MVP 기준)

- API 응답 시간: **2초 이내**
- 이메일 자동 응답률: **95% 이상**
- 데이터 분류 정확도: **90% 이상**
- 월 운영 비용: **50만원 이하**

---

## 비즈니스 포지셔닝

| 구분 | 기존 SI | Gospel Fix |
|---|---|---|
| 개발 기간 | 4~6개월 | 1~2주 |
| 비용 | 1억~2억원 | 3천만~1억원 |
| 마진 | 10~20% | 40~50% |

---

## 개발 로드맵

### 1주차 - 핵심 기능 구현
- Next.js 프로젝트 초기화 및 MySQL 연결
- Gmail OAuth 구현
- OpenAI API 통합
- 이메일 자동 응답 및 데이터 분류 기본 구현

### 2주차 - 대시보드 & 배포
- 대시보드 UI 구현
- Cron Job 설정
- 에러 핸들링 및 로깅
- Vercel 배포

---

## 관련 문서

| 문서 | 내용 |
|---|---|
| [AI_AUTOMATION_WORKFLOW.md](./AI_AUTOMATION_WORKFLOW.md) | 전체 아키텍처, 워크플로우, DB 스키마 상세 |
| [QUICK_START.md](./QUICK_START.md) | 단계별 구현 가이드 (4~6시간 완성) |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | 디렉토리 구조 및 파일 역할 설명 |
| [FINAL_GUIDE.md](./FINAL_GUIDE.md) | 전체 완성 체크리스트 및 데모 시나리오 |
