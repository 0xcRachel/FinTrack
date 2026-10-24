/** Backend DTO mirrors — money as strings (DECIMAL 19,4 from Spring). */

export interface HealthStatus  { status: string; service: string; version: string; }
export interface DatabaseHealth{ status: string; product: string; dbVersion: string; }

/* ─── Auth ─────────────────────────────── */
export interface AuthRequest  { email: string; password: string; }
export interface RegisterRequest { email: string; password: string; fullName: string; }
export interface AuthResponse { token: string; email: string; userId: number; }

/* ─── Account ──────────────────────────── */
export type AccountType = "CASH" | "BANK" | "SAVINGS" | "CREDIT_CARD" | "CHECKING" | "INVESTMENT" | "OTHER";
export interface AccountDto {
  accountId: number;
  id?: number;
  name: string;
  accountType?: AccountType;
  type?: AccountType;
  balance?: string;
  currentBalance?: string | number;
  currencyCode: string;
  isArchived: boolean;
  openingBalance: string | number;
  description?: string;
  createdAt?: string;
}
export interface AccountCreateRequest {
  name: string;
  accountType: AccountType;
  openingBalance: string;
  currencyCode: string;
  description?: string;
}
export interface AccountUpdateRequest {
  name?: string;
  description?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/* ─── Category ─────────────────────────── */
export type CategoryType = "INCOME" | "EXPENSE";
export interface CategoryDto {
  categoryId: number;
  id?: number;
  name: string;
  categoryType?: CategoryType;
  type?: CategoryType;
  iconName?: string;
  icon?: string;
  colorHex?: string;
  color?: string;
  isArchived?: boolean;
}
export interface CategoryCreateRequest { name: string; type: CategoryType; icon?: string; color?: string; }
export interface CategoryUpdateRequest { name?: string; icon?: string; color?: string; }

/* ─── Transaction ──────────────────────── */
export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";
export interface TransactionDto {
  transactionId?: number;
  id?: number;
  transactionType?: TransactionType;
  type?: TransactionType;
  amount: string;
  currencyCode: string;
  transactionDate: string;
  description?: string;
  merchant?: string;
  categoryId?: number;
  categoryName?: string;
  sourceAccountId?: number;
  sourceAccountName?: string;
  destinationAccountId?: number;
  destinationAccountName?: string;
  createdAt?: string;
}
export interface TransactionCreateRequest {
  transactionType: TransactionType;
  amount: string;
  currencyCode: string;
  transactionDate: string;
  description?: string;
  merchant?: string;
  categoryId?: number;
  sourceAccountId?: number;
  destinationAccountId?: number;
}
export interface TransactionFilter {
  type?: TransactionType; categoryId?: number; accountId?: number;
  startDate?: string; endDate?: string; search?: string;
}
export interface TransactionPage {
  content: TransactionDto[]; totalElements: number;
  totalPages: number; number: number; size: number;
}

/* ─── Budget ───────────────────────────── */
export type PeriodType = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
export interface BudgetDto {
  id: number; name: string; limitAmount: string;
  spentAmount: string; remainingAmount: string;
  period: PeriodType; categoryId?: number; categoryName?: string;
  startDate: string; endDate?: string; isActive: boolean;
}
export interface BudgetCreateRequest {
  name: string; limitAmount: string; period: PeriodType;
  categoryId?: number; startDate: string; endDate?: string;
}
export interface BudgetUpdateRequest { name?: string; limitAmount?: string; endDate?: string; }
export interface BudgetPerformanceEntry {
  budgetId: number; budgetName: string;
  limitAmount: string; spentAmount: string; remainingAmount: string;
  utilizationPercent: number; categoryName?: string; period: PeriodType;
}
export interface BudgetPerformanceDto { entries: BudgetPerformanceEntry[]; period: string; }
export interface BudgetSummaryDto {
  totalBudget: string; totalSpent: string; totalRemaining: string;
  budgetCount: number; overBudgetCount: number;
}

/* ─── Savings Goal ─────────────────────── */
export type GoalStatus = "IN_PROGRESS" | "REACHED" | "ABANDONED";
export interface SavingsGoalDto {
  id: number; name: string; targetAmount: string;
  currentAmount: string; remainingAmount: string;
  progressPercent: number; deadline?: string;
  status: GoalStatus; description?: string; createdAt: string;
}
export interface SavingsGoalCreateRequest {
  name: string; targetAmount: string; deadline?: string; description?: string;
}
export interface SavingsGoalUpdateRequest { name?: string; targetAmount?: string; deadline?: string; description?: string; }
export interface ContributionCreateRequest { amount: string; note?: string; }
export interface ContributionDto { id: number; amount: string; note?: string; createdAt: string; }

/* ─── Dashboard ────────────────────────── */
export interface DashboardSummaryDto {
  periodStart?: string;
  periodEnd?: string;
  totalIncome: string;
  totalExpense: string;
  netCashFlow?: string;
  netSavings?: string;
  totalBalance: string;
  budgetUtilizationOverall?: number;
  savingsProgressOverall?: number;
  period?: string;
  accountCount?: number;
}
export interface RecentTransactionDto {
  id: number; type: TransactionType;
  amount: string; currencyCode: string;
  transactionDate: string; description?: string; merchant?: string;
  categoryName?: string; accountName?: string;
}
export interface DashboardRecentTransactionsDto { transactions: RecentTransactionDto[]; }

/* ─── Reports ──────────────────────────── */
export interface ExpenseBreakdownEntry { categoryId: number; categoryName: string; amount: string; percent: number; }
export interface ExpenseBreakdownDto   { entries: ExpenseBreakdownEntry[]; period: string; totalExpense: string; }
export interface CashFlowPoint         { date: string; income: string; expense: string; net: string; }
export interface CashFlowDto           { points: CashFlowPoint[]; period: string; }
export interface GoalProgressDto       { goals: SavingsGoalDto[]; }

/* ─── Settings ─────────────────────────── */
export interface SettingsDto {
  defaultCurrencyCode: string; dateFormat: string;
  language: string; theme: string; fullName?: string; email?: string;
}
export interface SettingsUpdateRequest {
  defaultCurrencyCode?: string; dateFormat?: string; language?: string; fullName?: string;
}

/* ─── Dashboard insights (server-computed) ─ */
export interface DashboardInsightsDto {
  periodStart: string;
  periodEnd: string;
  previousPeriodStart: string;
  previousPeriodEnd: string;
  totalIncome: string;
  totalExpense: string;
  netCashFlow: string;
  savingsRate: number | null;
  previousIncome: string;
  previousExpense: string;
  incomeChangePercent: number | null;
  expenseChangePercent: number | null;
  averageDailySpend: string;
  topCategoryName: string | null;
  topCategoryAmount: string | null;
  topCategoryPercent: number | null;
  budgetCount: number;
  overBudgetCount: number;
  nearLimitCount: number;
  activeGoals: number;
  completedGoals: number;
  topGoalName: string | null;
  topGoalProgress: number | null;
  topGoalRemaining: string | null;
  topGoalCurrency: string | null;
  mixedCurrencies: boolean;
  dominantCurrency: string | null;
}
