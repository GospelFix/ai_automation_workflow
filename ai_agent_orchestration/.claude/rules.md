# 프로젝트 핵심 규칙 요약

> AI Agent Orchestration — PM(Claude) → Designer(Gemini) → Dev(Codex) → QA(GPT-4o) 멀티 에이전트 파이프라인

---

## 기술 스택

| 기술 | 버전 | 비고 |
|------|------|------|
| TypeScript | 5 | strict 모드 |
| @anthropic-ai/sdk | 최신 | PM 에이전트 (Claude Haiku) |
| @google/generative-ai | 최신 | Designer 에이전트 (Gemini 2.0 Flash) |
| openai | 최신 | Dev(Codex) + QA(GPT-4o) 에이전트 |
| ts-node | 최신 | 실행 환경 |

---

## 파이프라인 계층 규칙

```
PM(Claude Haiku) → Designer(Gemini) → Dev(Codex) → QA(GPT-4o)
```

- 각 에이전트는 반드시 `BaseAgent`를 상속
- `callModel()` 메서드만 구현하면 됨
- 순방향 컨텍스트 누적 (이전 산출물이 다음 에이전트에 자동 전달)
- 역방향 참조 금지 ❌ (QA → Dev 직접 호출 불가)

### 에이전트 위치

- `src/agents/base-agent.ts` — 공통 BaseAgent 추상 클래스 (수정 최소화)
- `src/agents/pm-agent.ts` — PM 에이전트 (Anthropic SDK)
- `src/agents/designer-agent.ts` — Designer 에이전트 (Google Generative AI SDK)
- `src/agents/dev-agent.ts` — Dev 에이전트 (OpenAI Responses API)
- `src/agents/qa-agent.ts` — QA 에이전트 (OpenAI Chat Completions)

---

## 에이전트 파일 표준 구조

```
src/agents/
├── base-agent.ts      # 공통 BaseAgent 추상 클래스
├── pm-agent.ts        # PM 에이전트
├── designer-agent.ts  # Designer 에이전트
├── dev-agent.ts       # Dev 에이전트
└── qa-agent.ts        # QA 에이전트

prompts/
├── pm.md              # PM 시스템 프롬프트
├── designer.md        # Designer 시스템 프롬프트
├── dev.md             # Dev 시스템 프롬프트
└── qa.md              # QA 시스템 프롬프트
```

---

## TypeScript 규칙

- `any` 직접 사용 금지 → `unknown` 또는 제네릭 활용
- 에이전트·파이프라인 타입은 `src/types.ts`에 중앙 정의
- 클래스는 `BaseAgent`를 상속하는 방식으로만 추가
- `as any`, `as unknown as` 캐스팅 최소화

---

## SDK별 API 호출 방식

| 에이전트 | SDK | API |
|---------|-----|-----|
| PM | `@anthropic-ai/sdk` | `messages.create()` |
| Designer | `@google/generative-ai` | `getGenerativeModel().generateContent()` |
| Dev | `openai` | `responses.create()` (**Responses API**, `chat.completions` 아님) |
| QA | `openai` | `chat.completions.create()` |

> **중요:** Dev 에이전트(`codex-mini-latest`)는 반드시 `responses.create()` 사용.
> 파라미터명: `instructions`, `input`, `max_output_tokens` (Chat Completions와 다름)

---

## 시스템 프롬프트 규칙 (prompts/*.md)

- 페르소나 명확히 정의 (역할, 어조, 출력 분량)
- 출력 형식을 마크다운으로 지정
- 이전 에이전트 산출물 참조 지침 포함
- 파일명: `{에이전트명}.md` (소문자)
- 분량 배율: PM ×1.25 / Designer ×1.0 / Dev ×0.75 / QA ×1.0

---

## 에이전트 팀

| 에이전트 | 역할 |
|---------|------|
| `pipeline-designer` | 새 에이전트/기능 설계 가이드 |
| `agent-scaffolder` | 에이전트 파일 자동 생성 |
| `prompt-writer` | 시스템 프롬프트 파일 작성 |
| `code-reviewer` | TypeScript·API 코드 품질 검토 |
| `pipeline-tester` | 파이프라인 통합 테스트 작성 |
| `pipeline-validator` | 컨텍스트 흐름 및 출력 검증 |
| `cost-analyzer` | API 비용·속도 최적화 분석 |
| `api-checker` | SDK API 호출 방식 검사 |
| `prompt-linter` | 시스템 프롬프트 일관성 검사 |

---

## 검증 스킬 실행

```bash
# 에이전트 개발 (서브에이전트 팀 자동 조율)
/develop <구현 내용>
# 예시
/develop pm 에이전트에 스트리밍 응답 추가
/develop 새 reviewer 에이전트 추가 (Perplexity API)
/develop QA 에이전트 출력 포맷 JSON 변환

# 모든 검증 실행
/verify-implementation

# 개별 스킬 실행
/verify-pipeline-flow
/verify-agent-structure
/verify-typescript-quality
/verify-prompt-conventions
/verify-output-coverage
/verify-api-efficiency
/verify-security

# 스킬 유지보수
/manage-skills
```

---

## 산출물 규칙

실행마다 `outputs/YYYY-MM-DDTHH-MM-SS/` 폴더에 저장:

- `PRD.md` — PM 산출물
- `DESIGN.md` — Designer 산출물
- `TECH_SPEC.md` — Dev 산출물
- `TEST_PLAN.md` — QA 산출물
- `PIPELINE_SUMMARY.json` — 실행 시간·비용 메타데이터
