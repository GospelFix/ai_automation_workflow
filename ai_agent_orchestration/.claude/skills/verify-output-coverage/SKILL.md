---
name: verify-output-coverage
description: 파이프라인 산출물 저장 커버리지와 파일 생성 패턴을 검사합니다. 파이프라인 실행 후, 에이전트 수정 후 사용.
---

# 산출물 커버리지 검증

## Purpose

1. 파이프라인 실행 후 `outputs/타임스탬프/` 폴더 생성 확인
2. 4개 필수 산출물 파일 생성 여부 확인 (`PRD.md`, `DESIGN.md`, `TECH_SPEC.md`, `TEST_PLAN.md`)
3. `PIPELINE_SUMMARY.json` 메타데이터 저장 확인
4. 에이전트별 `outputKey` 설정과 실제 파일명 일치 확인
5. 출력 저장 로직 (`pipeline.ts`) 검증

## When to Run

- 파이프라인을 실행한 후
- 에이전트 `outputKey` 설정 변경 후
- `src/pipeline.ts` 수정 후
- 산출물 파일 누락 의심 시

## Related Files

| File | Purpose |
|------|---------|
| `src/pipeline.ts` | 산출물 저장 로직 |
| `src/config.ts` | 에이전트 outputKey 설정 |
| `outputs/` | 실행 산출물 저장 폴더 |

## Workflow

### Step 1: 출력 폴더 구조 확인

**도구:** Bash
**검사:** `outputs/` 폴더 내 타임스탬프 폴더 존재 여부

```bash
# 최근 실행 폴더 확인
ls outputs/ | tail -5

# 최신 폴더 내 파일 확인
ls outputs/$(ls outputs/ | sort | tail -1)/
```

**PASS:** 타임스탬프 형식 폴더 존재, 필수 파일 포함
**FAIL:** 폴더 없음 또는 빈 폴더 → 파이프라인 실행 실패 가능성

### Step 2: 필수 산출물 파일 확인

**도구:** Bash
**검사:** 4개 필수 파일 존재 여부

```bash
LATEST=$(ls outputs/ | sort | tail -1)
ls outputs/$LATEST/ | grep -E "PRD.md|DESIGN.md|TECH_SPEC.md|TEST_PLAN.md"
```

**PASS:** 4개 파일 모두 존재
**FAIL:** 누락 파일 발견 → 해당 에이전트 실패 가능성

### Step 3: PIPELINE_SUMMARY.json 확인

**도구:** Bash
**검사:** 실행 메타데이터 저장 여부

```bash
LATEST=$(ls outputs/ | sort | tail -1)
cat outputs/$LATEST/PIPELINE_SUMMARY.json | head -20
```

**PASS:** JSON 파일 존재 및 실행 시간/에이전트 정보 포함
**FAIL:** 파일 없음 또는 파싱 오류

### Step 4: outputKey와 파일명 매핑 확인

**도구:** Grep
**검사:** `config.ts`의 `outputKey` 설정과 `pipeline.ts`의 파일명 저장 로직 일치 여부

```bash
# config.ts의 outputKey 설정 확인
grep -n "outputKey" src/config.ts

# pipeline.ts의 파일 저장 로직 확인
grep -n "write\|save\|outputKey\|PRD\|DESIGN\|TECH_SPEC\|TEST_PLAN" src/pipeline.ts
```

**PASS:** outputKey와 저장 파일명 일치
**FAIL:** 불일치 → 특정 에이전트 산출물 저장 누락

### Step 5: 출력 저장 로직 확인

**도구:** Read
**검사:** `pipeline.ts`에 파일 저장 로직 존재 여부

```bash
grep -n "fs\.\|writeFile\|mkdir\|outputs" src/pipeline.ts
```

**PASS:** 각 에이전트 실행 후 파일 저장 로직 존재
**FAIL:** 저장 로직 없음 → 산출물이 메모리에만 존재

## Output Format

```markdown
### verify-output-coverage 결과

| 검사 항목 | 상태 | 발견 건수 | 세부 내용 |
|----------|------|---------|---------|
| outputs/ 폴더 구조 | ✅ PASS / ⚠️ WARNING | — | 최근 실행 폴더 목록 |
| 필수 산출물 파일 | ✅ PASS / ❌ FAIL | N건 | 누락 파일 목록 |
| PIPELINE_SUMMARY.json | ✅ PASS / ❌ FAIL | — | 파일 상태 |
| outputKey 매핑 | ✅ PASS / ❌ FAIL | N건 | 불일치 에이전트 |
| 저장 로직 존재 | ✅ PASS / ❌ FAIL | — | 누락 위치 |
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **첫 실행 전** — `outputs/` 폴더가 없는 것은 정상 (파이프라인 미실행 상태)
2. **실패한 실행** — API 오류로 인한 중간 실패 시 일부 파일 누락 허용
3. **개발 중 실행** — 테스트 목적의 불완전한 실행 결과는 검사 제외
4. **code/ 폴더** — Dev 에이전트가 생성하는 코드 파일 폴더는 선택 사항
