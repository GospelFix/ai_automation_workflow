---
name: verify-agent-structure
description: 에이전트 파일 구조와 export 패턴을 검사합니다. 신규 에이전트 추가 후 또는 파일 구조 감사 시 사용.
---

# 에이전트 파일 구조 검증

## Purpose

1. 에이전트 파일명 컨벤션 확인 (`{name}-agent.ts`)
2. 대응하는 시스템 프롬프트 파일 존재 확인 (`prompts/{name}.md`)
3. `AGENT_CONFIGS` 배열에 에이전트 등록 여부 확인
4. export 패턴 확인 (named export)
5. 에이전트 클래스명 컨벤션 확인 (PascalCase)

## When to Run

- 새 에이전트를 추가한 후
- 에이전트 파일 리네임 후
- 파이프라인 구조 감사 시
- Pull Request 생성 전

## Related Files

| File | Purpose |
|------|---------|
| `src/agents/` | 에이전트 구현 파일들 |
| `prompts/` | 시스템 프롬프트 파일들 |
| `src/config.ts` | AGENT_CONFIGS 배열 |
| `src/pipeline.ts` | createAgent() 팩토리 |

## Workflow

### Step 1: 에이전트 파일명 컨벤션 확인

**도구:** Glob
**검사:** 에이전트 파일이 `{name}-agent.ts` 형식인지 확인

```bash
# 에이전트 파일 목록
ls src/agents/ | grep -v "base-agent"

# 잘못된 파일명 탐지 (대문자, 언더스코어, -agent 미포함)
ls src/agents/ | grep -v "base-agent" | grep -vE "^[a-z]+-agent\.ts$"
```

**PASS:** 모든 파일이 `kebab-case-agent.ts` 형식
**FAIL:** 대문자 또는 언더스코어 포함 파일명 발견

### Step 2: 프롬프트 파일 대응 확인

**도구:** Bash
**검사:** `src/agents/`의 에이전트마다 `prompts/`에 대응 파일 존재 여부

```bash
# 에이전트명 목록 추출 (base-agent 제외)
ls src/agents/ | grep -v "base-agent" | sed 's/-agent.ts//'

# prompts 폴더 내 파일 목록
ls prompts/
```

**PASS:** 모든 에이전트에 `prompts/{name}.md` 존재
**FAIL:** 대응 프롬프트 파일 없음

### Step 3: AGENT_CONFIGS 등록 확인

**도구:** Grep
**검사:** `src/config.ts`에 모든 에이전트가 등록되어 있는지 확인

```bash
# AGENT_CONFIGS의 name 목록
grep -n "name:" src/config.ts

# 에이전트 파일과 비교 가능한 개수 확인
grep -c "name:" src/config.ts
```

**PASS:** 파일 수 = AGENT_CONFIGS 항목 수
**FAIL:** 파일은 있지만 AGENT_CONFIGS에 미등록

### Step 4: export 패턴 확인

**도구:** Grep
**검사:** 에이전트 클래스가 named export로 내보내지는지 확인

```bash
# export class 패턴 확인
grep -rn "^export class" src/agents/ --include="*.ts" | grep -v "BaseAgent"
```

**PASS:** 모든 에이전트가 `export class`로 내보내짐
**FAIL:** `export default` 또는 export 없음

### Step 5: 클래스명 컨벤션 확인

**도구:** Grep
**검사:** 에이전트 클래스명이 PascalCase인지 확인

```bash
# 클래스명 추출
grep -rn "class.*extends BaseAgent" src/agents/ --include="*.ts"
```

**PASS:** PascalCase (`PmAgent`, `DesignerAgent`, `DevAgent`, `QaAgent`)
**FAIL:** 소문자 또는 스네이크케이스 사용

## Output Format

```markdown
### verify-agent-structure 결과

| 검사 항목 | 상태 | 발견 건수 | 세부 내용 |
|----------|------|---------|---------|
| 파일명 컨벤션 | ✅ PASS / ❌ FAIL | N건 | 잘못된 파일명 목록 |
| 프롬프트 대응 | ✅ PASS / ❌ FAIL | N건 | 누락 파일 목록 |
| AGENT_CONFIGS 등록 | ✅ PASS / ❌ FAIL | N건 | 미등록 에이전트 |
| export 패턴 | ✅ PASS / ❌ FAIL | N건 | 잘못된 export 파일 |
| 클래스명 컨벤션 | ✅ PASS / ⚠️ WARNING | N건 | 잘못된 클래스명 |
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **base-agent.ts** — 추상 클래스이므로 구조 검사 제외
2. **테스트 파일** — `*.test.ts` 파일은 구조 검사 제외
3. **types.ts, config.ts, pipeline.ts** — 에이전트 클래스 파일이 아님
4. **모델 헬퍼 파일** — 에이전트 폴더 내 유틸리티 파일은 `-agent.ts` 명명 불필요
