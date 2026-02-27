# Gospel Fix AI 자동화 솔루션 - 빠른 시작 가이드

**목표**: 수요일 중진공 상담 전에

**작동하는 MVP 완성**

---

## 📋 준비물 체크리스트

- [ ] Node.js 18+ 설치
- [ ] MySQL 8.4.3 설치 & 실행
- [ ] OpenAI API 키 (gpt-3.5-turbo)
- [ ] Gmail API 프로젝트 & OAuth 크레덴셜
- [ ] VSCode 또는 다른 에디터

---

## 🚀 실행 단계 (약 4시간)

### **Step 1: 프로젝트 초기화 (30분)**

```bash
# 1. Next.js 프로젝트 생성
npx create-next-app@latest gospel-fix-automation \
  --typescript \
  --tailwind \
  --app \
  --eslint

cd gospel-fix-automation

# 2. 필요한 라이브러리 설치
npm install \
  openai \
  googleapis \
  mysql2 \
  csv-parser \
  node-cron \
  axios \
  uuid \
  dotenv

# 3. 디렉토리 구조 생성
mkdir -p app/dashboard/{emails,data-classify}
mkdir -p app/api/{emails,classify,cron,auth}
mkdir -p lib components types database/migrations scripts
```

---

### **Step 2: MySQL 데이터베이스 설정 (30분)**

```bash
# 1. MySQL 로그인
mysql -u root -p

# 2. 스키마 파일 실행
source database/schema.sql

# 3. 확인
SHOW TABLES;
USE gospel_fix_automation;
SELECT * FROM emails;
```

---

### **Step 3: 환경변수 설정 (15분)**

`.env.local` 파일 생성:

```env
# OpenAI
OPENAI_API_KEY=sk-proj-... (OpenAI에서 발급받기)

# Gmail OAuth (Google Cloud Console에서 발급)
GMAIL_CLIENT_ID=123456789-abcdefgh.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-xxxxx
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/callback

# MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=gospel_fix_automation
DB_PORT=3306

# App
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

---

### **Step 4: 핵심 라이브러리 파일 생성 (1시간)**

이 저장소의 `.example.ts` 파일들을 다음 위치에 복사:

```
lib/db.ts                    ← lib_db.example.ts
lib/openai.ts               ← lib_openai.example.ts
lib/email-service.ts        ← lib_email_service.example.ts
lib/classify-service.ts     ← lib_classify_service.example.ts
types/index.ts              ← types_index.example.ts
```

---

### **Step 5: API 라우트 구현 (1.5시간)**

#### **A. 이메일 자동 응답 API**

`app/api/emails/send-response.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { processEmailAutoResponse } from "@/lib/email-service";

export async function POST(req: NextRequest) {
  try {
    const { messageId, accessToken } = await req.json();

    const result = await processEmailAutoResponse(messageId, accessToken);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
```

#### **B. 데이터 분류 API**

`app/api/classify/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { classifyBatch } from "@/lib/classify-service";

export async function POST(req: NextRequest) {
  try {
    const { items, classificationType } = await req.json();

    const result = await classifyBatch(items, classificationType);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
```

---

### **Step 6: 대시보드 UI 구현 (1시간)**

`app/dashboard/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [emailStats, setEmailStats] = useState({ total: 0, responded: 0 });
  const [classifyStats, setClassifyStats] = useState({ total: 0, success: 0 });

  useEffect(() => {
    // API 호출해서 통계 조회
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4 p-8">
      <div className="bg-blue-100 p-6 rounded-lg">
        <h2>이메일 자동응답</h2>
        <p className="text-2xl font-bold">{emailStats.responded}/{emailStats.total}</p>
      </div>
      <div className="bg-green-100 p-6 rounded-lg">
        <h2>데이터 분류</h2>
        <p className="text-2xl font-bold">{classifyStats.success}/{classifyStats.total}</p>
      </div>
    </div>
  );
}
```

---

### **Step 7: 로컬 테스트 및 실행 (30분)**

```bash
# 1. 개발 서버 시작
npm run dev

# 2. 브라우저에서 확인
# http://localhost:3000

# 3. API 테스트 (curl 또는 Postman)
curl -X POST http://localhost:3000/api/classify/route \
  -H "Content-Type: application/json" \
  -d '{
    "items": ["부동산 강남 30평 3억원", "쇼핑몰 신발 할인"],
    "classificationType": "category"
  }'
```

---

## 🎯 수요일 상담 때 보여줄 것

### **Demo 시나리오: 부동산 중개소**

1. **이메일 자동 응답 데모**
   - 고객 이메일: "강남역 30평 2억원짜리 방 있나요?"
   - AI 자동 응답: "[방 정보 자동 조회 + 안내 메시지 자동 생성]"
   - 결과: ✅ 응답 완료

2. **데이터 분류 데모**
   - 업로드: 100개 부동산 매물 CSV
   - 분류: 지역, 평수, 가격별 자동 정렬
   - 결과: ✅ 분류 완료 (실시간 진행상황 표시)

---

## 📊 성공 지표

달성해야 할 목표:

- ✅ API 응답 시간 < 2초
- ✅ 이메일 자동 응답률 95% 이상
- ✅ 데이터 분류 정확도 90% 이상
- ✅ 월 운영 비용 < 50만원

---

## 🔗 참고 자료

### OpenAI API 설정

- https://platform.openai.com/account/api-keys
- 모델: `gpt-3.5-turbo` (비용 효율적)

### Gmail API 설정

- https://console.cloud.google.com/
- OAuth 2.0 인증 설정 필수
- Scopes: `https://www.googleapis.com/auth/gmail.modify`

### MySQL 문제 해결

```bash
# MySQL 서비스 확인
mysql -u root -p -e "SELECT VERSION();"

# 데이터베이스 재초기화
mysql -u root -p gospel_fix_automation < database/schema.sql
```

---

## 🚨 트러블슈팅

### **문제: OpenAI API 오류**

```
해결: .env.local에서 API 키 확인 및 가격 제한 설정 확인
```

### **문제: MySQL 연결 실패**

```
해결: DB_HOST=localhost가 맞는지 확인, MySQL 서비스 실행 확인
```

### **문제: Gmail 인증 실패**

```
해결: OAuth 콜백 URL이 정확한지 확인 (http://localhost:3000/api/auth/callback)
```

---

## 🎓 학습 자료

- [Next.js 공식 문서](https://nextjs.org/docs)
- [OpenAI API 가이드](https://platform.openai.com/docs/guides)
- [Gmail API 튜토리얼](https://developers.google.com/gmail/api/guides)

---

**작성일**: 2026년 2월 24일  
**완성 목표**: 2026년 3월 5일 (수요일 상담 전)  
**예상 소요 시간**: 4~6시간
