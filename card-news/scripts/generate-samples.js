#!/usr/bin/env node
/**
 * clean 스타일 샘플 카드뉴스 생성 스크립트
 * 14개 슬라이드 타입을 모두 포함한 디지털 마케팅 주제 샘플
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 14개 슬라이드 타입을 모두 포함한 샘플 데이터 (한국어, 디지털 마케팅 주제)
const sampleSlides = [
  {
    slide: 1,
    type: 'cover',
    headline: '인스타그램\n마케팅 완전정복',
    subtext: '2025년 최신 전략 가이드',
    headline_label: '마케팅 가이드',
  },
  {
    slide: 2,
    type: 'content',
    badge_number: '01',
    headline: '왜 인스타그램인가?',
    body: '월간 활성 사용자 20억명,\n대한민국 1위 SNS 플랫폼.\n당신의 고객이 모두 여기 있습니다.',
  },
  {
    slide: 3,
    type: 'content-stat',
    headline: '인스타그램 쇼핑 전환율',
    emphasis: '3.8%',
    body: '타 플랫폼 대비 2배 높은 구매 전환율.\n시각적 콘텐츠가 구매 결정을 이끕니다.',
  },
  {
    slide: 4,
    type: 'content-quote',
    headline: '— Gary Vaynerchuk',
    body: '"콘텐츠는 왕이지만,\n마케팅은 여왕이다.\n여왕이 집을 지배한다."',
  },
  {
    slide: 5,
    type: 'content-badge',
    badge_text: 'TREND',
    headline: '릴스가 답이다',
    body: '숏폼 영상 콘텐츠의 도달률이\n일반 이미지보다 평균 67% 높습니다.',
    subtext: '2025년 기준',
  },
  {
    slide: 6,
    type: 'content-steps',
    headline: '성공적인 릴스\n3단계 공식',
    step1: '첫 3초 훅 설계',
    step2: '핵심 가치 전달',
    step3: 'CTA로 마무리',
    body: '이 순서를 지키면 완성도가 달라집니다.',
  },
  {
    slide: 7,
    type: 'content-list',
    headline: '알고리즘이\n사랑하는 5가지',
    item1: '✅ 저장 유도 콘텐츠',
    item2: '✅ 댓글 유발 질문',
    item3: '✅ 공유하고 싶은 정보',
    item4: '✅ 일관된 게시 주기',
    item5: '✅ 빠른 댓글 응답',
  },
  {
    slide: 8,
    type: 'content-split',
    headline: '유기적 vs 유료 광고',
    left_title: '유기적 성장',
    left_body: '시간이 걸리지만\n충성 팬 확보.\n브랜드 신뢰 구축.',
    right_title: '유료 광고',
    right_body: '빠른 도달 확대.\n타겟팅 정밀 제어.\n즉각적 결과.',
    subtext: '둘을 병행할 때 시너지가 극대화됩니다',
  },
  {
    slide: 9,
    type: 'content-highlight',
    headline: '황금 게시 시간대',
    emphasis: '오전 7-9시\n오후 7-9시',
    body: '팔로워가 가장 활발한 시간대에\n게시하면 노출이 2-3배 상승합니다.',
    subtext: '인사이트 탭에서 내 계정 맞춤 시간 확인',
  },
  {
    slide: 10,
    type: 'content-image',
    headline: '비주얼 브랜딩의 힘',
    body: '일관된 색상, 폰트, 톤으로\n브랜드 아이덴티티를 구축하세요.',
    image_url: '',
  },
  {
    slide: 11,
    type: 'content-grid',
    headline: '4대 핵심 KPI',
    grid1_icon: '👁️',
    grid1_title: '도달률',
    grid1_desc: '콘텐츠를 본 유니크 계정 수',
    grid2_icon: '❤️',
    grid2_title: '참여율',
    grid2_desc: '좋아요·댓글·저장·공유',
    grid3_icon: '📈',
    grid3_title: '팔로워 증가',
    grid3_desc: '주간 순증 팔로워 수',
    grid4_icon: '💰',
    grid4_title: '전환율',
    grid4_desc: '프로필 방문 → 구매',
  },
  {
    slide: 12,
    type: 'content-bigdata',
    headline: '국내 인플루언서 마케팅 시장',
    bigdata_number: '1.2',
    bigdata_unit: '조원',
    body: '2025년 국내 인플루언서 마케팅 시장 규모.\n전년 대비 35% 성장 예상.',
    subtext: '출처: 한국인플루언서마케팅협회 2025',
  },
  {
    slide: 13,
    type: 'content-fullimage',
    headline: '성공 사례 분석',
    badge_text: '핵심 전략',
    body: '브랜드 컬러 통일 + 스토리텔링으로\n6개월 만에 팔로워 10만 달성',
    badge2_text: '주의할 점',
    body2: '팔로워 수보다 참여율이\n비즈니스 성과에 직결됩니다',
    image_url: '',
  },
  {
    slide: 14,
    type: 'cta',
    headline: '지금 바로\n시작하세요',
    cta_text: '팔로우하기',
    subtext: '매주 마케팅 인사이트를 전달합니다',
    tag1: '#인스타그램마케팅',
    tag2: '#SNS전략',
    tag3: '#디지털마케팅',
  },
];

// 플레이스홀더 치환 함수
function replacePlaceholders(html, data) {
  let result = html;
  const placeholders = [
    'headline', 'subtext', 'body', 'emphasis', 'cta_text',
    'slide_number', 'total_slides',
    'accent_color', 'account_name',
    'image_url', 'badge_text', 'badge_number', 'headline_label',
    'step1', 'step2', 'step3',
    'item1', 'item2', 'item3', 'item4', 'item5',
    'left_title', 'left_body', 'right_title', 'right_body',
    'grid1_icon', 'grid2_icon', 'grid3_icon', 'grid4_icon',
    'grid1_title', 'grid2_title', 'grid3_title', 'grid4_title',
    'grid1_desc', 'grid2_desc', 'grid3_desc', 'grid4_desc',
    'bigdata_number', 'bigdata_unit',
    'badge2_text', 'body2',
    'tag1', 'tag2', 'tag3',
  ];

  for (const key of placeholders) {
    const value = data[key] !== undefined ? String(data[key]) : '';
    const htmlValue = value.replace(/\n/g, '<br>');
    result = result.split(`{{${key}}}`).join(htmlValue);
  }
  return result;
}

async function generateSamples() {
  const style = 'clean';
  const outputDir = path.resolve(__dirname, '../sample-output/clean');
  const templateDir = path.resolve(__dirname, '../templates/clean');
  const accentColor = '#8BC34A';
  const accountName = 'marketing_tips';

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  console.log(`샘플 렌더링 시작: ${sampleSlides.length}개 슬라이드`);

  for (let i = 0; i < sampleSlides.length; i++) {
    const slide = sampleSlides[i];
    const slideNum = String(i + 1).padStart(2, '0');
    const templatePath = path.join(templateDir, `${slide.type}.html`);

    if (!fs.existsSync(templatePath)) {
      console.error(`  ❌ 템플릿 없음: ${slide.type}.html`);
      continue;
    }

    let html = fs.readFileSync(templatePath, 'utf-8');
    const data = {
      ...slide,
      slide_number: slideNum,
      total_slides: String(sampleSlides.length).padStart(2, '0'),
      accent_color: accentColor,
      account_name: accountName,
    };
    html = replacePlaceholders(html, data);

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1350 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const outputPath = path.join(outputDir, `slide-${slideNum}-${slide.type}.png`);
    await page.screenshot({
      path: outputPath,
      clip: { x: 0, y: 0, width: 1080, height: 1350 },
    });
    await page.close();

    console.log(`  ✅ slide-${slideNum}-${slide.type}.png`);
  }

  await browser.close();
  console.log(`\n샘플 완료! 경로: ${outputDir}`);
}

generateSamples().catch((err) => {
  console.error('샘플 생성 오류:', err);
  process.exit(1);
});
