---
name: manage-skills
description: 세션 변경사항을 분석하여 검증 스킬 누락을 탐지합니다. 기존 스킬을 동적으로 탐색하고, 새 스킬을 생성하거나 기존 스킬을 업데이트한 뒤 CLAUDE.md를 관리합니다.
disable-model-invocation: true
argument-hint: "[선택사항: 특정 스킬 이름 또는 집중할 영역]"
model: sonnet
---

# 세션 기반 스킬 유지보수

## 목적

현재 세션에서 변경된 내용을 분석하여 검증 스킬의 드리프트를 탐지하고 수정합니다:

1. **커버리지 누락** — 어떤 verify 스킬에서도 참조하지 않는 변경된 파일
2. **유효하지 않은 참조** — 삭제되거나 이동된 파일을 참조하는 스킬
3. **누락된 검사** — 기존 검사에서 다루지 않는 새로운 패턴/규칙
4. **오래된 값** — 더 이상 일치하지 않는 설정값 또는 탐지 명령어

## 실행 시점

- 새로운 에이전트나 기능을 구현한 후
- 기존 verify 스킬을 수정하고 일관성을 점검하고 싶을 때
- PR 전에 verify 스킬이 변경된 영역을 커버하는지 확인할 때
- 검증 실행 시 예상했던 이슈를 놓쳤을 때
- 주기적으로 스킬을 코드베이스 변화에 맞춰 정렬할 때

## 등록된 개발 스킬

개발 작업 자동화 스킬 목록입니다. `verify-*` 스킬과 달리 구현을 직접 수행합니다.

| 스킬 | 설명 | 주요 서브에이전트 |
|------|------|----------------|
| `develop` | 서브에이전트 팀을 조율하여 파이프라인 기능을 end-to-end로 구현 | pipeline-designer, agent-scaffolder, prompt-writer, code-reviewer |

## 등록된 검증 스킬

현재 프로젝트에 등록된 검증 스킬 목록입니다. 새 스킬 생성/삭제 시 이 목록을 업데이트합니다.

| 스킬 | 설명 | 커버 파일 패턴 |
|------|------|---------------|
| `verify-pipeline-flow` | 파이프라인 에이전트 의존성 위반과 컨텍스트 흐름 규칙 검사 | `src/agents/**/*.ts`, `src/pipeline.ts`, `src/config.ts` |
| `verify-agent-structure` | 에이전트 파일 구조와 export 패턴 검사 | `src/agents/*.ts`, `prompts/*.md`, `src/config.ts` |
| `verify-typescript-quality` | TypeScript 타입 품질과 strict 모드 준수 여부 검사 | `src/**/*.ts` |
| `verify-prompt-conventions` | 시스템 프롬프트 파일 컨벤션과 일관성 검사 | `prompts/**/*.md` |
| `verify-output-coverage` | 파이프라인 산출물 저장 커버리지와 파일 생성 패턴 검사 | `src/pipeline.ts`, `src/config.ts`, `outputs/**` |
| `verify-api-efficiency` | API 호출 방식 정확성과 비용·속도 효율성 검사 | `src/agents/**/*.ts`, `src/config.ts` |
| `verify-security` | API 키 노출 위험과 보안 취약점 검사 | `src/**/*.ts`, `.gitignore`, `.env*` |

## 워크플로우

### Step 1: 세션 변경사항 분석

현재 세션에서 변경된 모든 파일을 수집합니다:

```bash
# 커밋되지 않은 변경사항
git diff HEAD --name-only

# 현재 브랜치의 커밋 (main에서 분기된 경우)
git log --oneline main..HEAD 2>/dev/null

# main에서 분기된 이후의 모든 변경사항
git diff main...HEAD --name-only 2>/dev/null
```

### Step 2: 등록된 스킬과 변경 파일 매핑

위의 **등록된 검증 스킬** 섹션에 나열된 스킬을 참조하여 파일-스킬 매핑을 구축합니다.

각 스킬의 `.claude/skills/verify-<name>/SKILL.md`를 읽고 Related Files와 Workflow를 파싱합니다.

### Step 3: 영향받은 스킬의 커버리지 갭 분석

영향받은 스킬에 대해 다음을 점검합니다:

1. **누락된 파일 참조** — 변경 파일이 Related Files에 목록되어 있지 않은 경우
2. **오래된 탐지 명령어** — grep/glob 패턴이 현재 파일 구조와 일치하지 않는 경우
3. **커버되지 않은 새 패턴** — 신규 규칙/패턴 미검사
4. **삭제된 파일 잔여 참조** — Related Files의 파일이 코드베이스에 없는 경우

### Step 4: CREATE vs UPDATE 결정

```
커버되지 않은 각 파일 그룹에 대해:
    IF 기존 스킬의 도메인과 관련된 파일인 경우:
        → 결정: 기존 스킬 UPDATE
    ELSE IF 3개 이상의 관련 파일이 공통 규칙/패턴을 공유하는 경우:
        → 결정: 새 verify 스킬 CREATE
    ELSE:
        → "면제"로 표시
```

### Step 5~6: 스킬 업데이트 또는 생성

새 스킬 생성 시 반드시 다음 3개 파일도 업데이트합니다:

1. **이 파일 자체** (`manage-skills/SKILL.md`) — 등록된 검증 스킬 테이블 업데이트
2. **`verify-implementation/SKILL.md`** — 실행 대상 스킬 테이블 업데이트
3. **`CLAUDE.md`** — Skills/검증 스킬 실행 섹션 업데이트

### Step 7: 검증

모든 편집 후:

```bash
# 참조 파일 존재 확인
ls src/agents/ src/config.ts src/pipeline.ts prompts/ 2>/dev/null
```

### Step 8: 요약 보고서

```markdown
## 세션 스킬 유지보수 보고서

### 분석된 변경 파일: N개

### 업데이트된 스킬: X개
- `verify-<name>`: N개의 새 검사 추가

### 생성된 스킬: Y개
- `verify-<name>`: <패턴> 커버

### 업데이트된 연관 파일:
- `manage-skills/SKILL.md`: 등록된 검증 스킬 테이블 업데이트
- `verify-implementation/SKILL.md`: 실행 대상 스킬 테이블 업데이트
- `CLAUDE.md`: 검증 스킬 섹션 업데이트
```

---

## Related Files

| File | Purpose |
|------|---------|
| `@.claude/skills/verify-implementation/SKILL.md` | 통합 검증 스킬 (실행 대상 목록 관리) |
| `@.claude/skills/manage-skills/SKILL.md` | 이 파일 자체 (등록된 검증 스킬 목록 관리) |
| `@CLAUDE.md` | 프로젝트 지침 |

## 예외사항

다음은 **문제가 아닙니다**:

1. **Lock 파일 및 생성된 파일** — `package-lock.json`, `node_modules/`, `outputs/` 빌드 결과물
2. **일회성 설정 변경** — `package.json` 버전 범프, 린터 설정 사소한 변경
3. **문서 파일** — `README.md`, `CHANGELOG.md` 등
4. **테스트 픽스처** — `fixtures/`, `__fixtures__/` 디렉토리의 파일
5. **영향받지 않은 스킬** — UNAFFECTED로 표시된 스킬은 검토 불필요
6. **`.claude/` 자체** — `.claude/` 폴더의 변경은 스킬 업데이트 대상이 아님
