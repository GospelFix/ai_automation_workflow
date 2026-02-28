---
name: verify-typescript-quality
description: TypeScript 타입 품질과 strict 모드 준수 여부를 검사합니다. 코드 리뷰 전, PR 전, 타입 안전성 확인 시 사용.
---

# TypeScript 품질 검증

## Purpose

1. `any` 타입 직접 사용 탐지 (타입 안전성 위반)
2. `as any`, `as unknown as` 위험 캐스팅 탐지
3. 타입 정의가 `src/types.ts`에 중앙화되어 있는지 확인
4. 에이전트 파일 내 인라인 인터페이스 정의 탐지
5. TypeScript 컴파일 오류 확인

## When to Run

- 새 에이전트나 기능을 구현한 후
- Pull Request 생성 전
- TypeScript 오류 디버깅 시
- 코드 리뷰 중 타입 안전성 확인 시

## Related Files

| File | Purpose |
|------|---------|
| `src/types.ts` | 파이프라인 타입 중앙 정의 |
| `src/agents/*.ts` | 에이전트 구현 파일 |
| `src/config.ts` | AgentConfig 타입 사용 |
| `src/pipeline.ts` | PipelineContext 타입 사용 |
| `tsconfig.json` | TypeScript 컴파일 설정 |

## Workflow

### Step 1: any 타입 직접 사용 탐지

**도구:** Grep
**검사:** `any` 타입 직접 사용 탐지

```bash
# ': any' 패턴 탐지
grep -rn ": any" src/ --include="*.ts"

# '= any' 패턴 탐지
grep -rn "= any;" src/ --include="*.ts"
```

**PASS:** 결과가 없을 때
**FAIL:** `any` 타입 직접 사용 발견 시

**수정 방법:**
```typescript
// ❌ 위반
const handleResponse = (data: any) => { ... }

// ✅ 수정
const handleResponse = (data: unknown) => { ... }
const handleResponse = <T>(data: T) => { ... }
```

### Step 2: 위험한 타입 캐스팅 탐지

**도구:** Grep
**검사:** `as any`, `as unknown as` 캐스팅 패턴 탐지

```bash
# as any 탐지
grep -rn " as any" src/ --include="*.ts"

# as unknown as 탐지
grep -rn " as unknown as " src/ --include="*.ts"
```

**PASS:** 결과가 없을 때
**FAIL:** 위험한 캐스팅 발견 시 (타입 시스템 우회)

### Step 3: 인라인 인터페이스 정의 탐지

**도구:** Grep
**검사:** `src/types.ts` 외부에 인터페이스를 정의하는 코드 탐지

```bash
# 에이전트 파일에서 직접 인터페이스 정의 탐지
grep -rn "^interface\|^type.*=" src/agents/ --include="*.ts"

# config.ts, pipeline.ts에서 인터페이스 정의 탐지 (types.ts에 분리해야 함)
grep -rn "^export interface\|^export type" src/config.ts src/pipeline.ts
```

**PASS:** 결과가 없거나 소수에 불과할 때
**권장:** `AgentConfig`, `PipelineContext` 등 공유 타입은 `src/types.ts`에 중앙 정의

### Step 4: TypeScript 컴파일 확인

**도구:** Bash
**검사:** TypeScript 컴파일 오류 없이 종료되는지 확인

```bash
npx tsc --noEmit
```

**PASS:** 오류 없이 종료
**FAIL:** 컴파일 오류 발생 → 오류 메시지 기반 수정 필요

### Step 5: import type 사용 확인

**도구:** Grep
**검사:** 타입만 import할 때 `import type` 키워드 사용 여부

```bash
# 타입 import에서 import type 미사용 탐지
grep -rn "^import {.*Config\|^import {.*Context\|^import {.*Type" src/ --include="*.ts" | grep -v "import type"
```

**권장:** `import type { AgentConfig }` 형식 사용 (번들 크기 최적화)

## Output Format

```markdown
### verify-typescript-quality 결과

| 검사 항목 | 상태 | 발견 건수 | 세부 내용 |
|----------|------|---------|---------|
| any 타입 직접 사용 | ✅ PASS / ❌ FAIL | N건 | 파일:라인 목록 |
| 위험한 캐스팅 (as any) | ✅ PASS / ❌ FAIL | N건 | 파일:라인 목록 |
| 인라인 인터페이스 | ✅ PASS / ⚠️ WARNING | N건 | 파일 목록 |
| TypeScript 컴파일 | ✅ PASS / ❌ FAIL | — | 오류 메시지 |
| import type 사용 | ✅ PASS / ⚠️ WARNING | N건 | 파일 목록 |
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **외부 라이브러리 타입** — SDK에서 오는 `any` 타입은 검사 제외
2. **테스트 파일** — `.test.ts`에서의 `as any` 허용 (목 데이터 목적)
3. **제네릭 기본값** — `function foo<T = any>()` 형태의 제네릭 기본값 허용
4. **API 응답 파싱** — SDK 응답 타입 단언이 불가피한 경우 허용 (주석 필요)
5. **`tsconfig.json`** — 컴파일러 설정 파일은 검사 제외
