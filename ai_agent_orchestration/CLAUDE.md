---
name: main
description: PM(Claude Haiku) → Designer(Gemini) → Dev(Codex) → QA(GPT-4o) 순차 파이프라인. 진입점은 src/pipeline.ts, 에이전트 설정은 src/config.ts의 AGENT_CONFIGS, 시스템 프롬프트는 prompts/*.md. Dev 에이전트는 Chat Completions가 아닌 Responses API(client.responses.create) 사용 주의.
updated: 2026-02-28
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 명령어

```bash
# 파이프라인 실행 (메인 진입점)
npx ts-node src/pipeline.ts "프로젝트 요구사항 자연어 입력"

# TypeScript 컴파일 확인 (오류 없이 종료되면 정상)
npx tsc --noEmit

# 빌드
npm run build
```

## 환경 설정

`.env.example`을 `.env`로 복사 후 API 키 3개 입력 필요:

- `ANTHROPIC_API_KEY` — PM 에이전트 (Claude Haiku)
- `OPENAI_API_KEY` — Dev(Codex) + QA(GPT-4o) 에이전트
- `GOOGLE_API_KEY` — Designer 에이전트 (Gemini)

## 아키텍처

4개의 AI 에이전트가 순차 실행되며, 각 에이전트의 산출물이 다음 에이전트의 컨텍스트로 자동 누적된다.

```
사용자 입력 → PM(Claude) → Designer(Gemini) → Dev(Codex) → QA(GPT-4o) → outputs/타임스탬프/
```

### 컨텍스트 누적 방식

`PipelineContext.outputs`(Record\<string, string\>)에 산출물이 순서대로 쌓인다. `BaseAgent.buildPrompt()`가 이전 산출물 전체를 사용자 프롬프트에 마크다운으로 삽입한다. 따라서 QA 에이전트는 PRD + DESIGN + TECH_SPEC 세 문서를 모두 받는다.

### 에이전트 추가 방법

1. `src/agents/`에 `BaseAgent`를 상속받는 클래스 생성 — `callModel()`만 구현하면 됨
2. `src/config.ts`의 `AGENT_CONFIGS` 배열에 설정 추가
3. `src/pipeline.ts`의 `createAgent()` 팩토리 함수에 분기 추가
4. `prompts/`에 해당 에이전트의 시스템 프롬프트 파일 추가

### SDK별 API 호출 방식

| 에이전트 | SDK                     | API                                      |
| -------- | ----------------------- | ---------------------------------------- |
| PM       | `@anthropic-ai/sdk`     | `messages.create()`                      |
| Designer | `@google/generative-ai` | `getGenerativeModel().generateContent()` |
| Dev      | `openai`                | `responses.create()` (Responses API)     |
| QA       | `openai`                | `chat.completions.create()`              |

> Dev 에이전트(`codex-mini-latest`)는 Chat Completions가 아닌 **Responses API**를 사용한다. `client.responses.create()`이며 파라미터명이 다름(`instructions`, `input`, `max_output_tokens`).

### 산출물

실행마다 `outputs/YYYY-MM-DDTHH-MM-SS/` 폴더가 생성되고 아래 파일이 저장됨:

- `PRD.md`, `DESIGN.md`, `TECH_SPEC.md`, `TEST_PLAN.md`
- `code/` — Dev 에이전트가 생성하는 코드 파일 저장 위치
- `PIPELINE_SUMMARY.json` — 실행 시간, 에이전트별 소요 시간 등 메타데이터

### 에이전트 직급별 특성 (시스템 프롬프트)

각 에이전트의 페르소나와 출력 분량은 `prompts/*.md`에서 정의된다:

- PM: 단호하고 명확, 분량 ×1.25
- Designer: 실용적·균형감, 기본 분량
- Dev: 겸손하고 꼼꼼, 분량 ×0.75 (핵심에 집중)
- QA: 팀장급, 꼼꼼한 검증

`AgentConfig.tokenMultiplier`는 프롬프트에 명시된 의도를 나타내는 메타데이터이며, 현재 실제 토큰 수 계산에는 사용되지 않는다.
