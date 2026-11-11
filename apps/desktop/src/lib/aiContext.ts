import { apiGet } from './api';
import { monthRange } from './format';
import type { Language } from './i18n';
import type {
  AccountDto, DashboardInsightsDto, DashboardSummaryDto, PageResponse,
  TransactionPage,
} from '../types/api';

interface BudgetRow {
  budgetId: number; name: string; categoryName: string; amount: string;
  currencyCode: string; periodType: string; actualSpending: string;
  utilizationPercent: number | null; warning: boolean; exceeded: boolean;
}
interface GoalRow {
  goalId: number; name: string; targetAmount: string; savedAmount: string;
  progressPercent: number | null; currencyCode: string; targetDate?: string;
  status: string;
}
interface Breakdown {
  categories: { categoryName: string; amount: string; percentOfExpense: number }[];
  totalExpense: string;
}

export interface FinancialSnapshot {
  generatedAt: string;
  period: { startDate: string; endDate: string };
  currency: string;
  cashFlow: {
    totalBalance: number; totalIncome: number; totalExpense: number; netCashFlow: number;
    savingsRate: number | null;
  };
  budgetHealth: {
    total: number; overBudget: number; nearLimit: number;
    items: { name: string; category: string; limit: number; spent: number; utilizationPercent: number }[];
  };
  goals: { name: string; target: number; saved: number; progressPercent: number; targetDate?: string; status: string }[];
  accounts: { name: string; type: string; currency: string; balance: number }[];
  topSpendingCategories: { category: string; amount: number; sharePercent: number }[];
  recentTransactions: { date: string; type: string; amount: number; category: string; merchant: string }[];
}

const num = (value: string | number | null | undefined) => Number(value ?? 0) || 0;

export async function buildFinancialSnapshot(
  currency: string,
  signal: AbortSignal,
): Promise<FinancialSnapshot> {
  const range = monthRange(0);
  const query = `startDate=${range.startDate}&endDate=${range.endDate}&currency=${currency}`;
  const [summary, insights, budgets, goals, accounts, transactions, breakdown] = await Promise.all([
    apiGet<DashboardSummaryDto>(`/dashboard/summary?${query}`, signal),
    apiGet<DashboardInsightsDto>(`/dashboard/insights?${query}`, signal),
    apiGet<BudgetRow[]>('/budgets', signal),
    apiGet<PageResponse<GoalRow>>('/savings-goals?size=100', signal),
    apiGet<PageResponse<AccountDto>>('/accounts?size=100', signal),
    apiGet<TransactionPage>('/transactions?size=12&sort=transactionDate,desc', signal),
    apiGet<Breakdown>(`/dashboard/expense-breakdown?${query}`, signal),
  ]);

  const activeBudgets = budgets.filter(budget => budget.currencyCode === currency);
  const activeGoals = (goals.content ?? []).filter(goal => goal.status !== 'ARCHIVED' && goal.currencyCode === currency);
  const activeAccounts = (accounts.content ?? []).filter(account => !account.isArchived && account.currencyCode === currency);
  const recent = (transactions.content ?? []).filter(row => row.currencyCode === currency);

  return {
    generatedAt: new Date().toISOString(),
    period: { startDate: range.startDate, endDate: range.endDate },
    currency,
    cashFlow: {
      totalBalance: num(summary.totalBalance),
      totalIncome: num(summary.totalIncome),
      totalExpense: num(summary.totalExpense),
      netCashFlow: num(summary.netCashFlow),
      savingsRate: insights.savingsRate != null ? Math.round(insights.savingsRate) : null,
    },
    budgetHealth: {
      total: activeBudgets.length,
      overBudget: activeBudgets.filter(budget => budget.exceeded).length,
      nearLimit: activeBudgets.filter(budget => budget.warning || num(budget.utilizationPercent) >= 80).length,
      items: activeBudgets.slice(0, 12).map(budget => ({
        name: budget.name,
        category: budget.categoryName,
        limit: num(budget.amount),
        spent: num(budget.actualSpending),
        utilizationPercent: Math.round(num(budget.utilizationPercent)),
      })),
    },
    goals: activeGoals.slice(0, 8).map(goal => ({
      name: goal.name,
      target: num(goal.targetAmount),
      saved: num(goal.savedAmount),
      progressPercent: Math.round(num(goal.progressPercent)),
      targetDate: goal.targetDate,
      status: goal.status,
    })),
    accounts: activeAccounts.map(account => ({
      name: account.name,
      type: String(account.accountType ?? ''),
      currency: account.currencyCode,
      balance: num(account.currentBalance),
    })),
    topSpendingCategories: (breakdown.categories ?? []).slice(0, 6).map(category => ({
      category: category.categoryName,
      amount: num(category.amount),
      sharePercent: Math.round(num(category.percentOfExpense)),
    })),
    recentTransactions: recent.map(row => ({
      date: row.transactionDate,
      type: row.transactionType || 'EXPENSE',
      amount: num(row.amount),
      category: row.categoryName || '',
      merchant: row.merchant || row.description || '',
    })),
  };
}

export function buildSystemPrompt(lang: Language, snapshot: FinancialSnapshot): string {
  const vi = lang === 'vi';
  return [
    vi
      ? 'Bạn là "FinTrack AI", cố vấn tài chính cá nhân trong ứng dụng FinTrack. Bạn phân tích dữ liệu thật của người dùng và đưa ra lời khuyên thực tế, thận trọng, dễ làm theo.'
      : 'You are "FinTrack AI", the personal finance advisor inside FinTrack. You analyze the user\'s real data and give practical, prudent, actionable advice.',
    vi
      ? 'Quy tắc: trả lời bằng tiếng Việt; dùng markdown đơn giản (## tiêu đề, - bullet, **in đậm**); KHÔNG dùng bảng; luôn nêu số tiền cụ thể kèm đơn vị tiền tệ; không bịa số liệu còn thiếu; không hứa lợi nhuận đầu tư; nhắc người dùng rằng đây là gợi ý, không phải tư vấn đầu tư chuyên nghiệp.'
      : 'Rules: answer in English; use simple markdown (## headings, - bullets, **bold**); NO tables; quote concrete amounts with the currency; never invent missing data; never promise investment returns; remind the user this is guidance, not professional investment advice.',
    vi
      ? `Dữ liệu tài chính hiện tại của người dùng (JSON, kỳ ${snapshot.period.startDate} → ${snapshot.period.endDate}, đơn vị ${snapshot.currency}):\n${JSON.stringify(snapshot)}`
      : `The user's current financial data (JSON, period ${snapshot.period.startDate} → ${snapshot.period.endDate}, currency ${snapshot.currency}):\n${JSON.stringify(snapshot)}`,
  ].join('\n\n');
}

export function analysisRequest(lang: Language): string {
  return lang === 'vi'
    ? 'Hãy phân tích toàn diện báo cáo tài chính của tôi. Trình bày: 1) Tóm tắt sức khỏe tài chính trong 2-3 câu; 2) Ba điểm đáng chú ý nhất; 3) Kế hoạch tiết kiệm cụ thể cho 30 ngày tới, chia theo tuần và số tiền cần tiết kiệm mỗi tuần; 4) Rủi ro hoặc dấu hiệu cần cảnh báo; 5) Ba hành động tôi nên làm ngay hôm nay.'
    : 'Analyze my financial report in depth. Cover: 1) a 2-3 sentence financial health summary; 2) the three most notable findings; 3) a concrete 30-day savings plan split by week with amounts; 4) risks or warning signs; 5) three actions I should take today.';
}
