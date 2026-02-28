---
name: verify-api-efficiency
description: 에이전트별 API 호출 방식 정확성과 비용·속도 효율성을 검사합니다. Dev 에이전트 Responses API 검증, 비용 최적화 시 사용.
---

# API 효율성 검증

## Purpose

1. Dev 에이전트가 `responses.create()` (Responses API)를 사용하는지 확인
2. 에이전트별 `maxTokens` 설정 적정성 확인
3. API 키 환경변수 사용 확인 (하드코딩 금지)
4. 모델 선택 적정성 확인 (비용 대비 성능)
5. 불필요한 컨텍스트 누적 여부 확인

## When to Run

- Dev 에이전트 코드 변경 후 (필수)
- `src/config.ts` 수정 후
- API 비용 이상 증가 시
- 파이프라인 응답 속도 저하 시
- Pull Request 생성 전

## Related Files

| File | Purpose |
|------|---------|
| `src/agents/dev-agent.ts` | Dev 에이전트 (Responses API 사용 필수) |
| `src/agents/pm-agent.ts` | PM 에이전트 (Anthropic SDK) |
| `src/agents/designer-agent.ts` | Designer 에이전트 (Google SDK) |
| `src/agents/qa-agent.ts` | QA 에이전트 (OpenAI Chat Completions) |
| `src/config.ts` | maxTokens, model 설정 |

## Workflow

### Step 1: Dev 에이전트 Responses API 검증 (CRITICAL)

**도구:** Grep
**검사:** Dev 에이전트가 `chat.completions` 대신 `responses.create()` 사용하는지 확인

```bash
# ❌ 금지: chat.completions 사용 탐지
grep -n "chat.completions\|chat\.completions" src/agents/dev-agent.ts

# ✅ 필수: responses.create 사용 확인
grep -n "responses.create\|responses\.create" src/agents/dev-agent.ts
```

**PASS:** `responses.create` 존재, `chat.completions` 없음
**FAIL:** `chat.completions` 발견 → 즉시 `responses.create()`로 교체 필요

**수정 방법:**
```typescript
// ❌ 위반 (Chat Completions)
const response = await client.chat.completions.create({
  model: 'codex-mini-latest',
  messages: [{ role: 'user', content: prompt }],
});

// ✅ 수정 (Responses API)
const response = await client.responses.create({
  model: 'codex-mini-latest',
  instructions: systemPrompt,
  input: prompt,
  max_output_tokens: maxTokens,
});
```

### Step 2: Responses API 파라미터 확인

**도구:** Grep
**검사:** Dev 에이전트의 Responses API 파라미터명 정확성

```bash
# 올바른 파라미터 확인
grep -n "instructions\|max_output_tokens\|input" src/agents/dev-agent.ts

# 잘못된 파라미터 탐지 (Chat Completions 파라미터)
grep -n "messages:\|max_tokens:" src/agents/dev-agent.ts
```

**PASS:** `instructions`, `input`, `max_output_tokens` 사용
**FAIL:** `messages`, `max_tokens` 사용 (Chat Completions 파라미터)

### Step 3: maxTokens 설정 적정성 확인

**도구:** Grep
**검사:** 에이전트별 `maxTokens` 설정 확인

```bash
# 에이전트별 maxTokens 설정
grep -A2 "name:\|maxTokens" src/config.ts | grep -v "^--$"
```

**PASS:** 에이전트 역할에 맞는 토큰 수 설정
**WARNING:** 모든 에이전트가 동일한 maxTokens 사용 (역할별 최적화 미적용)

권장 기준:
- PM: 2048~4096 (문서 생성)
- Designer: 2048~4096 (설계 문서)
- Dev: 1024~2048 (기술 명세, ×0.75 배율)
- QA: 2048~4096 (테스트 계획)

### Step 4: 모델 선택 적정성 확인

**도구:** Grep
**검사:** 에이전트별 모델 설정 확인

```bash
# 모델 설정 확인
grep -n "model:" src/config.ts
```

**PASS:** 역할에 맞는 모델 선택 (PM: claude-haiku, Designer: gemini-flash)
**WARNING:** 단순 작업에 고비용 모델 사용

### Step 5: API 키 환경변수 사용 확인

**도구:** Grep
**검사:** 모든 에이전트에서 API 키를 `process.env.*`로 참조하는지 확인

```bash
# 환경변수 사용 확인
grep -rn "process\.env\." src/agents/ --include="*.ts"

# 하드코딩 API 키 탐지
grep -rn "sk-\|AIza\|gsk_" src/agents/ --include="*.ts"
```

**PASS:** 모든 API 키가 `process.env.*`로 참조
**FAIL:** 하드코딩 API 키 발견 → 즉시 환경변수로 이전

## Output Format

```markdown
### verify-api-efficiency 결과

| 검사 항목 | 상태 | 발견 건수 | 심각도 | 세부 내용 |
|----------|------|---------|-------|---------|
| Dev Responses API | ✅ PASS / ❌ FAIL | — | 🔴 CRITICAL | chat.completions 사용 여부 |
| Responses API 파라미터 | ✅ PASS / ❌ FAIL | N건 | 🔴 HIGH | 잘못된 파라미터 목록 |
| maxTokens 적정성 | ✅ PASS / ⚠️ WARNING | — | 🟡 MEDIUM | 에이전트별 설정값 |
| 모델 선택 | ✅ PASS / ⚠️ WARNING | — | 🟡 MEDIUM | 비용 최적화 제안 |
| API 키 보안 | ✅ PASS / ❌ FAIL | N건 | 🔴 CRITICAL | 하드코딩 위치 |
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **PM/QA/Designer 에이전트** — `chat.completions` 또는 각 SDK 전용 API 사용은 정상
2. **테스트 파일** — `.test.ts`에서의 Mock API 사용은 검사 제외
3. **`.env.example`** — 예시 파일의 API 키 자리표시자는 허용
4. **높은 maxTokens** — 복잡한 산출물 생성 시 큰 토큰 수 허용 (근거 있는 경우)
