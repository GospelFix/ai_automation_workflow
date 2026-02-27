// lib/classify-service.ts
import { query } from './db';
import { classifyData, classifyDataBatch, calculateConfidence } from './openai';
import { v4 as uuidv4 } from 'uuid';

// 단일 항목 분류
export async function classifyItem(
  item: string,
  classificationType: string,
  userId?: number
) {
  try {
    const startTime = Date.now();

    // OpenAI로 분류
    const classified = await classifyData(item, classificationType);

    // 신뢰도 계산
    const confidence = await calculateConfidence(item, classified);

    const executionTime = Date.now() - startTime;

    // MySQL에 저장
    const result = await query(
      `INSERT INTO classifications 
       (user_id, original_data, classified_data, classification_type, confidence_score, status)
       VALUES (?, ?, ?, ?, ?, 'success')`,
      [
        userId || null,
        item,
        JSON.stringify(classified),
        classificationType,
        confidence,
      ]
    );

    // 로그 기록
    await logAutomation('data_classify', 'success', `Classified: ${classificationType}`, executionTime);

    return {
      success: true,
      original: item,
      classified,
      confidence,
      executionTime,
    };
  } catch (error) {
    console.error('Classification Error:', error);
    
    // 실패 기록
    await query(
      `INSERT INTO classifications 
       (user_id, original_data, classification_type, error_message, status)
       VALUES (?, ?, ?, ?, 'failed')`,
      [
        userId || null,
        item,
        classificationType,
        String(error),
      ]
    );

    await logAutomation('data_classify', 'failed', String(error));

    throw error;
  }
}

// 배치 분류 (여러 항목 한 번에)
export async function classifyBatch(
  items: string[],
  classificationType: string,
  userId?: number
) {
  const batchId = uuidv4();
  const startTime = Date.now();

  try {
    // OpenAI 배치 분류
    const results = await classifyDataBatch(items, classificationType);

    let successCount = 0;
    let failureCount = 0;

    // 각 결과를 MySQL에 저장
    for (const result of results) {
      try {
        if (result.success) {
          const confidence = await calculateConfidence(result.original, result.classified);
          await query(
            `INSERT INTO classifications 
             (user_id, batch_id, original_data, classified_data, classification_type, confidence_score, status)
             VALUES (?, ?, ?, ?, ?, ?, 'success')`,
            [
              userId || null,
              batchId,
              result.original,
              JSON.stringify(result.classified),
              classificationType,
              confidence,
            ]
          );
          successCount++;
        } else {
          await query(
            `INSERT INTO classifications 
             (user_id, batch_id, original_data, classification_type, error_message, status)
             VALUES (?, ?, ?, ?, ?, 'failed')`,
            [userId || null, batchId, result.original, classificationType, result.error]
          );
          failureCount++;
        }
      } catch (insertError) {
        console.error('Insert Error:', insertError);
        failureCount++;
      }
    }

    const executionTime = Date.now() - startTime;

    // 로그 기록
    await logAutomation(
      'data_classify',
      'success',
      `Batch classified: ${successCount} success, ${failureCount} failed`,
      executionTime
    );

    return {
      batchId,
      totalItems: items.length,
      successCount,
      failureCount,
      executionTime,
      results,
    };
  } catch (error) {
    console.error('Batch Classification Error:', error);
    await logAutomation('data_classify', 'failed', `Batch error: ${String(error)}`);
    throw error;
  }
}

// CSV 파일 분류
export async function classifyCSV(
  csvContent: string,
  classificationType: string,
  userId?: number
) {
  try {
    // CSV 파싱 (간단한 방식)
    const lines = csvContent.split('\n').filter((line) => line.trim());
    const items = lines.slice(1); // 헤더 제외

    if (items.length === 0) {
      throw new Error('No data rows in CSV');
    }

    // 배치 분류
    const result = await classifyBatch(items, classificationType, userId);

    return {
      ...result,
      source: 'csv',
      totalRows: items.length,
    };
  } catch (error) {
    console.error('CSV Classification Error:', error);
    throw error;
  }
}

// JSON 파일 분류
export async function classifyJSON(
  jsonContent: string,
  classificationType: string,
  userId?: number
) {
  try {
    const data = JSON.parse(jsonContent);
    const items = Array.isArray(data) ? data : [data];

    if (items.length === 0) {
      throw new Error('No items in JSON');
    }

    // 배치 분류
    const result = await classifyBatch(
      items.map((item) => JSON.stringify(item)),
      classificationType,
      userId
    );

    return {
      ...result,
      source: 'json',
      totalItems: items.length,
    };
  } catch (error) {
    console.error('JSON Classification Error:', error);
    throw error;
  }
}

// 분류 결과 조회
export async function getClassificationResults(
  batchId: string,
  limit: number = 100,
  offset: number = 0
) {
  try {
    const results = await query(
      `SELECT * FROM classifications 
       WHERE batch_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [batchId, limit, offset]
    );

    const total = await query(
      `SELECT COUNT(*) as count FROM classifications WHERE batch_id = ?`,
      [batchId]
    );

    return {
      items: results,
      total: (total[0] as any).count,
      batchId,
    };
  } catch (error) {
    console.error('Query Error:', error);
    throw error;
  }
}

// 분류 통계
export async function getClassificationStats(userId?: number) {
  try {
    const query_string = userId
      ? `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
          ROUND(AVG(confidence_score), 3) as avg_confidence
         FROM classifications 
         WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`
      : `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
          ROUND(AVG(confidence_score), 3) as avg_confidence
         FROM classifications 
         WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`;

    const params = userId ? [userId] : [];
    const stats = await query(query_string, params);

    return stats[0] || {
      total: 0,
      success_count: 0,
      failed_count: 0,
      avg_confidence: 0,
    };
  } catch (error) {
    console.error('Stats Error:', error);
    throw error;
  }
}

// 로그 기록
async function logAutomation(
  type: string,
  status: string,
  message: string,
  executionTime: number = 0
) {
  try {
    await query(
      `INSERT INTO automation_logs (automation_type, status, message, execution_time_ms, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [type, status, message, executionTime]
    );
  } catch (error) {
    console.error('Logging Error:', error);
  }
}

export default {
  classifyItem,
  classifyBatch,
  classifyCSV,
  classifyJSON,
  getClassificationResults,
  getClassificationStats,
};
