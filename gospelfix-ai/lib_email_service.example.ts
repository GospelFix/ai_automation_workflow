// lib/email-service.ts
import { query } from './db';
import { generateEmailResponse } from './openai';
import { google } from 'googleapis';

const gmail = google.gmail('v1');

// 이메일 자동 응답 처리
export async function processEmailAutoResponse(
  messageId: string,
  accessToken: string,
  templateId?: string
) {
  try {
    // 1. Gmail에서 이메일 내용 조회
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      auth,
    });

    if (!message.data) {
      throw new Error('Message not found');
    }

    const headers = message.data.payload?.headers || [];
    const subject = headers.find((h) => h.name === 'Subject')?.value || '(No subject)';
    const from = headers.find((h) => h.name === 'From')?.value || '';
    const senderEmail = extractEmail(from);

    // 메시지 본문 추출
    let body = '';
    if (message.data.payload?.parts) {
      body = message.data.payload.parts
        .filter((p) => p.mimeType === 'text/plain')
        .map((p) => Buffer.from(p.body?.data || '', 'base64').toString())
        .join('\n');
    } else {
      body = Buffer.from(message.data.payload?.body?.data || '', 'base64').toString();
    }

    // 2. MySQL에 저장
    const insertResult = await query(
      `INSERT INTO emails (gmail_message_id, sender_email, sender_name, subject, body, received_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE updated_at = NOW()`,
      [messageId, senderEmail, extractName(from), subject, body]
    );

    // 3. OpenAI로 자동 응답 생성
    const responseContent = await generateEmailResponse(subject, body, templateId);

    // 4. 자동 응답 발송
    const replyResult = await sendEmailReply(
      auth,
      messageId,
      senderEmail,
      subject,
      responseContent
    );

    // 5. 응답 기록 업데이트
    await query(
      `UPDATE emails 
       SET responded = TRUE, response_content = ?, response_sent_at = NOW()
       WHERE gmail_message_id = ?`,
      [responseContent, messageId]
    );

    // 6. 로그 기록
    await logAutomation('email_response', 'success', `Email ${messageId} auto-responded`);

    return {
      success: true,
      messageId,
      senderEmail,
      responseContent,
    };
  } catch (error) {
    console.error('Email Auto Response Error:', error);
    await logAutomation('email_response', 'failed', String(error));
    throw error;
  }
}

// Gmail로 답장 발송
async function sendEmailReply(
  auth: any,
  originalMessageId: string,
  toEmail: string,
  originalSubject: string,
  replyBody: string
) {
  try {
    const subject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
    
    const message = [
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      `In-Reply-To: <${originalMessageId}@mail.gmail.com>`,
      `References: <${originalMessageId}@mail.gmail.com>`,
      '',
      replyBody,
    ].join('\n');

    const encodedMessage = Buffer.from(message).toString('base64');

    await gmail.users.messages.send({
      userId: 'me',
      auth,
      requestBody: {
        raw: encodedMessage,
        threadId: originalMessageId,
      },
    });

    return true;
  } catch (error) {
    console.error('Email Send Error:', error);
    throw error;
  }
}

// 배치 처리 - 미응답 이메일 자동 처리
export async function processPendingEmails(accessToken: string, limit: number = 10) {
  try {
    const pendingEmails = await query(
      `SELECT id, gmail_message_id FROM emails 
       WHERE responded = FALSE 
       LIMIT ?`,
      [limit]
    );

    const results = [];
    for (const email of pendingEmails as any[]) {
      try {
        const result = await processEmailAutoResponse(email.gmail_message_id, accessToken);
        results.push(result);
      } catch (error) {
        results.push({
          messageId: email.gmail_message_id,
          success: false,
          error: String(error),
        });
      }
    }

    return {
      totalProcessed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  } catch (error) {
    console.error('Batch Processing Error:', error);
    throw error;
  }
}

// 이메일 통계 조회
export async function getEmailStats() {
  try {
    const stats = await query(
      `SELECT 
        COUNT(*) as total_emails,
        SUM(CASE WHEN responded THEN 1 ELSE 0 END) as auto_responded,
        ROUND(SUM(CASE WHEN responded THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as response_rate
       FROM emails
       WHERE received_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );

    return stats[0] || { total_emails: 0, auto_responded: 0, response_rate: 0 };
  } catch (error) {
    console.error('Stats Query Error:', error);
    throw error;
  }
}

// 유틸리티: 이메일에서 주소 추출
function extractEmail(emailString: string): string {
  const match = emailString.match(/<(.+?)>/);
  return match ? match[1] : emailString;
}

// 유틸리티: 이메일에서 이름 추출
function extractName(emailString: string): string {
  const match = emailString.match(/^([^<]+)</);
  return match ? match[1].trim() : '';
}

// 로그 기록
async function logAutomation(type: string, status: string, message: string) {
  try {
    await query(
      `INSERT INTO automation_logs (automation_type, status, message, created_at)
       VALUES (?, ?, ?, NOW())`,
      [type, status, message]
    );
  } catch (error) {
    console.error('Logging Error:', error);
  }
}

export default {
  processEmailAutoResponse,
  processPendingEmails,
  getEmailStats,
};
