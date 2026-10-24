import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, CalendarDays,
  CircleAlert, Download, Layers3, LoaderCircle, RefreshCw, ShieldCheck,
  Sparkles, Target, TrendingUp, Wallet,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { API_BASE_URL, apiGet, ensureAuthenticated, getToken } from '../../lib/api';
import { categoryLabel } from '../../lib/format';
import type { Language } from '../../lib/i18n';
import type { AccountDto, DashboardSummaryDto, PageResponse } from '../../types/api';
import { useToast } from '../ui/ToastProvider';
import './AnalyticsPages.css';

type Amount = string | number;
type Destination = 'transactions' | 'budgets' | 'goals' | 'reports';
type AnalyticsProps = {
  currentLang: Language;
  currency?: string;
  onNavigate?: (destination: Destination) => void;
};
interface MonthlyPoint { month: string; income: Amount; expense: Amount; net: Amount }
interface CategoryRow { categoryId: string; categoryName: string; type: 'INCOME' | 'EXPENSE'; amount: Amount }
interface BudgetRow {
  budgetId: number; name: string; categoryName: string;
  budgetAmount: Amount; actualSpending: Amount; utilizationPercent: number | null;
}
interface GoalRow {
  goalId: number; name: string; targetAmount: Amount; savedAmount: Amount;
  progressPercent: number; currencyCode: string; targetDate?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
}
interface ReportData { months: MonthlyPoint[]; categories: CategoryRow[]; currencies: string[] }
interface InsightData {
  summary: DashboardSummaryDto; categories: CategoryRow[];
  budgets: BudgetRow[]; goals: GoalRow[]; currencies: string[];
}

const PALETTE = ['#535f3c', '#b6cc7b', '#d9dfbc', '#c49c71', '#999f95', '#d4c6b8', '#879a9c'];
const amount = (value: Amount | undefined | null) => Number(value ?? 0);
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const localeFor = (language: Language) => language === 'vi' ? 'vi-VN' : 'en-US';
const money = (value: number, language: Language, currency: string) =>
  new Intl.NumberFormat(localeFor(language), { style: 'currency', currency, maximumFractionDigits: currency === 'VND' ? 0 : 2 }).format(value);
const percent = (value: number, language: Language) =>
  new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: 1 }).format(value) + '%';
const normalizedMonth = (month: string) => {
  const [year, number] = month.split('-');
  return `${year}-${String(Number(number)).padStart(2, '0')}`;
};

function useAnalyticsData<T>(loader: (signal: AbortSignal) => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    loader(controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(() => {
      if (!controller.signal.aborted) { setFailed(true); setData(null); }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
    // The request identity is represented by key; the loader closes over that range.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, revision]);
  return { data, loading, failed, retry: () => setRevision(value => value + 1) };
}

function AnalyticsState({ loading, vi, onRetry }: { loading: boolean; vi: boolean; onRetry: () => void }) {
  return <div className="wa-state" role={loading ? 'status' : 'alert'}>
    <span className="wa-state-icon">{loading ? <LoaderCircle className="wa-spin" size={26} /> : <CircleAlert size={26} />}</span>
    <h2>{loading ? (vi ? 'Đang kết nối những con số…' : 'Connecting the numbers…') : (vi ? 'Chưa thể tải dữ liệu' : 'Your data is temporarily unavailable')}</h2>
    <p>{loading ? (vi ? 'Báo cáo được tính từ giao dịch bạn đã ghi nhận.' : 'Your reports are calculated from recorded transactions.') : (vi ? 'Kiểm tra kết nối với máy chủ rồi thử lại.' : 'Check your connection to the server, then try again.')}</p>
    {!loading && <button className="wa-button wa-button-dark" onClick={onRetry}><RefreshCw size={15} />{vi ? 'Thử lại' : 'Try again'}</button>}
  </div>;
}

function EmptyChart({ vi, children }: { vi: boolean; children?: ReactNode }) {
  return <div className="wa-empty">
    <span className="wa-empty-icon"><BarChart3 size={27} strokeWidth={1.5} /></span>
    <h3>{vi ? 'Câu chuyện của bạn bắt đầu từ đây' : 'Your story starts here'}</h3>
    <p>{children ?? (vi ? 'Thêm giao dịch để nhìn thấy xu hướng tài chính của bạn.' : 'Record a transaction to start seeing your financial patterns.')}</p>
  </div>;
}

function currencyOptions(accounts: AccountDto[]): string[] {
  return [...new Set(accounts.filter(account => !account.isArchived).map(account => account.currencyCode))].sort();
}

function CurrencyLens({ currencies, value, onChange, vi }: {
  currencies: string[]; value: string; onChange: (code: string) => void; vi: boolean;
}) {
  if (currencies.length <= 1) return null;
  return <div className="ft-lens-bar wa-currency-lens">
    <div className="ft-lens-copy"><span>{vi ? 'ĐANG XEM THEO' : 'VIEWING IN'}</span><b>{value}</b></div>
    <div className="ft-lens-options" role="group" aria-label={vi ? 'Chọn loại tiền cho báo cáo' : 'Choose the report currency'}>
      {currencies.map(code => <button key={code} type="button" aria-pressed={code === value} className={code === value ? 'active' : ''} onClick={() => onChange(code)}>{code}</button>)}
    </div>
    <p>{vi ? `Toàn bộ số liệu bên dưới chỉ tính giao dịch và số dư bằng ${value}.` : `Every figure below uses only your ${value} transactions and balances.`}</p>
  </div>;
}

export function ReportsPage({ currentLang, currency = 'VND' }: AnalyticsProps) {
  const vi = currentLang === 'vi';
  const notify = useToast();
  const [period, setPeriod] = useState(6);
  const [lens, setLens] = useState(currency);
  const [exporting, setExporting] = useState(false);
  useEffect(() => { setLens(currency); }, [currency]);
  const range = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - period + 1, 1);
    return {
      start, end,
      query: `startDate=${dateKey(start)}&endDate=${dateKey(end)}&currency=${lens}`,
    };
  }, [period, lens]);
  const { data, loading, failed, retry } = useAnalyticsData<ReportData>(async signal => {
    const [months, categories, allAccounts] = await Promise.all([
      apiGet<MonthlyPoint[]>(`/reports/income-expenses?${range.query}`, signal),
      apiGet<CategoryRow[]>(`/reports/category-breakdown?${range.query}`, signal),
      apiGet<PageResponse<AccountDto>>('/accounts?size=100', signal),
    ]);
    return { months, categories, currencies: currencyOptions(allAccounts.content) };
  }, range.query);
  const chart = useMemo(() => {
    if (!data) return [];
    const points = new Map(data.months.map(point => [normalizedMonth(point.month), point]));
    return Array.from({ length: period }, (_, index) => {
      const date = new Date(range.start.getFullYear(), range.start.getMonth() + index, 1);
      const key = dateKey(date).slice(0, 7);
      const point = points.get(key);
      return {
        month: key,
        label: date.toLocaleDateString(localeFor(currentLang), { month: 'short', ...(period === 12 ? { year: '2-digit' as const } : {}) }),
        income: amount(point?.income), expense: amount(point?.expense),
      };
    });
  }, [data, period, range, currentLang]);
  const totalIncome = data?.months.reduce((sum, row) => sum + amount(row.income), 0) ?? 0;
  const totalExpense = data?.months.reduce((sum, row) => sum + amount(row.expense), 0) ?? 0;
  const net = totalIncome - totalExpense;
  const retained = totalIncome > 0 ? net / totalIncome * 100 : null;
  const categories = (data?.categories ?? []).filter(row => row.type === 'EXPENSE' && amount(row.amount) > 0)
    .sort((a, b) => amount(b.amount) - amount(a.amount));
  const categoryTotal = categories.reduce((sum, row) => sum + amount(row.amount), 0);
  const topCategory = categories[0];
  const hasActivity = totalIncome > 0 || totalExpense > 0;
  const displayCurrency = lens;
  const fmt = (value: number) => money(value, currentLang, displayCurrency);

  async function exportCsv() {
    setExporting(true);
    try {
      await ensureAuthenticated();
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/reports/export/summary?${range.query}`, {
        headers: { Accept: 'text/csv', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!response.ok) throw new Error('Export failed');
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `fintrack-report-${dateKey(range.start)}-${dateKey(range.end)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify.success(vi ? 'Đã chuẩn bị tệp CSV cho khoảng thời gian đã chọn.' : 'Your CSV is ready for the selected period.');
    } catch { notify.error(vi ? 'Chưa thể xuất báo cáo. Vui lòng thử lại.' : 'The report could not be exported. Please try again.'); }
    finally { setExporting(false); }
  }

  return <section className="wa-page wa-reports">
    <header className="wa-page-heading">
      <div><div className="wa-eyebrow"><span />{vi ? 'GÓC NHÌN RÕ RÀNG HƠN' : 'THE BIGGER PICTURE'}</div>
        <h1>{vi ? 'Hiểu tiền. Hiểu mình.' : 'Know your money. Know yourself.'}</h1>
        <p>{vi ? 'Những con số có ý nghĩa, cho những quyết định tốt hơn.' : 'A clearer view of your money. A better way forward.'}</p></div>
      <button className="wa-button wa-button-dark" onClick={exportCsv} disabled={exporting || loading || failed}>
        {exporting ? <LoaderCircle size={16} className="wa-spin" /> : <Download size={16} />}
        {exporting ? (vi ? 'Đang xuất…' : 'Exporting…') : (vi ? 'Xuất báo cáo tổng hợp' : 'Export full report')}
      </button>
    </header>
    <div className="wa-toolbar">
      <div className="wa-period-group" aria-label={vi ? 'Khoảng thời gian báo cáo' : 'Report period'}>
        {[1, 3, 6, 12].map(value => <button key={value} aria-pressed={period === value} className={period === value ? 'wa-active' : ''} onClick={() => setPeriod(value)}>{value} {vi ? 'tháng' : value === 1 ? 'month' : 'months'}</button>)}
      </div>
      <span className="wa-date-range"><CalendarDays size={15} />
        {range.start.toLocaleDateString(localeFor(currentLang), { day: 'numeric', month: 'short', year: 'numeric' })} — {range.end.toLocaleDateString(localeFor(currentLang), { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
    </div>
    {loading || failed || !data ? <AnalyticsState loading={loading} vi={vi} onRetry={retry} /> : <>
      <CurrencyLens currencies={data.currencies} value={lens} onChange={setLens} vi={vi} />
      <div className="wa-stat-grid">
        <article className="wa-stat"><span className="wa-stat-label"><span className="wa-stat-icon"><ArrowDownLeft size={17} /></span>{vi ? 'Tổng thu nhập' : 'Total income'}</span><strong>{fmt(totalIncome)}</strong><span className="wa-stat-foot">{vi ? 'Tiền vào trong kỳ' : 'Money in this period'}</span></article>
        <article className="wa-stat"><span className="wa-stat-label"><span className="wa-stat-icon wa-icon-tan"><ArrowUpRight size={17} /></span>{vi ? 'Tổng chi tiêu' : 'Total spending'}</span><strong>{fmt(totalExpense)}</strong><span className="wa-stat-foot">{vi ? 'Tiền ra trong kỳ' : 'Money out this period'}</span></article>
        <article className="wa-stat wa-stat-accent"><span className="wa-stat-label"><span className="wa-stat-icon"><TrendingUp size={17} /></span>{vi ? 'Dòng tiền ròng' : 'Net cash flow'}</span><strong>{fmt(net)}</strong><span className="wa-stat-foot">{retained === null ? (vi ? 'Chưa có thu nhập trong kỳ' : 'No income recorded this period') : (vi ? `${percent(retained, currentLang)} thu nhập được giữ lại` : `${percent(retained, currentLang)} of income retained`)}</span></article>
      </div>
      <div className="wa-report-main">
        <article className="wa-card wa-flow-card">
          <div className="wa-card-heading"><div><span className="wa-kicker">{vi ? 'DÒNG TIỀN' : 'CASH FLOW'}</span><h2>{vi ? 'Tiền của bạn đi đâu?' : 'Where does your money go?'}</h2></div><span className="wa-subtle-badge">{displayCurrency}</span></div>
          <div className="wa-legend"><span><i style={{ background: '#535f3c' }} />{vi ? 'Thu nhập' : 'Income'}</span><span><i style={{ background: '#c4d798' }} />{vi ? 'Chi tiêu' : 'Spending'}</span></div>
          {hasActivity ? <div className="wa-bar-chart" role="img" aria-label={vi ? 'Biểu đồ so sánh thu nhập và chi tiêu theo tháng' : 'Monthly income and spending comparison'}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} barGap={5} margin={{ top: 18, right: 4, left: 0, bottom: 0 }} accessibilityLayer>
                <CartesianGrid stroke="#eaece3" vertical={false} strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#818677', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#818677', fontSize: 10 }} width={55} tickFormatter={value => new Intl.NumberFormat(localeFor(currentLang), { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value))} />
                <Tooltip cursor={{ fill: '#f2f3ec', radius: 8 }} contentStyle={{ border: '1px solid #e5e7dc', borderRadius: 14, fontSize: 12, boxShadow: '0 8px 24px #20271b0a' }} formatter={(value, name) => [fmt(Number(value)), name === 'income' ? (vi ? 'Thu nhập' : 'Income') : (vi ? 'Chi tiêu' : 'Spending')]} />
                <Bar dataKey="income" fill="#535f3c" radius={[5, 5, 0, 0]} maxBarSize={34} />
                <Bar dataKey="expense" fill="#c4d798" radius={[5, 5, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div> : <EmptyChart vi={vi}>{vi ? 'Chưa có thu nhập hoặc chi tiêu trong khoảng thời gian này. Thử chọn khoảng thời gian khác.' : 'No income or spending in this period. Try another date range.'}</EmptyChart>}
        </article>
        <aside className="wa-report-note">
          <span className="wa-note-icon"><Sparkles size={23} strokeWidth={1.5} /></span>
          <span className="wa-kicker">{vi ? 'ĐIỂM ĐÁNG CHÚ Ý' : 'WORTH A CLOSER LOOK'}</span>
          <h2>{!hasActivity ? (vi ? 'Mỗi giao dịch đều có ý nghĩa.' : 'Every transaction tells a story.') : net >= 0 ? (vi ? 'Bạn đang giữ lại nhiều hơn.' : 'More room for what matters.') : (vi ? 'Một nhịp chậm để nhìn lại.' : 'A good moment to pause.')}</h2>
          <p>{!hasActivity ? (vi ? 'Khi bạn ghi nhận thu nhập và chi tiêu, bức tranh tài chính sẽ dần rõ nét hơn.' : 'As you record income and spending, your financial picture becomes clearer.') : net >= 0 ? (vi ? `Thu nhập cao hơn chi tiêu ${fmt(net)} trong kỳ này. Đây là phần tiền có thể dành cho những ưu tiên tiếp theo.` : `Income exceeds spending by ${fmt(net)} this period. That gives you room to plan your next priority.`) : (vi ? `Chi tiêu cao hơn thu nhập ${fmt(Math.abs(net))} trong kỳ. Xem các danh mục bên dưới để tìm khoản có thể điều chỉnh.` : `Spending exceeds income by ${fmt(Math.abs(net))} this period. Explore the categories below to find room to adjust.`)}</p>
          <div className="wa-note-footer"><span className="wa-tiny-dot" />{vi ? 'Từ giao dịch thực tế của bạn' : 'Based on your recorded transactions'}</div>
        </aside>
      </div>
      <article className="wa-card wa-category-card">
        <div className="wa-card-heading"><div><span className="wa-kicker">{vi ? 'CHI TIÊU THEO DANH MỤC' : 'SPENDING BREAKDOWN'}</span><h2>{vi ? 'Những điều bạn ưu tiên' : 'What you make room for'}</h2></div><span className="wa-subtle-badge">{categories.length} {vi ? 'danh mục' : 'categories'}</span></div>
        {categories.length ? <div className="wa-category-content">
          <div className="wa-donut-wrap" role="img" aria-label={vi ? 'Tỷ trọng chi tiêu theo danh mục' : 'Spending share by category'}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categories.map(row => ({ ...row, value: amount(row.amount) }))} dataKey="value" nameKey="categoryName" innerRadius="70%" outerRadius="91%" paddingAngle={3} stroke="none">
                  {categories.map((row, index) => <Cell key={row.categoryId} fill={PALETTE[index % PALETTE.length]} />)}
                </Pie>
                <Tooltip formatter={value => fmt(Number(value))} contentStyle={{ borderRadius: 14, borderColor: '#e5e7dc', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="wa-donut-center"><span>{vi ? 'Tổng chi tiêu' : 'Total spending'}</span><strong>{new Intl.NumberFormat(localeFor(currentLang), { notation: 'compact', maximumFractionDigits: 1 }).format(categoryTotal)}</strong><small>{displayCurrency}</small></div>
          </div>
          <div className="wa-category-list">{categories.map((category, index) => <div className="wa-category-row" key={category.categoryId}>
            <div className="wa-category-name"><span style={{ background: PALETTE[index % PALETTE.length] }} /><span>{category.categoryName === 'null' ? (vi ? 'Chưa phân loại' : 'Uncategorized') : categoryLabel(category.categoryName, currentLang)}</span></div>
            <strong>{fmt(amount(category.amount))}</strong><span className="wa-category-percent">{percent(amount(category.amount) / categoryTotal * 100, currentLang)}</span>
            <div className="wa-category-track"><span style={{ width: `${amount(category.amount) / categoryTotal * 100}%`, background: PALETTE[index % PALETTE.length] }} /></div>
          </div>)}</div>
          <div className="wa-category-takeaway"><Layers3 size={23} strokeWidth={1.5} /><h3>{vi ? 'Danh mục lớn nhất' : 'Your largest category'}</h3><strong>{topCategory.categoryName === 'null' ? (vi ? 'Chưa phân loại' : 'Uncategorized') : categoryLabel(topCategory.categoryName, currentLang)}</strong><p>{vi ? `Chiếm ${percent(amount(topCategory.amount) / categoryTotal * 100, currentLang)} tổng chi tiêu trong kỳ đã chọn.` : `${percent(amount(topCategory.amount) / categoryTotal * 100, currentLang)} of all spending in your selected period.`}</p></div>
        </div> : <EmptyChart vi={vi}>{vi ? 'Chưa có khoản chi nào trong khoảng thời gian này.' : 'No expenses recorded in this period.'}</EmptyChart>}
      </article>
      <p className="wa-data-caption"><ShieldCheck size={14} />{vi ? 'Số liệu từ giao dịch đã ghi nhận · Chuyển khoản nội bộ không tính vào thu nhập và chi tiêu.' : 'Calculated from recorded transactions · Internal transfers are excluded from income and spending.'}</p>
    </>}
  </section>;
}

export function InsightsPage({ currentLang, currency = 'VND', onNavigate }: AnalyticsProps) {
  const vi = currentLang === 'vi';
  const [lens, setLens] = useState(currency);
  useEffect(() => { setLens(currency); }, [currency]);
  const range = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return {
      start, end,
      query: `startDate=${dateKey(start)}&endDate=${dateKey(end)}&currency=${lens}`,
    };
  }, [lens]);
  const { data, loading, failed, retry } = useAnalyticsData<InsightData>(async signal => {
    const [summary, categories, budgets, goals, allAccounts] = await Promise.all([
      apiGet<DashboardSummaryDto>(`/dashboard/summary?${range.query}`, signal),
      apiGet<CategoryRow[]>(`/reports/category-breakdown?${range.query}`, signal),
      apiGet<BudgetRow[]>(`/reports/budget-performance?${range.query}`, signal),
      apiGet<GoalRow[]>('/savings-goals', signal),
      apiGet<PageResponse<AccountDto>>('/accounts?size=100', signal),
    ]);
    return { summary, categories, budgets, goals, currencies: currencyOptions(allAccounts.content) };
  }, range.query);
  const income = amount(data?.summary.totalIncome);
  const expense = amount(data?.summary.totalExpense);
  const net = income - expense;
  const hasActivity = income > 0 || expense > 0;
  const displayCurrency = lens;
  const fmt = (value: number) => money(value, currentLang, displayCurrency);
  const lensGoals = data?.goals.filter(goal => goal.currencyCode === lens) ?? [];
  const activeGoals = lensGoals.filter(goal => goal.status !== 'ARCHIVED' && amount(goal.savedAmount) < amount(goal.targetAmount));
  const reachedGoals = lensGoals.filter(goal => goal.status !== 'ARCHIVED' && amount(goal.savedAmount) >= amount(goal.targetAmount));
  const budgetAlerts = data?.budgets.filter(budget => Number(budget.utilizationPercent) >= 80).sort((a, b) => Number(b.utilizationPercent) - Number(a.utilizationPercent)) ?? [];
  const overBudget = budgetAlerts.filter(budget => Number(budget.utilizationPercent) >= 100);
  const expenseCategories = data?.categories.filter(category => category.type === 'EXPENSE').sort((a, b) => amount(b.amount) - amount(a.amount)) ?? [];
  const topCategory = expenseCategories[0];
  const nextGoal = [...activeGoals].filter(goal => goal.targetDate).sort((a, b) => (a.targetDate ?? '').localeCompare(b.targetDate ?? ''))[0] ?? activeGoals[0];
  const goalDays = nextGoal?.targetDate ? Math.ceil((new Date(`${nextGoal.targetDate}T23:59:59`).getTime() - range.end.getTime()) / 86400000) : null;
  const monthLabel = range.start.toLocaleDateString(localeFor(currentLang), { month: 'long', year: 'numeric' });
  const action = (destination: Destination, label: string) => onNavigate ? <button className="wa-text-action" onClick={() => onNavigate(destination)}>{label}<ArrowRight size={15} /></button> : null;

  return <section className="wa-page wa-insights">
    <header className="wa-page-heading">
      <div><div className="wa-eyebrow"><span />{vi ? 'TỪ DỮ LIỆU ĐẾN HÀNH ĐỘNG' : 'FROM NUMBERS TO NEXT STEPS'}</div><h1>{vi ? 'Tiến xa hơn, từng chút một.' : 'Small steps. A clearer future.'}</h1><p>{vi ? 'Một góc nhìn bình tĩnh về tình hình tài chính của bạn.' : 'A thoughtful look at where you are, and where you can go.'}</p></div>
      <span className="wa-month-pill"><CalendarDays size={16} />{monthLabel}</span>
    </header>
    {loading || failed || !data ? <AnalyticsState loading={loading} vi={vi} onRetry={retry} /> : <>
      <CurrencyLens currencies={data.currencies} value={lens} onChange={setLens} vi={vi} />
      <article className="wa-insight-hero">
        <div className="wa-insight-hero-copy"><span className="wa-hero-tag"><Sparkles size={13} />{vi ? 'GÓC NHÌN TÀI CHÍNH' : 'YOUR FINANCIAL PERSPECTIVE'}</span>
          <h2>{!hasActivity ? (vi ? 'Hiểu hôm nay.\nChủ động ngày mai.' : 'Understand today.\nShape tomorrow.') : net >= 0 && overBudget.length === 0 ? (vi ? 'Có khoảng trống\ncho điều lớn hơn.' : 'Make room for\nyour next chapter.') : (vi ? 'Rõ hơn một chút.\nVững hơn mỗi ngày.' : 'A little more clarity.\nA little more control.')}</h2>
          <p>{!hasActivity ? (vi ? 'Ghi nhận những giao dịch đầu tiên. Những nhận định hữu ích sẽ xuất hiện từ chính dữ liệu của bạn.' : 'Start with your first transactions. Useful observations will grow from your own data.') : (vi ? 'Thu nhập, ngân sách và mục tiêu — những tín hiệu nhỏ giúp bạn biết nên tập trung vào đâu.' : 'Income, budgets, and goals. Small signals that help you decide what deserves your attention.')}</p>
          <div className="wa-hero-method"><span className="wa-tiny-dot" />{vi ? 'Phân tích theo quy tắc · Không dùng mô hình AI' : 'Rule-based observations · No AI model used'}</div>
        </div>
        <div className="wa-orbit-art" aria-hidden="true"><div className="wa-orbit wa-orbit-one" /><div className="wa-orbit wa-orbit-two" /><div className="wa-orbit wa-orbit-three" /><div className="wa-orbit-center"><TrendingUp size={46} strokeWidth={1.2} /></div><span className="wa-orbit-dot wa-orbit-dot-one" /><span className="wa-orbit-dot wa-orbit-dot-two" /><span className="wa-orbit-star">✦</span></div>
      </article>
      <div className="wa-health-strip">
        <div><span className="wa-health-icon"><Wallet size={18} /></span><div><span>{vi ? 'Dòng tiền tháng này' : 'This month’s cash flow'}</span><strong>{!hasActivity ? (vi ? 'Chờ dữ liệu' : 'Awaiting data') : net >= 0 ? (vi ? 'Đang dương' : 'Positive') : (vi ? 'Cần chú ý' : 'Needs attention')}</strong></div><i className={!hasActivity ? 'wa-dot-neutral' : net >= 0 ? 'wa-dot-good' : 'wa-dot-warn'} /></div>
        <div><span className="wa-health-icon"><ShieldCheck size={18} /></span><div><span>{vi ? 'Ngân sách trong kỳ' : 'Budgets this period'}</span><strong>{data.budgets.length === 0 ? (vi ? 'Chưa thiết lập' : 'Not set up') : overBudget.length ? (vi ? `${overBudget.length} đã chạm giới hạn` : `${overBudget.length} at their limit`) : budgetAlerts.length ? (vi ? `${budgetAlerts.length} sắp chạm giới hạn` : `${budgetAlerts.length} nearing their limit`) : (vi ? 'Trong giới hạn' : 'Within limits')}</strong></div><i className={data.budgets.length === 0 ? 'wa-dot-neutral' : budgetAlerts.length ? 'wa-dot-warn' : 'wa-dot-good'} /></div>
        <div><span className="wa-health-icon"><Target size={18} /></span><div><span>{vi ? 'Mục tiêu tiết kiệm' : 'Savings goals'}</span><strong>{activeGoals.length ? (vi ? `${activeGoals.length} đang thực hiện` : `${activeGoals.length} in progress`) : reachedGoals.length ? (vi ? `${reachedGoals.length} đã hoàn thành` : `${reachedGoals.length} completed`) : (vi ? 'Chưa thiết lập' : 'Not set up')}</strong></div><i className={activeGoals.length + reachedGoals.length ? 'wa-dot-good' : 'wa-dot-neutral'} /></div>
      </div>
      <div className="wa-section-heading"><div><span className="wa-kicker">{vi ? 'DÀNH CHO BẠN' : 'PERSONAL TO YOU'}</span><h2>{vi ? 'Những điều đáng quan tâm' : 'A few things worth your attention'}</h2></div><span className="wa-subtle-badge">{vi ? 'Từ dữ liệu đã ghi nhận' : 'From your recorded data'}</span></div>
      <div className="wa-observations">
        <article className={`wa-observation ${hasActivity && net >= 0 ? 'wa-observation-positive' : ''}`}>
          <div className="wa-observation-top"><span className="wa-observation-icon"><TrendingUp size={21} /></span><span className="wa-observation-number">01</span></div>
          <span className="wa-kicker">{vi ? 'THU NHẬP & CHI TIÊU' : 'INCOME & SPENDING'}</span>
          <h3>{!hasActivity ? (vi ? 'Bắt đầu với bức tranh thật.' : 'Start with the real picture.') : net >= 0 ? (vi ? 'Bạn đang tạo ra dư địa.' : 'You are creating breathing room.') : (vi ? 'Chi tiêu đang vượt thu nhập.' : 'Spending is ahead of income.')}</h3>
          <div className="wa-observation-value">{hasActivity ? fmt(net) : '—'}</div>
          <p>{!hasActivity ? (vi ? 'Chưa có thu nhập hoặc chi tiêu trong tháng. Ghi nhận giao dịch để bắt đầu theo dõi dòng tiền.' : 'No income or spending recorded this month. Add transactions to start following your cash flow.') : income > 0 ? (vi ? `Bạn đã chi ${percent(expense / income * 100, currentLang)} thu nhập tháng này. ${net >= 0 ? 'Cân nhắc dành phần còn lại cho mục tiêu ưu tiên.' : 'Rà soát các khoản chi có thể điều chỉnh trước khi kết thúc tháng.'}` : `You have spent ${percent(expense / income * 100, currentLang)} of this month’s income. ${net >= 0 ? 'Consider putting the remaining amount toward a priority goal.' : 'Review spending you can adjust before the month ends.'}`) : (vi ? 'Đã có chi tiêu nhưng chưa ghi nhận thu nhập tháng này. Bổ sung thu nhập để có góc nhìn đầy đủ.' : 'You have recorded spending but no income this month. Record income for a complete picture.')}</p>
          {action('transactions', vi ? 'Xem giao dịch' : 'Review transactions')}
        </article>
        <article className="wa-observation">
          <div className="wa-observation-top"><span className="wa-observation-icon wa-icon-tan"><ShieldCheck size={21} /></span><span className="wa-observation-number">02</span></div>
          <span className="wa-kicker">{vi ? 'NGÂN SÁCH' : 'BUDGETS'}</span>
          <h3>{data.budgets.length === 0 ? (vi ? 'Đặt giới hạn cho sự an tâm.' : 'Give your spending a boundary.') : budgetAlerts.length ? (vi ? 'Một ngân sách cần bạn chú ý.' : 'A budget deserves a closer look.') : (vi ? 'Các giới hạn đang được giữ vững.' : 'Your budgets have room to breathe.')}</h3>
          <div className="wa-observation-value">{budgetAlerts.length ? percent(Number(budgetAlerts[0].utilizationPercent), currentLang) : data.budgets.length ? `${data.budgets.length}/${data.budgets.length}` : '—'}</div>
          <p>{data.budgets.length === 0 ? (vi ? 'Chưa có ngân sách trong tháng này. Bắt đầu với danh mục chi tiêu lớn nhất và đặt một giới hạn phù hợp.' : 'No budgets cover this month. Start with your largest spending category and choose a practical limit.') : budgetAlerts.length ? (vi ? `“${budgetAlerts[0].name}” đã dùng ${percent(Number(budgetAlerts[0].utilizationPercent), currentLang)} ngân sách. Số chi được tính trong khoảng thời gian đang xem.` : `“${budgetAlerts[0].name}” has used ${percent(Number(budgetAlerts[0].utilizationPercent), currentLang)} of its budget. Spending covers the period being viewed.`) : (vi ? 'Tất cả ngân sách trong kỳ đang sử dụng dưới 80% giới hạn. Tiếp tục ghi nhận chi tiêu để theo dõi sát hơn.' : 'Every budget in this period is below 80% of its limit. Keep recording expenses to stay informed.')}</p>
          {action('budgets', vi ? 'Quản lý ngân sách' : 'Manage budgets')}
        </article>
        <article className="wa-observation">
          <div className="wa-observation-top"><span className="wa-observation-icon"><Layers3 size={21} /></span><span className="wa-observation-number">03</span></div>
          <span className="wa-kicker">{vi ? 'THÓI QUEN CHI TIÊU' : 'SPENDING PATTERNS'}</span>
          <h3>{topCategory ? (vi ? 'Khoản chi lớn nhất của tháng.' : 'Your biggest spending category.') : (vi ? 'Mỗi thói quen đều bắt đầu nhỏ.' : 'Every pattern starts somewhere.')}</h3>
          <div className="wa-observation-value wa-observation-name">{topCategory ? (topCategory.categoryName === 'null' ? (vi ? 'Chưa phân loại' : 'Uncategorized') : categoryLabel(topCategory.categoryName, currentLang)) : '—'}</div>
          <p>{topCategory && expense > 0 ? (vi ? `${fmt(amount(topCategory.amount))}, tương đương ${percent(amount(topCategory.amount) / expense * 100, currentLang)} chi tiêu tháng này. Xem chi tiết để hiểu rõ hơn những ưu tiên của bạn.` : `${fmt(amount(topCategory.amount))}, or ${percent(amount(topCategory.amount) / expense * 100, currentLang)} of this month’s spending. Explore the details to understand your priorities.`) : (vi ? 'Chưa có chi tiêu theo danh mục trong tháng. Phân loại các khoản chi để nhận ra những thói quen của mình.' : 'No categorized spending this month. Categorize expenses to discover your spending patterns.')}</p>
          {action('reports', vi ? 'Khám phá báo cáo' : 'Explore reports')}
        </article>
        <article className="wa-observation wa-observation-goal">
          <div className="wa-observation-top"><span className="wa-observation-icon"><Target size={21} /></span><span className="wa-observation-number">04</span></div>
          <span className="wa-kicker">{vi ? 'MỤC TIÊU TIẾT KIỆM' : 'SAVINGS GOALS'}</span>
          <h3>{nextGoal ? (vi ? 'Một bước gần hơn với điều bạn muốn.' : 'One step closer to what you want.') : reachedGoals.length ? (vi ? 'Một cột mốc đáng ghi nhận.' : 'A milestone worth recognizing.') : (vi ? 'Biến một dự định thành mục tiêu.' : 'Give your next chapter a goal.')}</h3>
          <div className="wa-observation-value">{nextGoal ? percent(amount(nextGoal.savedAmount) / amount(nextGoal.targetAmount) * 100, currentLang) : reachedGoals.length ? reachedGoals.length : '—'}</div>
          <p>{nextGoal ? (vi ? `“${nextGoal.name}” còn ${money(Math.max(0, amount(nextGoal.targetAmount) - amount(nextGoal.savedAmount)), currentLang, nextGoal.currencyCode)} để hoàn thành.${goalDays !== null ? goalDays < 0 ? ' Ngày mục tiêu đã qua; hãy xem lại kế hoạch đóng góp.' : ` Còn ${goalDays} ngày đến ngày mục tiêu.` : ' Thêm ngày mục tiêu để dễ lập kế hoạch.'}` : `“${nextGoal.name}” has ${money(Math.max(0, amount(nextGoal.targetAmount) - amount(nextGoal.savedAmount)), currentLang, nextGoal.currencyCode)} left to save.${goalDays !== null ? goalDays < 0 ? ' Its target date has passed; revisit your contribution plan.' : ` ${goalDays} days until the target date.` : ' Add a target date to make planning easier.'}`) : reachedGoals.length ? (vi ? `Bạn đã hoàn thành ${reachedGoals.length} mục tiêu tiết kiệm. Hãy dành một khoảnh khắc ghi nhận và lên kế hoạch cho điều tiếp theo.` : `You have completed ${reachedGoals.length} savings goals. Take a moment to recognize your progress and plan what comes next.`) : (vi ? 'Một chuyến đi, quỹ dự phòng hay một dự định riêng. Đặt mục tiêu cụ thể để mỗi khoản tiết kiệm có ý nghĩa.' : 'A trip, an emergency fund, or a personal ambition. Set a specific goal to give each contribution a purpose.')}</p>
          {nextGoal && <div className="wa-goal-progress" role="progressbar" aria-label={nextGoal.name} aria-valuenow={Math.max(0, Math.min(100, Math.round(amount(nextGoal.savedAmount) / amount(nextGoal.targetAmount) * 100)))} aria-valuemin={0} aria-valuemax={100}><span style={{ '--wa-progress': `${Math.max(0, Math.min(100, amount(nextGoal.savedAmount) / amount(nextGoal.targetAmount) * 100))}%` } as CSSProperties} /></div>}
          {action('goals', vi ? 'Xem mục tiêu' : 'View goals')}
        </article>
      </div>
      <footer className="wa-method-note"><span><ShieldCheck size={20} /></span><div><strong>{vi ? 'Minh bạch từ cách tính' : 'Clear about how this works'}</strong><p>{vi ? 'Nhận định dựa trên thu nhập, chi tiêu tháng này, ngân sách trùng kỳ và tiến độ mục tiêu. Ngưỡng ngân sách cần chú ý là 80%; không có điểm sức khỏe tự tạo hay dự báo.' : 'Observations use this month’s income and spending, overlapping budgets, and goal progress. Budget attention starts at 80%; no invented health scores or forecasts.'}</p></div></footer>
    </>}
  </section>;
}
