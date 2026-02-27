-- Gospel Fix AI Automation Database Schema
-- MySQL 8.4.3 기준

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS gospel_fix_automation;
USE gospel_fix_automation;

-- ============================================
-- 1. 이메일 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS emails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gmail_message_id VARCHAR(255) UNIQUE NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  subject VARCHAR(500),
  body LONGTEXT,
  received_at TIMESTAMP,
  responded BOOLEAN DEFAULT FALSE,
  response_content LONGTEXT,
  response_sent_at TIMESTAMP NULL,
  response_template VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY idx_responded (responded),
  KEY idx_received_at (received_at),
  KEY idx_sender_email (sender_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. 데이터 분류 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS classifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  batch_id VARCHAR(255),
  original_data LONGTEXT NOT NULL,
  classified_data LONGTEXT,
  classification_type VARCHAR(100),
  confidence_score DECIMAL(3, 2),
  error_message TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY idx_user_id (user_id),
  KEY idx_batch_id (batch_id),
  KEY idx_classification_type (classification_type),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. API 토큰/세션 테이블 (Gmail OAuth)
-- ============================================
CREATE TABLE IF NOT EXISTS api_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  provider VARCHAR(50), -- 'gmail', 'openai' 등
  access_token LONGTEXT,
  refresh_token LONGTEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY idx_user_id (user_id),
  KEY idx_provider (provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. 자동화 로그 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS automation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  automation_type VARCHAR(50), -- 'email_response', 'data_classify'
  status VARCHAR(20), -- 'success', 'failed', 'pending'
  message TEXT,
  error_details LONGTEXT,
  execution_time_ms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  KEY idx_automation_type (automation_type),
  KEY idx_status (status),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. 자동화 설정 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS automation_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  automation_type VARCHAR(50), -- 'email_response', 'data_classify'
  is_enabled BOOLEAN DEFAULT TRUE,
  config JSON, -- 자동화 설정 (템플릿, 규칙 등)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_user_automation (user_id, automation_type),
  KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. 응답 템플릿 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS response_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  template_name VARCHAR(100),
  template_category VARCHAR(50), -- 'real_estate', 'ecommerce', 'consulting' 등
  content TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY idx_user_id (user_id),
  KEY idx_category (template_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. 대시보드 통계 테이블 (캐시)
-- ============================================
CREATE TABLE IF NOT EXISTS dashboard_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  total_emails_processed INT DEFAULT 0,
  total_emails_auto_responded INT DEFAULT 0,
  total_data_classified INT DEFAULT 0,
  auto_response_rate DECIMAL(5, 2), -- 퍼센트
  time_saved_hours INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_user (user_id),
  KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 인덱스 최적화 (쿼리 성능)
-- ============================================

-- 이메일 조회 최적화
CREATE INDEX idx_emails_status_date ON emails(responded, received_at DESC);

-- 분류 조회 최적화
CREATE INDEX idx_classifications_status_date ON classifications(status, created_at DESC);

-- 로그 조회 최적화
CREATE INDEX idx_logs_type_status_date ON automation_logs(automation_type, status, created_at DESC);

-- ============================================
-- 초기 데이터 (선택사항)
-- ============================================

-- 기본 응답 템플릿
INSERT INTO response_templates (user_id, template_name, template_category, content, description) VALUES
(1, '부동산 조회 응답', 'real_estate', '안녕하세요. 관심 있는 매물 정보를 확인해드리겠습니다.\n\n위치: {location}\n평수: {area}\n가격: {price}\n\n더 자세한 정보는 전화로 연락주세요.', '부동산 중개소용 자동 응답'),
(1, '쇼핑몰 주문 응답', 'ecommerce', '주문해주셔서 감사합니다!\n\n주문번호: {order_id}\n배송예정: {delivery_date}\n\n궁금한 점은 언제든 문의해주세요.', '이커머스 주문 확인용'),
(1, '컨설팅 상담 응답', 'consulting', '상담 요청 감사합니다.\n\n저희 팀이 검토한 후 24시간 내 연락드리겠습니다.\n\n임시 프로젝트 번호: {project_id}', '컨설팅 회사용 자동 응답');

-- ============================================
-- 뷰 생성 (쿼리 간소화)
-- ============================================

-- 일일 이메일 통계
CREATE OR REPLACE VIEW daily_email_stats AS
SELECT 
  DATE(received_at) as date,
  COUNT(*) as total_emails,
  SUM(CASE WHEN responded THEN 1 ELSE 0 END) as auto_responded,
  ROUND(SUM(CASE WHEN responded THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as response_rate
FROM emails
GROUP BY DATE(received_at);

-- 일일 분류 통계
CREATE OR REPLACE VIEW daily_classify_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_classified,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(AVG(confidence_score), 2) as avg_confidence
FROM classifications
GROUP BY DATE(created_at);

-- ============================================
-- 완료
-- ============================================
-- 모든 테이블이 성공적으로 생성되었습니다.
-- 사용: mysql -u root -p gospel_fix_automation < database/schema.sql
