#!/usr/bin/env node
/**
 * Instagram 카드뉴스 렌더러
 * HTML 템플릿 → Puppeteer → PNG (1080×1350px)
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// CLI 인수 파싱
function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      result[key] = args[i + 1];
      i++;
    }
  }
  return result;
}

// 플레이스홀더 치환 함수
function replacePlaceholders(html, data) {
  let result = html;

  // 모든 플레이스홀더 목록
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
    // \n을 <br>로 치환
    const htmlValue = value.replace(/\n/g, '<br>');
    // 전역 치환
    result = result.split(`{{${key}}}`).join(htmlValue);
  }

  return result;
}

async function renderSlides(options) {
  const {
    slides: slidesPath,
    style,
    output: outputDir,
    accent,
    account,
  } = options;

  // slides.json 읽기
  const slidesData = JSON.parse(fs.readFileSync(slidesPath, 'utf-8'));
  const totalSlides = slidesData.length;

  // 출력 디렉토리 생성
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Puppeteer 실행
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  console.log(`렌더링 시작: ${totalSlides}개 슬라이드 (스타일: ${style})`);

  for (let i = 0; i < slidesData.length; i++) {
    const slide = slidesData[i];
    const slideNum = String(i + 1).padStart(2, '0');
    const templatePath = path.resolve(
      __dirname,
      `../templates/${style}/${slide.type}.html`
    );

    if (!fs.existsSync(templatePath)) {
      console.error(`템플릿 없음: ${templatePath}`);
      continue;
    }

    // HTML 읽기 및 플레이스홀더 치환
    let html = fs.readFileSync(templatePath, 'utf-8');
    const data = {
      ...slide,
      slide_number: slideNum,
      total_slides: String(totalSlides).padStart(2, '0'),
      accent_color: accent || '#8BC34A',
      account_name: account || 'my_account',
    };
    html = replacePlaceholders(html, data);

    // Puppeteer 페이지 렌더링
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1350 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const outputPath = path.join(outputDir, `slide-${slideNum}.png`);
    await page.screenshot({
      path: outputPath,
      clip: { x: 0, y: 0, width: 1080, height: 1350 },
    });
    await page.close();

    console.log(`  ✅ slide-${slideNum}.png (${slide.type})`);
  }

  await browser.close();
  console.log(`\n완료! 출력 경로: ${path.resolve(outputDir)}`);
}

// 메인 실행
const args = parseArgs(process.argv.slice(2));

if (!args.slides || !args.style || !args.output) {
  console.error('사용법: node render.js --slides <slides.json> --style <style> --output <dir> [--accent <color>] [--account <name>]');
  process.exit(1);
}

renderSlides({
  slides: args.slides,
  style: args.style,
  output: args.output,
  accent: args.accent,
  account: args.account,
}).catch((err) => {
  console.error('렌더링 오류:', err);
  process.exit(1);
});
