# AI 자동화 솔루션 - 워크플로우 상세

> 프로젝트 전체 개요는 [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)를 참고하세요.

---

## 1. 이메일 자동 응답 워크플로우

```
Gmail 수신 이메일 감지 (웹훅)
        ↓
/api/emails/webhook 호출
        ↓
Gmail API로 이메일 원문 추출
        ↓
MySQL emails 테이블에 저장
        ↓
OpenAI API 호출 (고객 문의 분석 + 응답 생성)
        ↓
Gmail API로 자동 회신 발송
        ↓
응답 내용 MySQL 업데이트 (responded = true)
        ↓
대시보드에 실시간 반영
```

**핵심 구현 포인트:**
- Gmail API OAuth2 인증 (`/api/auth/gmail`)
- 웹훅으로 실시간 이메일 감지 (`/api/emails/webhook`)
- OpenAI 프롬프트: 업종별 템플릿 선택 (부동산, 쇼핑몰 등)
- 발송 이력 및 응답률 대시보드에서 관리

---

## 2. 데이터 자동 분류 워크플로우

```
사용자가 CSV / JSON 파일 업로드
        ↓
/api/classify 호출
        ↓
csv-parser로 파일 파싱 및 유효성 검증
        ↓
OpenAI API 배치 호출 (행 단위 분류, 비용 절감)
        ↓
분류 결과 MySQL classifications 테이블에 저장
        ↓
대시보드에서 결과 조회 / CSV 다운로드
```

**핵심 구현 포인트:**
- 배치 처리로 OpenAI 호출 최소화 (`/api/classify/batch`)
- 분류 유형 커스터마이징 (카테고리, 우선순위, 지역 등)
- 신뢰도 점수(`confidence_score`) 함께 저장

---

## 3. 정기 자동화 (Cron Jobs) 워크플로우

```
[매시간] /api/cron/email-sync 실행
        ↓
Gmail에서 새 이메일 폴링
        ↓
미응답 이메일 자동 처리
        ↓
automation_logs 테이블에 실행 결과 기록

[매일 자정] /api/cron/classify-batch 실행
        ↓
pending 상태 데이터 일괄 분류
        ↓
처리 결과 리포트 생성 및 저장
```

**핵심 구현 포인트:**
- `node-cron` 라이브러리로 스케줄 관리
- 실행 성공/실패 여부를 `automation_logs`에 기록
- 웹훅 누락 이메일을 Cron으로 이중 보완

---

## API 엔드포인트 요약

| 엔드포인트 | 메서드 | 역할 |
|---|---|---|
| `/api/emails` | GET | 이메일 목록 조회 |
| `/api/emails/webhook` | POST | Gmail 웹훅 수신 |
| `/api/emails/send-response` | POST | 수동 응답 발송 |
| `/api/classify` | POST | 단건 데이터 분류 |
| `/api/classify/batch` | POST | 배치 분류 |
| `/api/cron/email-sync` | GET | 이메일 동기화 (Cron) |
| `/api/cron/classify-batch` | GET | 배치 분류 실행 (Cron) |
| `/api/auth/gmail` | GET | Gmail OAuth 시작 |
| `/api/auth/callback` | GET | OAuth 콜백 처리 |

---

## 참고 자료

- [Gmail API Docs](https://developers.google.com/gmail/api)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [mysql2 GitHub](https://github.com/sidorares/node-mysql2)
