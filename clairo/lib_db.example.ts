// ============================================================
// Clairo - Supabase 클라이언트 및 DB 헬퍼
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type {
  Profile,
  Client,
  Income,
  Expense,
  Contract,
  Invoice,
  TaxReport,
} from './lib_types.example';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 클라이언트 사이드용
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 서버 사이드용 (RLS 우회 - 서버에서만 사용)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── 수입 관련 쿼리 ────────────────────────────────────────

// 특정 기간 수입 조회
export async function getIncomesByPeriod(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Income[]> {
  const { data, error } = await supabase
    .from('incomes')
    .select('*, clients(name)')
    .eq('user_id', userId)
    .gte('income_date', startDate)
    .lte('income_date', endDate)
    .order('income_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// 월별 수입 합계
export async function getMonthlyIncomeSummary(
  userId: string,
  year: number
): Promise<Array<{ month: string; total: number; count: number }>> {
  const { data, error } = await supabase.rpc('get_monthly_income_summary', {
    p_user_id: userId,
    p_year: year,
  });

  if (error) throw error;
  return data ?? [];
}

// 수입 생성
export async function createIncome(
  income: Omit<Income, 'id' | 'created_at' | 'updated_at'>
): Promise<Income> {
  // 실수령액 자동 계산
  const netAmount = income.amount - income.tax_withheld - income.vat_amount;

  const { data, error } = await supabase
    .from('incomes')
    .insert({ ...income, net_amount: netAmount })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── 지출 관련 쿼리 ────────────────────────────────────────

// 특정 기간 지출 조회
export async function getExpensesByPeriod(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// 카테고리별 지출 집계
export async function getExpensesByCategory(
  userId: string,
  year: number
): Promise<Array<{ category: string; total: number; deductible_total: number }>> {
  const { data, error } = await supabase.rpc('get_expenses_by_category', {
    p_user_id: userId,
    p_year: year,
  });

  if (error) throw error;
  return data ?? [];
}

// ── 계약 관련 쿼리 ────────────────────────────────────────

// 활성 계약 조회
export async function getActiveContracts(userId: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*, clients(name, company)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('end_date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// 계약서 저장 (파일 업로드 + DB 저장)
export async function saveContract(params: {
  userId: string;
  file: File;
  contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at' | 'file_url'>;
}): Promise<Contract> {
  // 1. 파일 업로드
  const filePath = `${params.userId}/contracts/${Date.now()}_${params.file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('contracts')
    .upload(filePath, params.file);

  if (uploadError) throw uploadError;

  // 2. 파일 URL 조회
  const { data: { publicUrl } } = supabase.storage
    .from('contracts')
    .getPublicUrl(filePath);

  // 3. DB 저장
  const { data, error } = await supabase
    .from('contracts')
    .insert({
      ...params.contractData,
      user_id: params.userId,
      file_url: publicUrl,
      file_name: params.file.name,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── 대시보드 요약 조회 ────────────────────────────────────
export async function getDashboardSummary(userId: string): Promise<{
  current_month_income: number;
  current_month_expense: number;
  ytd_income: number;
  ytd_expense: number;
  active_contracts: number;
  pending_invoices: number;
  upcoming_tax_deadline: string | null;
}> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const yearStart = `${currentYear}-01-01`;
  const today = now.toISOString().split('T')[0];

  const [
    { data: monthIncomes },
    { data: ytdIncomes },
    { data: monthExpenses },
    { data: ytdExpenses },
    { count: activeContracts },
    { count: pendingInvoices },
  ] = await Promise.all([
    supabase
      .from('incomes')
      .select('amount')
      .eq('user_id', userId)
      .gte('income_date', monthStart)
      .lte('income_date', today),
    supabase
      .from('incomes')
      .select('amount')
      .eq('user_id', userId)
      .gte('income_date', yearStart)
      .lte('income_date', today),
    supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .gte('expense_date', monthStart)
      .lte('expense_date', today),
    supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .gte('expense_date', yearStart)
      .lte('expense_date', today),
    supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active'),
    supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['sent', 'overdue']),
  ]);

  const sum = (arr: Array<{ amount: number }> | null) =>
    (arr ?? []).reduce((acc, r) => acc + r.amount, 0);

  return {
    current_month_income: sum(monthIncomes),
    current_month_expense: sum(monthExpenses),
    ytd_income: sum(ytdIncomes),
    ytd_expense: sum(ytdExpenses),
    active_contracts: activeContracts ?? 0,
    pending_invoices: pendingInvoices ?? 0,
    upcoming_tax_deadline: null, // getTaxDeadlines()로 별도 계산
  };
}
