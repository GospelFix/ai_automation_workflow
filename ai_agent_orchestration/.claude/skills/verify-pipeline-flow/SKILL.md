---
name: verify-pipeline-flow
description: 파이프라인 에이전트 의존성 위반과 컨텍스트 흐름 규칙을 검사합니다. 신규 에이전트 추가 후, PR 전, 아키텍처 검증 시 사용.
---

# 파이프라인 흐름 검증

## Purpose

1. 에이전트 간 역방향 의존성 위반 탐지 (QA → PM 직접 호출 금지)
2. `BaseAgent` 미상속 에이전트 탐지
3. `createAgent()` 팩토리 함수와 `AGENT_CONFIGS` 불일치 탐지
4. 파이프라인 실행 순서 확인 (`src/pipeline.ts`)
5. 컨텍스트 누적 방식 (`buildPrompt()`) 검증

## When to Run

- 새 에이전트를 추가한 후
- `src/config.ts` 또는 `src/pipeline.ts` 수정 후
- Pull Request 생성 전
- 파이프라인 실행 순서 이상 의심 시

## Related Files

| File | Purpose |
|------|---------|
| `src/pipeline.ts` | 파이프라인 실행 순서 정의 |
| `src/config.ts` | AGENT_CONFIGS 배열 |
| `src/agents/base-agent.ts` | BaseAgent 추상 클래스 |
| `src/agents/pm-agent.ts` | PM 에이전트 |
| `src/agents/designer-agent.ts` | Designer 에이전트 |
| `src/agents/dev-agent.ts` | Dev 에이전트 |
| `src/agents/qa-agent.ts` | QA 에이전트 |
| `src/types.ts` | 파이프라인 타입 정의 |

## Workflow

### Step 1: BaseAgent 상속 확인

**도구:** Grep
**검사:** 모든 에이전트 클래스가 `BaseAgent`를 상속하는지 확인

```bash
# 에이전트 클래스 목록
grep -rn "class.*Agent" src/agents/ --include="*.ts" | grep -v "BaseAgent\|abstract"

# BaseAgent 미상속 탐지
grep -rn "class.*Agent" src/agents/ --include="*.ts" | grep -v "extends BaseAgent\|abstract class"
```

**PASS:** 모든 에이전트가 `extends BaseAgent` 포함
**FAIL:** `extends BaseAgent` 없는 에이전트 발견

**수정 방법:**
```typescript
// ❌ 위반
class NewAgent { ... }

// ✅ 수정
class NewAgent extends BaseAgent {
  protected async callModel(prompt: string): Promise<string> { ... }
}
```

### Step 2: 역방향 의존성 위반 탐지

**도구:** Grep
**검사:** 하위 에이전트에서 상위 에이전트를 직접 import하는 위반 탐지

```bash
# Designer가 PM을 import하는 위반
grep -rn "from.*pm-agent" src/agents/designer-agent.ts src/agents/dev-agent.ts src/agents/qa-agent.ts

# Dev가 Designer를 import하는 위반
grep -rn "from.*designer-agent" src/agents/dev-agent.ts src/agents/qa-agent.ts

# QA가 Dev를 import하는 위반
grep -rn "from.*dev-agent" src/agents/qa-agent.ts
```

**PASS:** 결과 없음 (에이전트 간 직접 import 없음)
**FAIL:** 역방향 import 발견 → 컨텍스트는 `PipelineContext`를 통해서만 전달

### Step 3: AGENT_CONFIGS와 createAgent() 동기화 확인

**도구:** Grep
**검사:** `config.ts`의 에이전트 수와 `pipeline.ts`의 분기 수 일치 여부

```bash
# config.ts의 에이전트 수 확인
grep -c "name:" src/config.ts

# pipeline.ts의 createAgent 분기 확인
grep -n "case\|AgentName\|return new" src/pipeline.ts
```

**PASS:** 설정된 에이전트 수 = 팩토리 분기 수
**FAIL:** 불일치 → 새 에이전트 추가 시 `createAgent()` 분기 누락 가능성

### Step 4: callModel() 구현 확인

**도구:** Grep
**검사:** `BaseAgent`를 상속하는 모든 에이전트가 `callModel()`을 구현하는지 확인

```bash
# callModel 구현 확인
grep -rn "callModel" src/agents/ --include="*.ts" | grep -v "abstract\|protected callModel"
```

**PASS:** 모든 에이전트에 `callModel()` 구현 존재
**FAIL:** 구현 없음 → 런타임 에러 발생

### Step 5: 컨텍스트 누적 확인

**도구:** Read
**검사:** `base-agent.ts`의 `buildPrompt()`가 이전 산출물을 올바르게 누적하는지 확인

```bash
grep -n "buildPrompt\|outputs\|PipelineContext" src/agents/base-agent.ts
```

**PASS:** `buildPrompt()`에서 `context.outputs`를 순회하여 이전 산출물 포함
**FAIL:** 컨텍스트 누적 로직 없음 → 에이전트 간 정보 전달 불가

## Output Format

```markdown
### verify-pipeline-flow 결과

| 검사 항목 | 상태 | 발견 건수 | 세부 내용 |
|----------|------|---------|---------|
| BaseAgent 상속 | ✅ PASS / ❌ FAIL | N건 | 미상속 클래스 목록 |
| 역방향 의존성 | ✅ PASS / ❌ FAIL | N건 | 위반 import 파일:라인 |
| AGENT_CONFIGS 동기화 | ✅ PASS / ❌ FAIL | — | 불일치 에이전트 이름 |
| callModel() 구현 | ✅ PASS / ❌ FAIL | N건 | 미구현 에이전트 목록 |
| 컨텍스트 누적 | ✅ PASS / ❌ FAIL | — | buildPrompt 로직 상태 |
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **BaseAgent 자체** — `abstract class BaseAgent`는 상속 검사에서 제외
2. **타입 import** — `import type { AgentConfig }` 같은 타입만 import는 허용 (런타임 의존성 아님)
3. **테스트 파일** — `*.test.ts`에서의 에이전트 import는 검사 제외
4. **config.ts import** — 에이전트 파일에서 `config.ts`를 import하는 것은 허용 (공통 설정)
5. **pipeline.ts** — `pipeline.ts`에서 모든 에이전트를 import하는 것은 정상 (팩토리 역할)
