---
name: develop
description: 서브에이전트를 활용하여 파이프라인 기능을 end-to-end로 구현합니다. 새 에이전트 추가, 기능 구현, 버그 수정 등 모든 개발 작업 시 사용.
argument-hint: "<구현할 기능 설명> (예: 새 reviewer 에이전트 추가, pm 에이전트에 스트리밍 추가)"
---

> **구현 요청:** $ARGUMENTS
>
> 위 요청에 대해 아래 워크플로우를 순서대로 실행하세요. 인수가 없으면 `AskUserQuestion`으로 구현 내용을 먼저 질문합니다.

# 파이프라인 기능 구현 오케스트레이터

## 목적

서브에이전트 팀을 조율하여 파이프라인 기능을 **설계 → 구현 → 검증** 3단계로 완성합니다.
모든 구현은 프로젝트 규칙(`.claude/rules.md`)과 검증 스킬(`verify-*`)을 기준으로 진행됩니다.

---

## 워크플로우

### Step 0: 규칙 및 스킬 사전 로딩

구현 시작 전, 반드시 다음 파일들을 읽어 규칙을 내면화합니다.

#### 0a. 프로젝트 핵심 규칙 로딩

```bash
cat .claude/rules.md
```

#### 0b. 관련 검증 스킬 참조

구현 내용에 따라 아래 스킬 파일을 읽어 **위반하지 말아야 할 패턴**을 파악합니다:

| 구현 유형 | 반드시 읽어야 할 스킬 |
|---------|---------------------|
| 신규 에이전트 추가 | `verify-pipeline-flow`, `verify-agent-structure`, `verify-prompt-conventions`, `verify-api-efficiency` |
| 프롬프트 수정 | `verify-prompt-conventions` |
| TypeScript 수정 | `verify-typescript-quality` |
| API 호출 방식 변경 | `verify-api-efficiency`, `verify-security` |
| 모든 구현 | `verify-typescript-quality` (항상 포함) |

사전 로딩이 완료되면 다음을 표시합니다:

```markdown
## 규칙 로딩 완료

| 로딩 항목 | 내용 |
|---------|------|
| 프로젝트 규칙 | `.claude/rules.md` 로딩 완료 |
| 참조 스킬 | verify-pipeline-flow, verify-agent-structure, ... |

**주요 제약사항 요약:**
- 파이프라인 흐름: PM → Designer → Dev → QA (순방향 단방향)
- Dev 에이전트: responses.create() 사용 (chat.completions 금지)
- API 키: process.env.* 사용 (하드코딩 금지)
- 타입: src/types.ts에 중앙 정의
- 프롬프트: prompts/{name}.md 소문자 파일명
```

---

### Step 1: 요청 분석 및 구현 계획 수립

인수(argument)로 받은 구현 요청을 분석하여 어떤 서브에이전트가 필요한지 결정합니다.

#### 구현 유형 분류

```
신규 에이전트 추가
  → pipeline-designer + agent-scaffolder + prompt-writer

기존 에이전트 수정 (기능 추가/버그 수정)
  → (pipeline-designer 설계 검토) + 직접 구현 + prompt-writer (프롬프트 변경 시)

시스템 프롬프트 개선
  → prompt-linter 검사 + prompt-writer 수정

API 호출 방식 수정
  → api-checker 검사 + 직접 구현

복합 기능 (여러 에이전트 연동)
  → pipeline-designer + agent-scaffolder + prompt-writer (각 에이전트)
```

구현 계획을 사용자에게 표시합니다:

```markdown
## 구현 계획

**요청:** $ARGUMENTS

**구현 유형:** 신규 에이전트 / 기능 추가 / 버그 수정 / 프롬프트 개선

**투입 에이전트:**
1. `pipeline-designer` — 파이프라인 내 배치 및 구조 설계
2. `agent-scaffolder` — 에이전트 파일 자동 생성
3. `prompt-writer` — 시스템 프롬프트 작성
4. `verify-implementation` — 최종 검증 (7개 스킬)

**예상 생성/수정 파일:**
- `src/agents/{name}-agent.ts`
- `prompts/{name}.md`
- `src/config.ts` (AGENT_CONFIGS 수정)
- `src/pipeline.ts` (createAgent() 수정)
```

---

### Step 2: 설계 단계 (pipeline-designer 에이전트)

**신규 에이전트 또는 복잡한 기능 구현 시에만 실행합니다.**

Task 도구를 사용하여 `pipeline-designer` 에이전트를 호출합니다:

```
Task(
  subagent_type: "pipeline-designer",
  prompt: """
  다음 에이전트/기능을 파이프라인 아키텍처로 설계해주세요:
  [요청 내용]

  필요한 정보:
  1. 파이프라인 내 배치 위치 (기존 에이전트 전/후/독립)
  2. 파일 목록 (src/agents/, prompts/, config.ts 수정사항)
  3. callModel() 시그니처 및 반환 타입
  4. 컨텍스트 입력/출력 다이어그램

  규칙:
  - BaseAgent 반드시 상속
  - Dev 에이전트라면 responses.create() 사용
  - API 키는 process.env.* 사용
  """
)
```

---

### Step 3: 구현 단계

구현 유형에 따라 다음 중 하나를 실행합니다.

#### 3a. 신규 에이전트 — agent-scaffolder 에이전트

Task 도구를 사용하여 `agent-scaffolder` 에이전트를 호출합니다:

```
Task(
  subagent_type: "agent-scaffolder",
  prompt: """
  pipeline-designer의 설계를 바탕으로 다음 에이전트를 생성해주세요:

  에이전트명: [AgentName]
  SDK: [Anthropic / Google / OpenAI Responses / OpenAI Chat]
  파이프라인 위치: [PM 다음 / Designer 다음 / ...]
  출력 키: [OUTPUT_KEY]

  주의사항:
  - BaseAgent 상속 필수
  - Dev 에이전트: responses.create() (chat.completions 금지)
  - API 키: process.env.* 사용
  - src/config.ts, src/pipeline.ts도 함께 수정
  """
)
```

#### 3b. 기존 코드 수정 — 직접 구현

agent-scaffolder 없이 Claude 자신이 직접 파일을 수정합니다.

사전 로딩한 검증 스킬 규칙을 기준으로 구현하며:
- `verify-typescript-quality` 기준: any 금지, types.ts에 타입 정의
- `verify-api-efficiency` 기준: 적정 maxTokens, 모델 선택
- `verify-pipeline-flow` 기준: 순방향 의존성만 허용

---

### Step 4: 프롬프트 작성 (prompt-writer 에이전트)

신규 에이전트 또는 시스템 프롬프트 변경이 있는 경우 Task 도구로 `prompt-writer`를 호출합니다:

```
Task(
  subagent_type: "prompt-writer",
  prompt: """
  다음 에이전트의 시스템 프롬프트를 작성해주세요:

  에이전트명: [name]
  파이프라인 위치: [PM / Designer / Dev / QA 순서 내 위치]
  역할: [에이전트가 수행할 작업]
  출력물: [생성할 문서/코드]
  어조: [단호함 / 실용적 / 겸손함 / 꼼꼼함]
  분량 배율: [×0.75 / ×1.0 / ×1.25]

  요구사항:
  - 파일명: prompts/{name}.md (소문자)
  - 페르소나 명확히 정의
  - 출력 형식 (마크다운 섹션 구조) 명세
  - 이전 산출물 활용 지침 포함
  """
)
```

---

### Step 5: 코드 리뷰 (code-reviewer 에이전트, 선택)

복잡한 로직이 포함된 경우 Task 도구로 `code-reviewer`를 호출합니다:

```
Task(
  subagent_type: "code-reviewer",
  prompt: """
  구현된 다음 파일들을 리뷰해주세요:
  [구현된 파일 목록]

  집중 검토 항목:
  - SDK API 호출 방식 (Dev 에이전트: responses.create 여부)
  - TypeScript 타입 안전성 (any 사용 여부)
  - 보안 (API 키 하드코딩 여부)
  - BaseAgent 상속 및 callModel() 구현 여부
  """
)
```

---

### Step 6: 최종 검증 (verify-implementation 스킬)

구현이 완료되면 **반드시** `/verify-implementation`을 실행합니다.

`/verify-implementation` 스킬의 워크플로우를 따라 다음 7개 스킬을 순차 실행합니다:

1. `verify-pipeline-flow` — 파이프라인 흐름 및 의존성 위반 확인
2. `verify-agent-structure` — 에이전트 파일 구조 확인
3. `verify-typescript-quality` — 타입 품질 확인
4. `verify-prompt-conventions` — 시스템 프롬프트 컨벤션 확인
5. `verify-output-coverage` — 산출물 저장 검증
6. `verify-api-efficiency` — API 비용·속도 효율성 확인
7. `verify-security` — 보안 취약점 확인

---

### Step 7: 이슈 수정 및 완료 보고

#### 이슈가 없는 경우

```markdown
## 구현 완료

**구현 내용:** [요청 내용 요약]

**생성/수정된 파일:**
| 파일 | 유형 |
|------|------|
| `src/agents/{name}-agent.ts` | 신규 생성 |
| `prompts/{name}.md` | 신규 생성 |
| `src/config.ts` | 수정 |
| `src/pipeline.ts` | 수정 |

**검증 결과:**
- verify-pipeline-flow: ✅ PASS
- verify-agent-structure: ✅ PASS
- verify-typescript-quality: ✅ PASS
- verify-prompt-conventions: ✅ PASS
- verify-output-coverage: ✅ PASS
- verify-api-efficiency: ✅ PASS
- verify-security: ✅ PASS

코드 리뷰 및 PR 준비 완료!
```

---

## 서브에이전트 팀 요약

| 단계 | 에이전트 | 조건 |
|------|---------|------|
| 설계 | `pipeline-designer` | 신규 에이전트 또는 복잡한 기능 |
| 생성 | `agent-scaffolder` | 신규 에이전트 파일 생성 |
| 프롬프트 | `prompt-writer` | 신규 에이전트 또는 프롬프트 변경 |
| 리뷰 | `code-reviewer` | 복잡한 로직 포함 시 (선택) |
| API 검사 | `api-checker` | API 호출 방식 변경 시 (선택) |
| 검증 | `verify-implementation` | **항상 마지막에 실행** (필수) |

---

## 예시

### 예시 1: 신규 에이전트 추가

```
/develop reviewer 에이전트 추가. Perplexity API로 최신 정보 검색 후 PRD 보완
```

실행 순서: rules.md 로딩 → 스킬 참조 → pipeline-designer 설계 → agent-scaffolder 생성 → prompt-writer 프롬프트 → verify-implementation 검증

### 예시 2: 기존 에이전트 기능 추가

```
/develop PM 에이전트에 스트리밍 응답 추가
```

실행 순서: rules.md 로딩 → 스킬 참조 → 직접 구현 → code-reviewer 리뷰 → verify-implementation 검증

### 예시 3: 프롬프트 개선

```
/develop QA 에이전트 프롬프트 개선. 보안 테스트 시나리오 추가
```

실행 순서: rules.md 로딩 → verify-prompt-conventions 참조 → prompt-linter 검사 → prompt-writer 수정 → verify-implementation 검증

---

## 주의사항

1. **Step 0은 항상 실행** — rules.md와 관련 스킬을 읽지 않고 구현을 시작하지 않음
2. **Step 6은 항상 실행** — verify-implementation을 생략하지 않음
3. **Dev 에이전트 API 주의** — `responses.create()` 사용, `chat.completions` 절대 금지
4. **인수 없이 실행 시** — 사용자에게 구현 내용을 먼저 질문 (`AskUserQuestion` 사용)

---

## Related Files

| File | Purpose |
|------|---------|
| `.claude/rules.md` | 프로젝트 핵심 규칙 (항상 먼저 읽음) |
| `.claude/skills/verify-implementation/SKILL.md` | 최종 검증 실행기 |
| `.claude/skills/verify-pipeline-flow/SKILL.md` | 파이프라인 흐름 규칙 참조 |
| `.claude/skills/verify-agent-structure/SKILL.md` | 에이전트 구조 규칙 참조 |
| `.claude/skills/verify-typescript-quality/SKILL.md` | TypeScript 규칙 참조 |
| `.claude/skills/verify-prompt-conventions/SKILL.md` | 프롬프트 규칙 참조 |
| `.claude/agents/pipeline-designer.md` | 설계 에이전트 |
| `.claude/agents/agent-scaffolder.md` | 에이전트 생성 에이전트 |
| `.claude/agents/prompt-writer.md` | 프롬프트 작성 에이전트 |
| `.claude/agents/code-reviewer.md` | 코드 리뷰 에이전트 |
