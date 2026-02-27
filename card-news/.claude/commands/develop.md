---
name: develop
description: Claude Code에서 `/develop`을 입력하면 Instagram 카드뉴스 프로젝트 전체가 자동 세팅됩니다.
updated: 2026-02-27
model: sonnet
---

> **사용법**: Claude Code 채팅창에서 `/develop`을 입력하면 즉시 실행됩니다.
> 이 파일(`.claude/commands/develop.md`)이 있는 폴더에서 Claude Code를 열면 됩니다.

---

Instagram 카드뉴스 자동 생성 프로젝트를 처음부터 만들어줘. 팀 에이전트를 활용해서 병렬로 빠르게 세팅해줘.

## 프로젝트 개요

이 프로젝트는 주어진 주제에 대해 Instagram 카드뉴스(캐러셀 포스트)를 자동 생성하는 시스템이야.
Claude Code가 오케스트레이터 역할을 하며 리서치 → 리서치 검증(팀 토론) → 카피 토론(Team 모드 실시간 토론) → 렌더링 → 검토 파이프라인을 실행해.

- 출력: `output/` 디렉토리에 1080×1350px PNG 이미지
- 템플릿: HTML 기반 (Puppeteer로 PNG 렌더링)
- 스타일: clean (클린 에디토리얼형)
- 슬라이드 타입: 14종

> **규칙 및 가이드라인**: 카드뉴스 생성 워크플로우, 슬라이드 타입 레퍼런스, 카피라이팅 가이드라인 등 모든 규칙은 `CLAUDE.md`를 참조합니다.

---

## 1단계: 프로젝트 인프라 파일 생성

아래 파일들을 정확히 생성해줘.

### package.json

```json
{
  "name": "instagram-card-news",
  "version": "1.0.0",
  "description": "Instagram card news generator with team agent orchestration",
  "scripts": {
    "render": "node scripts/render.js",
    "sample": "node scripts/generate-samples.js"
  },
  "dependencies": {
    "puppeteer": "^23.0.0"
  }
}
```

### .gitignore

```
node_modules/
output/
sample-output/
.DS_Store
```

### config.json

```json
{
  "version": "3.0",
  "defaults": {
    "template": "clean",
    "accent_color": "#8BC34A",
    "account_name": "my_account",
    "slide_count": 7
  },
  "templates": {
    "clean": {
      "description": "클린 에디토리얼 스타일 라이트그레이 + 그린 하이라이트",
      "accent_color": "#8BC34A",
      "background": "light-gray"
    }
  },
  "dimensions": {
    "width": 1080,
    "height": 1350
  },
  "output_dir": "output",
  "workspace_dir": "workspace"
}
```

### 디렉토리 생성

```
mkdir -p templates/clean scripts workspace output
```

---

## 2단계: 렌더링 스크립트 생성

### scripts/render.js

Puppeteer 기반 HTML→PNG 렌더러. 핵심 로직:

1. `workspace/slides.json`을 읽음
2. 각 슬라이드의 `type`에 해당하는 `templates/{style}/{type}.html`을 로드
3. HTML 내의 `{{placeholder}}`를 슬라이드 데이터로 치환
4. Puppeteer로 1080×1350px 스크린샷을 PNG로 저장

**플레이스홀더 목록** (모든 `{{...}}`를 슬라이드 데이터로 치환):

- `{{headline}}`, `{{subtext}}`, `{{body}}`, `{{emphasis}}`, `{{cta_text}}`
- `{{slide_number}}` (2자리 패딩), `{{total_slides}}` (2자리 패딩)
- `{{accent_color}}`, `{{account_name}}`
- `{{image_url}}`, `{{badge_text}}`, `{{badge_number}}`, `{{headline_label}}`
- `{{step1}}`, `{{step2}}`, `{{step3}}`
- `{{item1}}` ~ `{{item5}}`
- `{{left_title}}`, `{{left_body}}`, `{{right_title}}`, `{{right_body}}`
- `{{grid1_icon}}` ~ `{{grid4_icon}}`, `{{grid1_title}}` ~ `{{grid4_title}}`, `{{grid1_desc}}` ~ `{{grid4_desc}}`
- `{{bigdata_number}}`, `{{bigdata_unit}}`
- `{{badge2_text}}`, `{{body2}}`
- `{{tag1}}`, `{{tag2}}`, `{{tag3}}`

모든 텍스트 값의 `\n`은 `<br>`로 치환해야 해.

**CLI 인터페이스**:

```bash
node scripts/render.js \
  --slides workspace/slides.json \
  --style clean \
  --output output/ \
  --accent "#8BC34A" \
  --account "my_account"
```

### scripts/generate-samples.js

clean 스타일에 대해 샘플 카드뉴스를 생성하는 스크립트.
14개 슬라이드 타입을 모두 포함하는 샘플 데이터(한국어, 디지털 마케팅 주제)를 내장하고, `sample-output/clean/` 디렉토리에 렌더링.

---

## 3단계: HTML 템플릿 생성 (clean 스타일 × 14타입 = 14개 파일)

**팀 에이전트를 사용해서 14개 타입을 병렬로 생성해줘.**

### 공통 규칙 (모든 템플릿)

- 크기: 정확히 `width: 1080px; height: 1350px` (Instagram 세로형)
- `html, body`에 `margin: 0; padding: 0; overflow: hidden` 필수
- 모든 텍스트에 `word-break: keep-all` (한국어 단어 단위 줄바꿈)
- 모든 플레이스홀더는 `{{변수명}}` 형식 (render.js가 치환)
- 각 파일은 완전한 HTML 문서 (DOCTYPE, head, style, body 포함)
- 외부 JS 의존성 없이 순수 HTML+CSS만 사용

### 14개 슬라이드 타입별 필수 필드

| 타입              | 파일명                 | 필수 플레이스홀더                                                                                                                                                 |
| ----------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cover             | cover.html             | `{{headline}}`, `{{subtext}}`, `{{headline_label}}`, `{{accent_color}}`, `{{account_name}}`                                                                       |
| content           | content.html           | `{{headline}}`, `{{body}}`, `{{badge_number}}`, `{{accent_color}}`, `{{account_name}}`                                                                            |
| content-stat      | content-stat.html      | `{{headline}}`, `{{emphasis}}`, `{{body}}`, `{{accent_color}}`, `{{account_name}}`                                                                                |
| content-quote     | content-quote.html     | `{{headline}}` (출처), `{{body}}` (인용문), `{{accent_color}}`, `{{account_name}}`                                                                                |
| content-badge     | content-badge.html     | `{{badge_text}}`, `{{headline}}`, `{{body}}`, `{{subtext}}`, `{{accent_color}}`, `{{account_name}}`                                                               |
| content-steps     | content-steps.html     | `{{headline}}`, `{{step1}}`, `{{step2}}`, `{{step3}}`, `{{body}}`, `{{accent_color}}`, `{{account_name}}`                                                         |
| content-list      | content-list.html      | `{{headline}}`, `{{item1}}`~`{{item5}}`, `{{accent_color}}`, `{{account_name}}`                                                                                   |
| content-split     | content-split.html     | `{{headline}}`, `{{left_title}}`, `{{left_body}}`, `{{right_title}}`, `{{right_body}}`, `{{subtext}}`, `{{accent_color}}`, `{{account_name}}`                     |
| content-highlight | content-highlight.html | `{{headline}}`, `{{emphasis}}`, `{{body}}`, `{{subtext}}`, `{{accent_color}}`, `{{account_name}}`                                                                 |
| content-image     | content-image.html     | `{{headline}}`, `{{body}}`, `{{image_url}}`, `{{accent_color}}`, `{{account_name}}`                                                                               |
| content-grid      | content-grid.html      | `{{headline}}`, `{{grid1_icon}}`~`{{grid4_icon}}`, `{{grid1_title}}`~`{{grid4_title}}`, `{{grid1_desc}}`~`{{grid4_desc}}`, `{{accent_color}}`, `{{account_name}}` |
| content-bigdata   | content-bigdata.html   | `{{headline}}`, `{{bigdata_number}}`, `{{bigdata_unit}}`, `{{body}}`, `{{subtext}}`, `{{accent_color}}`, `{{account_name}}`                                       |
| content-fullimage | content-fullimage.html | `{{headline}}`, `{{badge_text}}`, `{{body}}`, `{{badge2_text}}`, `{{body2}}`, `{{image_url}}`, `{{accent_color}}`, `{{account_name}}`                             |
| cta               | cta.html               | `{{headline}}`, `{{cta_text}}`, `{{subtext}}`, `{{tag1}}`, `{{tag2}}`, `{{tag3}}`, `{{accent_color}}`, `{{account_name}}`                                         |

### clean 스타일 디자인 사양

- **폰트**: Apple SD Gothic Neo, -apple-system, BlinkMacSystemFont, sans-serif
- **배경**: 라이트그레이 (#F0F0F0)
- **악센트**: `{{accent_color}}` (기본 #8BC34A 라임그린)
- **letter-spacing**: -0.02em (전체)
- **헤드라인**: 80~108px, font-weight 900, 색상 #1A1A1A, letter-spacing -0.025em
- **본문**: 32~36px, font-weight 400, 색상 #4B5563
- **카드**: background #FFFFFF, border-radius 24px
- **슬라이드 번호**: 표시하지 않음 (clean 스타일 특징)

#### 핵심 디자인 요소

1. **브랜드 마크** (모든 슬라이드 공통)
   - 좌측 상단 또는 하단에 악센트색 원형 도트(18px) + 계정명(28px, #9CA3AF)
   - 도트와 계정명 사이 gap 10px

2. **하이라이트 효과** (`.highlight` 클래스)
   - `background: linear-gradient(to top, {{accent_color}}66 45%, transparent 45%)`
   - headline에 `<span class='highlight'>텍스트</span>` 사용 시 형광펜 마커 효과
   - `box-decoration-break: clone; -webkit-box-decoration-break: clone;`

3. **쉐브론 화살표** (커버/CTA만)
   - 우측 하단에 더블 쉐브론(>>) SVG 아이콘
   - 색상 #374151, stroke-width 2.5, 44x44px

4. **커버 레이아웃**
   - 상단 580px 빈 공간 (아이콘/이미지 영역)
   - 하단에 hook-text(46px, #6B7280) → headline(108px, #1A1A1A) → subtitle(40px, #374151)
   - 좌측 정렬

5. **본문 슬라이드 레이아웃**
   - 상단: 브랜드 마크 (도트+계정명)
   - 중앙: 악센트색 라인 구분선 + 헤드라인 + 컨텐츠
   - 하단: 브랜드 마크 반복 또는 여백

6. **CTA 레이아웃**
   - 중앙 정렬: headline + subtext
   - 악센트색 배경의 둥근 CTA 버튼 (border-radius 100px)
   - 하단: 해시태그 배지 3개 (tag1~3, 악센트색 배경 pill)
   - 푸터: 브랜드 도트+계정명 + 쉐브론

---

## 4단계: CLAUDE.md 확인

`CLAUDE.md`는 프로젝트 루트에 이미 존재합니다. 카드뉴스 생성 워크플로우, 슬라이드 타입 레퍼런스, 카피라이팅 가이드라인 등 모든 규칙은 해당 파일을 참조합니다.

---

## 5단계: npm install 실행

모든 파일이 생성된 후 `npm install`을 실행해서 Puppeteer를 설치해줘.

---

## 6단계: 샘플 렌더링으로 검증

설치 후 `node scripts/generate-samples.js`를 실행해서 clean 스타일이 정상 렌더링되는지 확인해줘.
에러가 있으면 해당 템플릿을 수정해서 정상 동작할 때까지 반복해줘.

---

## 실행 순서 요약

1. 인프라 파일 생성 (package.json, config.json, .gitignore)
2. 디렉토리 구조 생성
3. scripts/render.js 생성
4. scripts/generate-samples.js 생성
5. **clean 스타일 14개 HTML 템플릿 생성 (팀 에이전트 활용)**
6. npm install
7. 샘플 렌더링으로 검증
8. 에러 수정 (있다면)
9. git init && git add -A && git commit

완성 후 "카드뉴스 만들어줘: [주제]" 한 줄이면 자동으로 카드뉴스가 생성되는 상태로 만들어줘.
