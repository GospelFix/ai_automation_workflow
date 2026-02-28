---
name: verify-prompt-conventions
description: 시스템 프롬프트 파일의 컨벤션과 일관성을 검사합니다. 신규 프롬프트 추가 후, 프롬프트 수정 후, PR 전 사용.
---

# 시스템 프롬프트 컨벤션 검증

## Purpose

1. `prompts/*.md` 파일 존재 및 에이전트와 대응 여부 확인
2. 페르소나 정의 포함 여부 확인
3. 출력 형식 명세 포함 여부 확인
4. 파일명 컨벤션 확인 (소문자 + `.md`)
5. 민감 정보 하드코딩 탐지

## When to Run

- 새 시스템 프롬프트를 작성한 후
- 프롬프트 내용을 수정한 후
- 에이전트 추가 후 프롬프트 누락 확인 시
- Pull Request 생성 전

## Related Files

| File | Purpose |
|------|---------|
| `prompts/pm.md` | PM 에이전트 시스템 프롬프트 |
| `prompts/designer.md` | Designer 에이전트 시스템 프롬프트 |
| `prompts/dev.md` | Dev 에이전트 시스템 프롬프트 |
| `prompts/qa.md` | QA 에이전트 시스템 프롬프트 |
| `src/agents/` | 에이전트 구현 (프롬프트 파일 참조) |

## Workflow

### Step 1: 프롬프트 파일 존재 확인

**도구:** Bash
**검사:** 에이전트 수와 프롬프트 파일 수 비교

```bash
# 에이전트 파일 수 (base-agent 제외)
ls src/agents/ | grep -v "base-agent" | wc -l

# 프롬프트 파일 수
ls prompts/*.md | wc -l

# 에이전트명과 프롬프트 대응 확인
ls src/agents/ | grep -v "base-agent" | sed 's/-agent.ts//'
ls prompts/
```

**PASS:** 에이전트 수 = 프롬프트 파일 수, 이름 일치
**FAIL:** 프롬프트 파일 누락

### Step 2: 페르소나 정의 확인

**도구:** Grep
**검사:** `당신은` 또는 `You are` 페르소나 정의 누락 탐지

```bash
# 페르소나 정의 없는 프롬프트 탐지
grep -rL "당신은\|You are" prompts/
```

**PASS:** 결과 없음 (모든 프롬프트에 페르소나 정의 존재)
**FAIL:** 페르소나 정의 없는 파일 → 에이전트 역할 불명확

### Step 3: 출력 형식 명세 확인

**도구:** Grep
**검사:** 출력 형식 섹션 누락 탐지

```bash
# 출력 형식 섹션 없는 프롬프트 탐지
grep -rL "## 출력\|## Output\|출력 형식" prompts/
```

**PASS:** 결과 없음
**FAIL:** 출력 형식 미정의 → 에이전트 산출물 구조 불일치 위험

### Step 4: 파일명 컨벤션 확인

**도구:** Bash
**검사:** 소문자 + `.md` 형식 확인

```bash
# 대문자 또는 잘못된 확장자 탐지
ls prompts/ | grep -vE "^[a-z][a-z0-9-]*\.md$"
```

**PASS:** 결과 없음 (모든 파일이 소문자 + `.md`)
**FAIL:** 대문자 파일명 또는 `.md` 아닌 확장자

### Step 5: 민감 정보 하드코딩 탐지

**도구:** Grep
**검사:** 프롬프트 파일 내 API 키 패턴 탐지

```bash
# API 키 패턴 탐지
grep -rn "sk-\|api[_-]key\s*=\|API_KEY\s*=" prompts/ -i

# 패스워드 패턴 탐지
grep -rn "password\s*=\|secret\s*=" prompts/ -i
```

**PASS:** 결과 없음
**FAIL:** 민감 정보 발견 → 즉시 제거 필요

## Output Format

```markdown
### verify-prompt-conventions 결과

| 검사 항목 | 상태 | 발견 건수 | 세부 내용 |
|----------|------|---------|---------|
| 프롬프트 파일 존재 | ✅ PASS / ❌ FAIL | N건 | 누락 파일 목록 |
| 페르소나 정의 | ✅ PASS / ❌ FAIL | N건 | 미정의 파일 |
| 출력 형식 명세 | ✅ PASS / ⚠️ WARNING | N건 | 미정의 파일 |
| 파일명 컨벤션 | ✅ PASS / ❌ FAIL | N건 | 잘못된 파일명 |
| 민감 정보 | ✅ PASS / ❌ FAIL | N건 | 파일:라인 |
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **영어 페르소나** — `You are` 대신 한국어 `당신은` 사용하지 않아도 허용
2. **간결한 프롬프트** — 단순 역할의 에이전트는 짧은 프롬프트 허용
3. **마크다운 예시 코드** — 출력 예시 코드 블록 내 API 키 자리표시자 (`YOUR_API_KEY`) 허용
4. **숫자 접미사 파일명** — `pm2.md` 같은 버전 구분 파일명 허용
