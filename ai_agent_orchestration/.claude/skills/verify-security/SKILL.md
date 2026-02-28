---
name: verify-security
description: API 키 노출 위험과 보안 취약점을 검사합니다. PR 전, 새 환경변수 추가 후, 배포 전 사용.
---

# 보안 검증

## Purpose

1. API 키·시크릿 하드코딩 탐지 (Anthropic, Google, OpenAI)
2. `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
3. `console.log`에 민감 데이터 출력 탐지
4. 환경변수 누락 시 안전한 에러 핸들링 여부 확인
5. `outputs/` 폴더의 민감 정보 노출 여부 확인

## When to Run

- Pull Request 생성 전 (필수)
- 새 API 키 또는 환경변수를 추가한 후
- 에이전트 코드 변경 후
- 배포 전 최종 점검 시

## Related Files

| File | Purpose |
|------|---------|
| `src/agents/` | 에이전트 구현 (API 키 사용) |
| `.env` | 환경변수 파일 (git 추적 제외 필수) |
| `.env.example` | 환경변수 예시 (커밋 허용) |
| `.gitignore` | Git 추적 제외 파일 목록 |
| `outputs/` | 파이프라인 산출물 (API 응답 포함 가능) |

## Workflow

### Step 1: API 키 하드코딩 탐지

**도구:** Grep
**검사:** 코드에 직접 하드코딩된 API 키, 시크릿 탐지

```bash
# Anthropic API 키 패턴 탐지
grep -rn "sk-ant-" src/ --include="*.ts"

# OpenAI API 키 패턴 탐지
grep -rn "sk-[a-zA-Z0-9]" src/ --include="*.ts"

# Google API 키 패턴 탐지
grep -rn "AIza[a-zA-Z0-9]" src/ --include="*.ts"

# 일반 API 키 패턴 탐지
grep -rn "api[_-]\?key\s*=\s*['\"]" src/ --include="*.ts" -i
grep -rn "secret\s*=\s*['\"]" src/ --include="*.ts" -i
```

**PASS:** 결과 없음
**FAIL:** 하드코딩된 민감 정보 발견 → 즉시 `process.env.*`로 이전

**수정 방법:**
```typescript
// ❌ 위반
const client = new Anthropic({ apiKey: 'sk-ant-...' });

// ✅ 수정
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

### Step 2: .gitignore에 .env 포함 여부 확인

**도구:** Bash
**검사:** `.env` 관련 파일이 `.gitignore`에 등록되어 있는지 확인

```bash
# .gitignore에서 .env 항목 확인
grep -n "\.env" .gitignore

# .env 파일이 git 추적 중인지 확인
git ls-files --error-unmatch .env 2>/dev/null && echo "FAIL: .env가 git에 추적됨" || echo "PASS: .env가 git에서 제외됨"
```

**PASS:** `.env`, `.env.local` 등이 `.gitignore`에 포함
**FAIL:** `.env` 파일이 git에 추적 중 → 즉시 `git rm --cached .env` 실행 필요

### Step 3: console.log 민감 데이터 출력 탐지

**도구:** Grep
**검사:** API 키, 토큰, 에이전트 응답 raw 데이터를 console.log로 출력하는 패턴 탐지

```bash
# 민감 데이터 관련 console.log 탐지
grep -rn "console\.log.*key\|console\.log.*token\|console\.log.*secret" src/ --include="*.ts" -i

# 에이전트 전체 응답을 console.log로 출력하는 패턴 탐지
grep -rn "console\.log.*response\|console\.log.*message" src/agents/ --include="*.ts" -i
```

**PASS:** 민감 데이터를 포함한 console.log 없음
**WARNING:** 개발 중 디버그 로그 존재 시

### Step 4: 환경변수 누락 에러 핸들링 확인

**도구:** Grep
**검사:** API 키 환경변수가 없을 때 적절한 에러를 발생시키는지 확인

```bash
# 환경변수 존재 여부 확인 로직 탐지
grep -rn "process\.env\." src/ --include="*.ts" | grep -v "//\|test"

# 에러 핸들링 확인
grep -rn "throw.*env\|if.*env\|!process\.env" src/ --include="*.ts"
```

**PASS:** 환경변수 누락 시 명확한 에러 메시지 제공
**WARNING:** 환경변수 없이 undefined로 진행되는 경우 → API 오류 원인 파악 어려움

### Step 5: outputs/ 폴더 민감 정보 확인

**도구:** Bash
**검사:** 파이프라인 산출물에 API 키 등 민감 정보가 포함되지 않았는지 확인

```bash
# outputs 폴더가 .gitignore에 있는지 확인
grep -n "outputs" .gitignore

# 최신 산출물에 API 키 패턴 포함 여부 (있을 경우에만)
LATEST=$(ls outputs/ 2>/dev/null | sort | tail -1)
[ -n "$LATEST" ] && grep -rn "sk-\|AIza\|api_key" outputs/$LATEST/ 2>/dev/null | head -5
```

**PASS:** `outputs/`가 `.gitignore`에 포함 또는 산출물에 민감 정보 없음
**WARNING:** 산출물이 git에 추적 중인 경우

## Output Format

```markdown
### verify-security 결과

| 검사 항목 | 상태 | 발견 건수 | 심각도 | 세부 내용 |
|----------|------|---------|-------|---------|
| API 키 하드코딩 | ✅ PASS / ❌ FAIL | N건 | 🔴 CRITICAL | 파일:라인 목록 |
| .gitignore .env | ✅ PASS / ❌ FAIL | — | 🔴 CRITICAL | 추적 중인 파일 |
| console.log 민감 데이터 | ✅ PASS / ⚠️ WARNING | N건 | 🟡 MEDIUM | 파일:라인 목록 |
| 환경변수 에러 핸들링 | ✅ PASS / ⚠️ WARNING | — | 🟡 MEDIUM | 미처리 항목 |
| outputs 민감 정보 | ✅ PASS / ⚠️ WARNING | — | 🟡 MEDIUM | 상태 |
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **`.env.example` 파일** — 예시 파일은 커밋 허용 (실제 값이 아닌 자리표시자)
2. **테스트 Mock** — `.test.ts`의 가짜 API 키 문자열 허용
3. **`outputs/` 미존재** — 파이프라인 미실행 시 폴더 없는 것은 정상
4. **디버그 로그** — 개발 환경에서의 비민감 디버그 console.log는 경고만
5. **환경변수 안내 메시지** — `process.env.ANTHROPIC_API_KEY` 자체를 console.log로 출력하지 않는 한 허용
