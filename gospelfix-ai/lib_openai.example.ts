// lib/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 이메일 자동 응답 생성
export async function generateEmailResponse(emailSubject: string, emailBody: string, template?: string) {
  try {
    const prompt = `
당신은 전문적인 고객 서비스 담당자입니다.
다음 고객 이메일에 대해 간결하고 친절한 자동 응답을 작성하세요.

${template ? `[템플릿 가이드]: ${template}\n` : ''}

고객 이메일:
제목: ${emailSubject}
내용: ${emailBody}

자동 응답 (200자 이내):
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return response.choices[0].message.content || '자동 응답을 생성할 수 없습니다.';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

// 데이터 분류
export async function classifyData(data: string, classificationType: string) {
  try {
    const prompt = `
당신은 데이터 분류 전문가입니다.
다음 데이터를 "${classificationType}" 기준으로 분류하고, JSON 형식으로 결과를 반환하세요.

데이터:
${data}

분류 결과 (JSON):
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.5,
    });

    const result = response.choices[0].message.content || '';
    
    // JSON 파싱 시도
    try {
      return JSON.parse(result);
    } catch {
      return { raw: result, classified: true };
    }
  } catch (error) {
    console.error('OpenAI Classification Error:', error);
    throw error;
  }
}

// 배치 데이터 분류 (여러 항목 한 번에)
export async function classifyDataBatch(items: string[], classificationType: string) {
  const results = [];
  
  for (const item of items) {
    try {
      const classified = await classifyData(item, classificationType);
      results.push({
        original: item,
        classified,
        success: true,
      });
    } catch (error) {
      results.push({
        original: item,
        error: String(error),
        success: false,
      });
    }
  }
  
  return results;
}

// 신뢰도 점수 계산
export async function calculateConfidence(original: string, classified: any): Promise<number> {
  try {
    const prompt = `
다음 원본 데이터와 분류 결과 간의 신뢰도를 0-1 사이의 점수로 계산하세요.
더 정확한 분류일수록 높은 점수를 부여하세요.

원본: ${original}
분류: ${JSON.stringify(classified)}

신뢰도 점수 (0-1):
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 10,
      temperature: 0.3,
    });

    const scoreStr = response.choices[0].message.content || '0.5';
    return Math.min(Math.max(parseFloat(scoreStr), 0), 1);
  } catch (error) {
    console.error('Confidence Calculation Error:', error);
    return 0.5; // 기본값
  }
}

export default openai;
