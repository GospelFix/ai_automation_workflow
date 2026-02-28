---
name: orchestration
description: PM(Claude Haiku) → Designer(Gemini) → Dev(Codex) → QA(GPT-4o) 멀티 에이전트 파이프라인 실행
model: claude-sonnet-4-6
---

아래 순서로 멀티 에이전트 파이프라인 작업을 안내해줘.

## 1. 환경 확인
- `.env` 파일 존재 여부 확인 (없으면 `.env.example` 복사 안내)
- 필요한 API 키 3개 설정 여부 확인: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`
- `node_modules` 존재 여부 확인 (없으면 `npm install` 실행)

## 2. 프로젝트 요구사항 수집
사용자에게 파이프라인에 입력할 프로젝트 요구사항을 물어봐. 아직 요구사항을 제공하지 않았다면 예시를 보여줘:
```
예시: "주식 실시간 정보 알림 봇. React + Node.js 기반으로 Naver 금융 API를 활용해서 관심 종목 가격 변화 시 Telegram으로 알림을 보내는 서비스"
```

## 3. 파이프라인 실행
요구사항이 준비되면 다음 명령어를 실행해:
```bash
npx ts-node src/pipeline.ts "{{사용자가 입력한 요구사항}}"
```

## 4. 실행 중 진행 상황 안내
파이프라인이 실행되는 동안 각 에이전트 역할을 설명해줘:
- **[1/4] PM 에이전트** (Claude Haiku) → `PRD.md` 생성
- **[2/4] Designer 에이전트** (Gemini 2.0 Flash) → `DESIGN.md` 생성
- **[3/4] Dev 에이전트** (Codex) → `TECH_SPEC.md` 생성
- **[4/4] QA 에이전트** (GPT-4o) → `TEST_PLAN.md` 생성

## 5. 완료 후 산출물 안내
실행 완료 후 `outputs/타임스탬프/` 폴더의 생성된 파일들을 사용자에게 안내하고, 필요 시 각 문서 내용을 요약해줘.
