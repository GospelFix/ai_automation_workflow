# AI 멀티 에이전트 파이프라인

기존 에이전시의 업무 흐름(PM → Designer → Dev → QA)을 AI 에이전트로 자동화하는 파이프라인입니다.

## 에이전트 구성

| 역할 | 모델 | 특성 | 산출물 |
|------|------|------|-------|
| PM | `claude-haiku-4-5-20251001` | 단호하고 명확, 분량 ×1.25 | `PRD.md` |
| Designer | `gemini-2.0-flash` | 실용적·균형감 | `DESIGN.md` |
| Dev | `codex-mini-latest` | 겸손하고 꼼꼼, 분량 ×0.75 | `TECH_SPEC.md` |
| QA | `gpt-4o` | 팀장급, 꼼꼼한 검증 | `TEST_PLAN.md` |

## 파이프라인 흐름

```
사용자 입력 (프로젝트 요구사항)
    ↓
[1단계] PM 에이전트 → PRD.md
    ↓ (컨텍스트 누적)
[2단계] Designer 에이전트 → DESIGN.md
    ↓ (컨텍스트 누적)
[3단계] Dev 에이전트 → TECH_SPEC.md
    ↓ (컨텍스트 누적)
[4단계] QA 에이전트 → TEST_PLAN.md
    ↓
outputs/타임스탬프/ 에 저장
```

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일 열어서 API 키 입력
```

필요한 API 키:
- `ANTHROPIC_API_KEY`: [Anthropic Console](https://console.anthropic.com)
- `OPENAI_API_KEY`: [OpenAI Platform](https://platform.openai.com)
- `GOOGLE_API_KEY`: [Google AI Studio](https://aistudio.google.com)

### 3. 파이프라인 실행

```bash
npx ts-node src/pipeline.ts "프로젝트 요구사항을 자연어로 입력"
```

### 실행 예시

```bash
npx ts-node src/pipeline.ts "주식 실시간 정보 알림 봇을 만들어줘. React + Node.js 기반으로, Naver 금융 API를 활용해서 관심 종목 가격 변화 시 Telegram으로 알림을 보내는 서비스"
```

## 산출물

실행 후 `outputs/YYYY-MM-DDTHH-MM-SS/` 폴더에 저장됩니다:

```
outputs/
└── 2026-02-28T12-00-00/
    ├── PRD.md              # 제품 요구사항 문서
    ├── DESIGN.md           # UI/UX 설계 문서
    ├── TECH_SPEC.md        # 기술 명세 + 코드
    ├── TEST_PLAN.md        # 테스트 계획
    ├── code/               # Dev 에이전트 생성 코드
    └── PIPELINE_SUMMARY.json  # 실행 요약
```

## 디렉토리 구조

```
ai_agent_orchestration/
├── src/
│   ├── pipeline.ts          # 메인 오케스트레이터
│   ├── config.ts            # 에이전트 설정
│   ├── types.ts             # TypeScript 타입
│   └── agents/
│       ├── base-agent.ts    # 공통 에이전트 인터페이스
│       ├── pm-agent.ts      # PM (Anthropic)
│       ├── designer-agent.ts # Designer (Google)
│       ├── dev-agent.ts     # Dev (OpenAI Codex)
│       └── qa-agent.ts      # QA (OpenAI GPT-4o)
├── prompts/
│   ├── pm.md
│   ├── designer.md
│   ├── dev.md
│   └── qa.md
├── outputs/
├── .env.example
├── package.json
└── tsconfig.json
```
