// types/index.ts

// 이메일 타입
export interface Email {
  id: number;
  gmail_message_id: string;
  sender_email: string;
  sender_name?: string;
  subject: string;
  body: string;
  received_at: Date;
  responded: boolean;
  response_content?: string;
  response_sent_at?: Date;
  response_template?: string;
  created_at: Date;
  updated_at: Date;
}

// 분류 데이터 타입
export interface Classification {
  id: number;
  user_id?: number;
  batch_id?: string;
  original_data: string;
  classified_data?: string;
  classification_type: string;
  confidence_score?: number;
  error_message?: string;
  status: 'pending' | 'success' | 'failed';
  created_at: Date;
  updated_at: Date;
}

// API 토큰 타입
export interface APIToken {
  id: number;
  user_id?: number;
  provider: 'gmail' | 'openai';
  access_token: string;
  refresh_token?: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

// 자동화 로그 타입
export interface AutomationLog {
  id: number;
  automation_type: 'email_response' | 'data_classify';
  status: 'success' | 'failed' | 'pending';
  message: string;
  error_details?: string;
  execution_time_ms?: number;
  created_at: Date;
}

// API 응답 타입
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 이메일 자동 응답 결과
export interface EmailResponseResult {
  success: boolean;
  messageId: string;
  senderEmail: string;
  responseContent: string;
  executionTime?: number;
}

// 분류 결과
export interface ClassificationResult {
  success: boolean;
  original: string;
  classified: any;
  confidence: number;
  executionTime: number;
}

// 배치 분류 결과
export interface BatchClassificationResult {
  batchId: string;
  totalItems: number;
  successCount: number;
  failureCount: number;
  executionTime: number;
  results: ClassificationResult[];
}

// 대시보드 통계
export interface DashboardStats {
  total_emails_processed: number;
  total_emails_auto_responded: number;
  total_data_classified: number;
  auto_response_rate: number;
  time_saved_hours: number;
}

// 사용자 설정
export interface AutomationSettings {
  id: number;
  user_id?: number;
  automation_type: 'email_response' | 'data_classify';
  is_enabled: boolean;
  config: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// 응답 템플릿
export interface ResponseTemplate {
  id: number;
  user_id?: number;
  template_name: string;
  template_category: 'real_estate' | 'ecommerce' | 'consulting' | 'general';
  content: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// 요청 바디 타입
export interface EmailAutoResponseRequest {
  messageId: string;
  accessToken: string;
  templateId?: string;
}

export interface ClassifyRequest {
  data: string;
  type: 'single' | 'batch' | 'csv' | 'json';
  classificationType: string;
  userId?: number;
}

export interface BatchClassifyRequest {
  items: string[];
  classificationType: string;
  userId?: number;
}

// OAuth 관련 타입
export interface GoogleOAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: 'Bearer';
}

// 쿼리 결과 타입
export interface QueryResult<T> {
  rows: T[];
  count: number;
  error?: string;
}
