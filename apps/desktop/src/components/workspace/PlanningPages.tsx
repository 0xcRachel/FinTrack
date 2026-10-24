import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive, ArrowDownLeft, ArrowUpRight, CalendarDays, Check, CheckCheck, CircleAlert,
  CreditCard, History, Landmark, Layers3, LoaderCircle, Minus, Pencil, Plus, RefreshCw,
  ShieldCheck, Sparkles, Target, Trash2, TrendingUp, Wallet, X,
} from 'lucide-react';
import { ApiRequestError, apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../../lib/api';
import type { Language } from '../../lib/i18n';
import { useToast } from '../ui/ToastProvider';
import { useConfirm } from '../ui/ConfirmProvider';
import './PlanningPages.css';

interface PlanningPageProps { currentLang: Language; currency?: string }
type Money = string | number;
type AccountKind = 'CASH' | 'BANK' | 'SAVINGS' | 'CREDIT_CARD' | 'OTHER';
type BudgetPeriod = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
interface Account {
  accountId: number; name: string; accountType: AccountKind; currencyCode: string;
  openingBalance: Money; currentBalance: Money; description?: string; isArchived: boolean;
}
interface Category { categoryId: number; name: string; categoryType: string; isArchived?: boolean }
interface Budget {
  budgetId: number; name: string; categoryId: number; categoryName: string;
  amount: Money; currencyCode: string; periodType: BudgetPeriod; startDate: string;
  endDate: string; warningThresholdPercent: number | null; actualSpending: Money;
  remaining: Money; utilizationPercent: number | null; warning: boolean; exceeded: boolean;
}
interface Goal {
  goalId: number; name: string; targetAmount: Money; savedAmount: Money;
  progressPercent: number | null; currencyCode: string; targetDate?: string;
  linkedAccountId?: number; linkedAccountName?: string; description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
}
interface Contribution {
  contributionId: number; amount: Money; contributionDate: string;
  contributionType: 'CONTRIBUTION' | 'WITHDRAWAL'; description?: string;
}
interface Page<T> { content: T[]; totalPages: number }

const n = (value: Money | null | undefined) => Number(value ?? 0) || 0;
const pct = (value: number) => Math.min(100, Math.max(0, value));
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const monthEnd = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()}`;
};
const money = (amount: Money, code: string, lang: Language) =>
  new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency', currency: code, maximumFractionDigits: code === 'VND' ? 0 : 2,
  }).format(n(amount));
const dateLabel = (value: string | undefined, lang: Language) => value
  ? new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
  : lang === 'vi' ? 'Chưa đặt thời hạn' : 'No deadline';

async function allPages<T>(path: string, signal: AbortSignal): Promise<T[]> {
  const first = await apiGet<Page<T> | T[]>(`${path}${path.includes('?') ? '&' : '?'}size=100&page=0`, signal);
  if (Array.isArray(first)) return first;
  const pages = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
    apiGet<Page<T>>(`${path}${path.includes('?') ? '&' : '?'}size=100&page=${i + 1}`, signal)));
  return first.content.concat(...pages.map(page => page.content));
}

function failure(error: unknown, lang: Language): string {
  if (error instanceof ApiRequestError && error.isNetworkError) {
    return lang === 'vi' ? 'Chưa kết nối được. Vui lòng kiểm tra kết nối và thử lại.' : 'We could not connect. Check your connection and try again.';
  }
  if (error instanceof ApiRequestError && error.status === 401) {
    return lang === 'vi' ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : 'Your session has expired. Please sign in again.';
  }
  const message = error instanceof Error ? error.message : '';
  const vi: Record<string, string> = {
    'Budget overlaps an existing one for this category': 'Danh mục này đã có ngân sách trùng thời gian. Hãy chọn khoảng thời gian khác.',
    'A budget for this category and period already exists': 'Danh mục này đã có ngân sách trong khoảng thời gian đã chọn.',
    'An account with this name already exists': 'Tên tài khoản này đã được sử dụng. Hãy chọn tên khác.',
    'Category not found': 'Danh mục không còn khả dụng. Vui lòng tải lại và chọn danh mục khác.',
  };
  return lang === 'vi'
    ? vi[message] ?? 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.'
    : message || 'We could not complete this request. Please try again.';
}

function useAccounts() {
  return useQuery({
    queryKey: ['workspace', 'accounts'],
    queryFn: ({ signal }) => allPages<Account>('/accounts', signal),
  });
}

function CurrencyPicker({ value, values, onChange, lang }: { value: string; values: string[]; onChange: (value: string) => void; lang: Language }) {
  return <label className="wp-currency-picker">
    <span>{lang === 'vi' ? 'Tiền tệ' : 'Currency'}</span>
    <select aria-label={lang === 'vi' ? 'Lọc theo tiền tệ' : 'Filter by currency'} value={value} onChange={event => onChange(event.target.value)}>
      {[...new Set([value, ...values])].sort().map(code => <option key={code}>{code}</option>)}
    </select>
  </label>;
}

function PageHeading({ eyebrow, title, description, action, actionText, children }: {
  eyebrow: string; title: string; description: string; action: () => void; actionText: string; children?: ReactNode;
}) {
  return <header className="wp-heading">
    <div><p className="wp-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="wp-description">{description}</p></div>
    <div className="wp-heading-actions">{children}<button className="wp-button wp-button-primary" onClick={action}><Plus size={17} />{actionText}</button></div>
  </header>;
}

function LoadingState({ lang }: { lang: Language }) {
  return <div className="wp-loading" role="status"><LoaderCircle className="wp-spin" size={22} /><p>{lang === 'vi' ? 'Đang chuẩn bị không gian tài chính của bạn…' : 'Getting your financial workspace ready…'}</p></div>;
}

function ErrorState({ error, lang, retry }: { error: unknown; lang: Language; retry: () => void }) {
  return <div className="wp-state wp-state-error" role="alert"><div className="wp-state-icon"><CircleAlert size={28} /></div>
    <h2>{lang === 'vi' ? 'Dữ liệu chưa sẵn sàng' : 'Your data is unavailable'}</h2><p>{failure(error, lang)}</p>
    <button className="wp-button wp-button-secondary" onClick={retry}><RefreshCw size={16} />{lang === 'vi' ? 'Thử lại' : 'Try again'}</button>
  </div>;
}

function EmptyState({ icon, title, description, actionText, action }: {
  icon: ReactNode; title: string; description: string; actionText?: string; action?: () => void;
}) {
  return <div className="wp-state"><div className="wp-state-icon">{icon}</div><h2>{title}</h2><p>{description}</p>
    {action && <button className="wp-button wp-button-primary" onClick={action}><Plus size={16} />{actionText}</button>}
  </div>;
}

function Modal({ title, subtitle, close, busy = false, lang, children }: {
  title: string; subtitle?: string; close: () => void; busy?: boolean; lang: Language; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => { ref.current?.close(); opener?.focus(); };
  }, []);
  return <dialog ref={ref} className="wp-dialog" aria-labelledby={id}
    onCancel={event => { event.preventDefault(); if (!busy) close(); }}
    onClick={event => {
      if (event.target !== event.currentTarget || busy) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    }}>
    <div className="wp-dialog-heading"><div><p className="wp-eyebrow">FINTRACK / {lang === 'vi' ? 'KẾ HOẠCH CỦA BẠN' : 'YOUR PLAN'}</p><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      <button className="wp-icon-button" disabled={busy} onClick={close} aria-label={lang === 'vi' ? 'Đóng' : 'Close'}><X size={19} /></button>
    </div>{children}
  </dialog>;
}

function FormActions({ close, busy, lang, label, disabled = false }: { close: () => void; busy: boolean; lang: Language; label: string; disabled?: boolean }) {
  return <div className="wp-form-actions">
    <button type="button" className="wp-button wp-button-secondary" disabled={busy} onClick={close}>{lang === 'vi' ? 'Hủy' : 'Cancel'}</button>
    <button className="wp-button wp-button-primary" disabled={busy || disabled} type="submit">{busy ? <LoaderCircle size={16} className="wp-spin" /> : <Check size={16} />}{busy ? (lang === 'vi' ? 'Đang lưu…' : 'Saving…') : label}</button>
  </div>;
}

function CurrencyField({ value, setValue, lang }: { value: string; setValue: (value: string) => void; lang: Language }) {
  return <label className="wp-field"><span>{lang === 'vi' ? 'Tiền tệ' : 'Currency'}</span><select value={value} onChange={event => setValue(event.target.value)}>
    {[...new Set(['VND', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', value])].map(code => <option key={code}>{code}</option>)}
  </select></label>;
}

function BudgetForm({ lang, currency, close, saved, budget }: { lang: Language; currency: string; close: () => void; saved: (currencyCode: string) => void; budget?: Budget | null }) {
  const vi = lang === 'vi';
  const editing = !!budget;
  const [form, setForm] = useState({
    name: budget?.name ?? '', categoryId: budget ? String(budget.categoryId) : '', amount: budget ? String(budget.amount) : '',
    currencyCode: budget?.currencyCode ?? currency, periodType: budget?.periodType ?? 'MONTHLY',
    startDate: budget?.startDate ?? `${today().slice(0, 7)}-01`, endDate: budget?.endDate ?? monthEnd(),
    warningThresholdPercent: budget?.warningThresholdPercent != null ? String(budget.warningThresholdPercent) : '80',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const categories = useQuery({ queryKey: ['workspace', 'expense-categories'], queryFn: ({ signal }) => allPages<Category>('/categories?type=EXPENSE', signal) });
  const list = categories.data?.filter(category => !category.isArchived) ?? [];
  const set = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || (!editing && !form.categoryId) || !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0 || form.endDate < form.startDate) {
      setError(vi ? 'Vui lòng nhập tên, danh mục, số tiền lớn hơn 0 và khoảng ngày hợp lệ.' : 'Enter a name, category, positive amount, and valid date range.'); return;
    }
    setBusy(true); setError('');
    try {
      if (budget) {
        await apiPut(`/budgets/${budget.budgetId}`, { name: form.name.trim(), amount: form.amount, currencyCode: form.currencyCode, periodType: form.periodType, startDate: form.startDate, endDate: form.endDate, warningThresholdPercent: Number(form.warningThresholdPercent) });
      } else {
        await apiPost('/budgets', { ...form, name: form.name.trim(), categoryId: Number(form.categoryId), warningThresholdPercent: Number(form.warningThresholdPercent) });
      }
      saved(form.currencyCode);
    } catch (err) { setError(failure(err, lang)); } finally { setBusy(false); }
  };
  const periodLabels: Record<BudgetPeriod, string> = { WEEKLY: vi ? 'Hàng tuần' : 'Weekly', MONTHLY: vi ? 'Hàng tháng' : 'Monthly', QUARTERLY: vi ? 'Hàng quý' : 'Quarterly', YEARLY: vi ? 'Hàng năm' : 'Yearly', CUSTOM: vi ? 'Tùy chỉnh' : 'Custom' };
  return <Modal title={editing ? (vi ? 'Điều chỉnh ngân sách' : 'Refine your spending plan') : (vi ? 'Một kế hoạch chi tiêu mới' : 'A fresh spending plan')} subtitle={editing ? (vi ? 'Cập nhật hạn mức hoặc khoảng thời gian. Danh mục được giữ nguyên.' : 'Update the limit or dates. The category stays the same.') : (vi ? 'Đặt giới hạn rõ ràng, dành chỗ cho điều quan trọng.' : 'Set a clear limit. Make room for what matters.')} close={close} busy={busy} lang={lang}>
    <form className="wp-form" onSubmit={submit}>
      <label className="wp-field"><span>{vi ? 'Tên ngân sách' : 'Budget name'}</span><input autoFocus required maxLength={150} placeholder={vi ? 'Ví dụ: Ăn uống tháng này' : 'e.g. Dining this month'} value={form.name} onChange={event => set('name', event.target.value)} /></label>
      <label className="wp-field"><span>{vi ? 'Danh mục chi tiêu' : 'Expense category'}</span><select required value={form.categoryId} disabled={editing || categories.isPending || categories.isError} onChange={event => set('categoryId', event.target.value)}>
        <option value="">{categories.isPending ? (vi ? 'Đang tải danh mục…' : 'Loading categories…') : (vi ? 'Chọn danh mục' : 'Choose a category')}</option>
        {editing && budget && <option value={budget.categoryId}>{budget.categoryName}</option>}
        {list.map(category => <option key={category.categoryId} value={category.categoryId}>{category.name}</option>)}
      </select></label>
      {categories.isError && <div className="wp-form-error" role="alert">{failure(categories.error, lang)} <button type="button" onClick={() => void categories.refetch()}>{vi ? 'Thử lại' : 'Retry'}</button></div>}
      {categories.isSuccess && list.length === 0 && <p className="wp-form-note">{vi ? 'Bạn cần một danh mục chi tiêu trước khi tạo ngân sách.' : 'An expense category is needed before you can create a budget.'}</p>}
      <div className="wp-form-grid"><label className="wp-field"><span>{vi ? 'Hạn mức' : 'Spending limit'}</span><input required inputMode="decimal" type="number" min="0.0001" step="0.0001" value={form.amount} onChange={event => set('amount', event.target.value)} placeholder="0" /></label>
        <CurrencyField value={form.currencyCode} setValue={value => set('currencyCode', value)} lang={lang} /></div>
      <div className="wp-form-grid"><label className="wp-field"><span>{vi ? 'Chu kỳ' : 'Period'}</span><select value={form.periodType} onChange={event => set('periodType', event.target.value)}>{Object.entries(periodLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="wp-field"><span>{vi ? 'Nhắc khi dùng (%)' : 'Alert at (%)'}</span><input type="number" min="0" max="100" required value={form.warningThresholdPercent} onChange={event => set('warningThresholdPercent', event.target.value)} /></label></div>
      <div className="wp-form-grid"><label className="wp-field"><span>{vi ? 'Từ ngày' : 'Start date'}</span><input type="date" required value={form.startDate} onChange={event => set('startDate', event.target.value)} /></label>
        <label className="wp-field"><span>{vi ? 'Đến ngày' : 'End date'}</span><input type="date" min={form.startDate} required value={form.endDate} onChange={event => set('endDate', event.target.value)} /></label></div>
      <p className="wp-form-note">{vi ? 'Chi tiêu trong khoảng ngày đã chọn sẽ tự động được tính vào ngân sách.' : 'Expenses within your selected dates are automatically counted toward this budget.'}</p>
      {error && <p className="wp-form-error" role="alert">{error}</p>}
      <FormActions close={close} busy={busy} lang={lang} label={editing ? (vi ? 'Lưu thay đổi' : 'Save changes') : (vi ? 'Tạo ngân sách' : 'Create budget')} disabled={!list.length && !editing} />
    </form>
  </Modal>;
}

export function BudgetPage({ currentLang: lang, currency = 'VND' }: PlanningPageProps) {
  const vi = lang === 'vi';
  const client = useQueryClient();
  const notify = useToast();
  const confirm = useConfirm();
  const [selectedCurrency, setCurrency] = useState(currency);
  const [filter, setFilter] = useState<'current' | 'all' | 'attention'>('current');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const query = useQuery({ queryKey: ['workspace', 'budgets'], queryFn: ({ signal }) => apiGet<Budget[]>('/budgets', signal) });
  const budgets = (query.data ?? []).filter(budget => budget.currencyCode === selectedCurrency);
  const current = budgets.filter(budget => budget.startDate <= today() && budget.endDate >= today());
  const visible = filter === 'current' ? current : filter === 'attention' ? budgets.filter(budget => budget.warning || budget.exceeded) : budgets;
  const total = current.reduce((sum, budget) => sum + n(budget.amount), 0);
  const spent = current.reduce((sum, budget) => sum + n(budget.actualSpending), 0);
  const remaining = total - spent;
  const utilization = total > 0 ? spent / total * 100 : 0;
  const saved = (currencyCode: string) => {
    setCurrency(currencyCode); setShowForm(false);
    notify.success(editing ? (vi ? 'Đã cập nhật ngân sách.' : 'Budget updated.') : (vi ? 'Ngân sách đã sẵn sàng. Chi tiêu sẽ được cập nhật tự động.' : 'Your budget is ready. Spending will update automatically.'));
    setEditing(null); setFilter('all'); void client.invalidateQueries();
  };
  const remove = async (budget: Budget) => {
    const approved = await confirm({
      title: vi ? 'Xóa ngân sách?' : 'Delete this budget?',
      description: vi ? `“${budget.name}” sẽ bị xóa khỏi kế hoạch chi tiêu. Lịch sử giao dịch của bạn vẫn được giữ nguyên.` : `“${budget.name}” will be removed from your spending plans. Your transaction history stays intact.`,
      confirmLabel: vi ? 'Xóa ngân sách' : 'Delete budget',
      cancelLabel: vi ? 'Giữ lại' : 'Keep it',
      tone: 'danger',
    });
    if (!approved) return;
    try { await apiDelete(`/budgets/${budget.budgetId}`); await client.invalidateQueries(); notify.success(vi ? 'Đã xóa ngân sách.' : 'Budget deleted.'); }
    catch (err) { notify.error(failure(err, lang)); }
  };
  return <section className="wp-page">
    <PageHeading eyebrow={vi ? 'CHI TIÊU CÓ CHỦ ĐÍCH' : 'SPEND WITH INTENTION'} title={vi ? 'Tự do, trong tầm tay.' : 'Freedom, with a plan.'}
      description={vi ? 'Cho mỗi khoản tiền một mục đích. Cho bản thân thêm an tâm.' : 'Give every dollar a purpose. Give yourself peace of mind.'}
      action={() => setShowForm(true)} actionText={vi ? 'Tạo ngân sách' : 'New budget'}>
      <CurrencyPicker value={selectedCurrency} values={(query.data ?? []).map(item => item.currencyCode)} onChange={setCurrency} lang={lang} />
    </PageHeading>
    {query.isPending ? <LoadingState lang={lang} /> : query.isError ? <ErrorState error={query.error} lang={lang} retry={() => void query.refetch()} /> : <>
      <div className="wp-budget-overview">
        <div className="wp-hero wp-budget-hero"><div className="wp-hero-top"><span className="wp-overline">{vi ? 'CÒN LẠI TRONG NGÂN SÁCH' : 'ROOM LEFT IN YOUR BUDGET'}</span><div className="wp-hero-symbol"><Wallet size={22} /></div></div>
          <div className="wp-hero-amount">{money(remaining, selectedCurrency, lang)}</div>
          <p>{vi ? `${current.length} ngân sách đang hoạt động` : `${current.length} active budgets`}</p>
          <div className="wp-hero-track"><span style={{ width: `${pct(utilization)}%` }} /></div>
          <div className="wp-hero-bottom"><span>{vi ? 'Đã sử dụng' : 'Used'} {Math.round(utilization)}%</span><span>{money(total, selectedCurrency, lang)} {vi ? 'đã phân bổ' : 'allocated'}</span></div>
        </div>
        <div className="wp-overview-metrics">
          <div className="wp-metric"><span className="wp-metric-icon"><Layers3 size={19} /></span><div><span>{vi ? 'Tổng hạn mức hiện tại' : 'Current allocation'}</span><strong>{money(total, selectedCurrency, lang)}</strong></div></div>
          <div className="wp-metric"><span className="wp-metric-icon wp-peach"><ArrowUpRight size={19} /></span><div><span>{vi ? 'Chi tiêu được ghi nhận' : 'Recorded spending'}</span><strong>{money(spent, selectedCurrency, lang)}</strong></div></div>
          <div className="wp-metric"><span className="wp-metric-icon wp-lime"><ShieldCheck size={19} /></span><div><span>{vi ? 'Ngân sách cần chú ý' : 'Budgets needing attention'}</span><strong>{current.filter(budget => budget.warning || budget.exceeded).length}<small> / {current.length}</small></strong></div></div>
        </div>
      </div>
      <div className="wp-section-bar"><h2>{vi ? 'Kế hoạch chi tiêu' : 'Your spending plans'} <span>{visible.length}</span></h2>
        <div className="wp-tabs" aria-label={vi ? 'Lọc ngân sách' : 'Filter budgets'}>{(['current', 'attention', 'all'] as const).map(value => <button key={value} aria-pressed={filter === value} className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{value === 'current' ? (vi ? 'Hiện tại' : 'Current') : value === 'attention' ? (vi ? 'Cần chú ý' : 'Needs attention') : (vi ? 'Tất cả' : 'All plans')}</button>)}</div>
      </div>
      {visible.length === 0 ? <EmptyState icon={<Wallet size={29} />} title={filter === 'attention' ? (vi ? 'Không có ngân sách cần chú ý' : 'No budgets need attention') : (vi ? 'Bắt đầu với một kế hoạch nhỏ' : 'Start with one simple plan')}
        description={filter === 'attention' ? (vi ? 'Các ngân sách hiện có đều dưới ngưỡng cảnh báo.' : 'Your existing budgets are below their warning thresholds.') : (vi ? 'Đặt ngân sách cho một danh mục để theo dõi chi tiêu rõ ràng hơn.' : 'Set a limit for one category to bring more clarity to your spending.')}
        actionText={vi ? 'Tạo ngân sách' : 'Create a budget'} action={filter === 'attention' ? undefined : () => setShowForm(true)} />
        : <div className="wp-card-grid">{visible.map((budget, index) => {
          const percent = n(budget.utilizationPercent);
          const tone = budget.exceeded ? 'danger' : budget.warning ? 'warning' : 'good';
          return <article className={`wp-budget-card wp-tone-${tone}`} key={budget.budgetId}>
            <div className="wp-card-heading"><div className={`wp-category-icon wp-color-${index % 4}`}><Wallet size={21} /></div><span className={`wp-status wp-status-${tone}`}>{budget.exceeded ? (vi ? 'Vượt hạn mức' : 'Over budget') : budget.warning ? (vi ? 'Gần hạn mức' : 'Near limit') : (vi ? 'Trong hạn mức' : 'Within budget')}</span>
              <div className="wp-card-actions"><button className="wp-icon-button" aria-label={vi ? 'Sửa ngân sách' : 'Edit budget'} onClick={() => { setEditing(budget); setShowForm(true); }}><Pencil size={15} /></button><button className="wp-icon-button" aria-label={vi ? 'Xóa ngân sách' : 'Delete budget'} onClick={() => void remove(budget)}><Trash2 size={15} /></button></div>
            </div>
            <p className="wp-card-kicker">{budget.categoryName}</p><h3>{budget.name}</h3>
            <div className="wp-spent-line"><strong>{money(budget.actualSpending, budget.currencyCode, lang)}</strong><span>/ {money(budget.amount, budget.currencyCode, lang)}</span></div>
            <div className="wp-progress" role="progressbar" aria-label={budget.name} aria-valuenow={Math.round(pct(percent))} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct(percent)}%` }} /></div>
            <div className="wp-card-detail"><span>{n(budget.remaining) < 0 ? (vi ? 'Vượt' : 'Over by') : (vi ? 'Còn lại' : 'Remaining')}</span><strong>{money(Math.abs(n(budget.remaining)), budget.currencyCode, lang)}</strong></div>
            <div className="wp-card-footer"><CalendarDays size={14} /><span>{dateLabel(budget.startDate, lang)} — {dateLabel(budget.endDate, lang)}</span><b>{Math.round(percent)}%</b></div>
          </article>;
        })}</div>}
      <p className="wp-footnote"><ShieldCheck size={15} />{vi ? 'Tổng quan chỉ tính ngân sách đang có hiệu lực. Chọn loại tiền để xem các kế hoạch tương ứng.' : 'Overview includes budgets active today. Choose a currency to see its spending plans.'}</p>
    </>}
    {showForm && <BudgetForm lang={lang} currency={selectedCurrency} budget={editing} close={() => { setShowForm(false); setEditing(null); }} saved={saved} />}
  </section>;
}

function GoalForm({ lang, currency, close, saved, goal }: { lang: Language; currency: string; close: () => void; saved: (currencyCode: string) => void; goal?: Goal | null }) {
  const vi = lang === 'vi';
  const accounts = useAccounts();
  const editing = !!goal;
  const [form, setForm] = useState({
    name: goal?.name ?? '', targetAmount: goal ? String(goal.targetAmount) : '', currencyCode: goal?.currencyCode ?? currency,
    targetDate: goal?.targetDate ?? '', linkedAccountId: goal?.linkedAccountId ? String(goal.linkedAccountId) : '', description: goal?.description ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !Number.isFinite(Number(form.targetAmount)) || Number(form.targetAmount) <= 0) { setError(vi ? 'Nhập tên và số tiền mục tiêu lớn hơn 0.' : 'Enter a name and a positive target amount.'); return; }
    setBusy(true); setError('');
    try {
      const payload = { ...form, name: form.name.trim(), targetDate: form.targetDate || null, linkedAccountId: form.linkedAccountId ? Number(form.linkedAccountId) : null };
      if (goal) await apiPut(`/savings-goals/${goal.goalId}`, payload);
      else await apiPost('/savings-goals', payload);
      saved(form.currencyCode);
    } catch (err) { setError(failure(err, lang)); } finally { setBusy(false); }
  };
  return <Modal title={editing ? (vi ? 'Điều chỉnh mục tiêu' : 'Refine your goal') : (vi ? 'Điều bạn đang hướng tới' : 'Something to look forward to')} subtitle={editing ? (vi ? 'Cập nhật số tiền, thời hạn hoặc điều mục tiêu này có ý nghĩa với bạn.' : 'Update the amount, timeline, or what this goal means to you.') : (vi ? 'Một mục tiêu rõ ràng. Một bước gần hơn mỗi ngày.' : 'A clear goal. A little closer every day.')} close={close} busy={busy} lang={lang}>
    <form className="wp-form" onSubmit={submit}>
      <label className="wp-field"><span>{vi ? 'Tên mục tiêu' : 'Goal name'}</span><input autoFocus required maxLength={150} placeholder={vi ? 'Ví dụ: Quỹ tự do tài chính' : 'e.g. My freedom fund'} value={form.name} onChange={event => set('name', event.target.value)} /></label>
      <div className="wp-form-grid"><label className="wp-field"><span>{vi ? 'Số tiền mục tiêu' : 'Target amount'}</span><input required type="number" inputMode="decimal" min="0.0001" step="0.0001" value={form.targetAmount} onChange={event => set('targetAmount', event.target.value)} placeholder="0" /></label>
        <CurrencyField value={form.currencyCode} setValue={value => { setForm(previous => ({ ...previous, currencyCode: value, linkedAccountId: '' })); }} lang={lang} /></div>
      <label className="wp-field"><span>{vi ? 'Ngày mục tiêu (tùy chọn)' : 'Target date (optional)'}</span><input type="date" min={today()} value={form.targetDate} onChange={event => set('targetDate', event.target.value)} /></label>
      <label className="wp-field"><span>{vi ? 'Tài khoản liên kết (tùy chọn)' : 'Linked account (optional)'}</span><select disabled={accounts.isPending || accounts.isError} value={form.linkedAccountId} onChange={event => set('linkedAccountId', event.target.value)}>
        <option value="">{vi ? 'Không liên kết tài khoản' : 'No linked account'}</option>
        {(accounts.data ?? []).filter(account => account.currencyCode === form.currencyCode).map(account => <option key={account.accountId} value={account.accountId}>{account.name}</option>)}
      </select></label>
      {accounts.isError && <p className="wp-form-note">{vi ? 'Chưa tải được tài khoản. Bạn vẫn có thể tạo mục tiêu độc lập.' : 'Accounts could not load. You can still create an independent goal.'}</p>}
      <label className="wp-field"><span>{vi ? 'Điều này có ý nghĩa gì với bạn? (tùy chọn)' : 'What does this mean to you? (optional)'}</span><textarea maxLength={500} rows={3} value={form.description} onChange={event => set('description', event.target.value)} /></label>
      {error && <p className="wp-form-error" role="alert">{error}</p>}
      <FormActions close={close} busy={busy} lang={lang} label={editing ? (vi ? 'Lưu thay đổi' : 'Save changes') : (vi ? 'Tạo mục tiêu' : 'Create goal')} />
    </form>
  </Modal>;
}

function ContributionForm({ goal, lang, close, saved, mode = 'CONTRIBUTION' }: { goal: Goal; lang: Language; close: () => void; saved: () => void; mode?: 'CONTRIBUTION' | 'WITHDRAWAL' }) {
  const vi = lang === 'vi';
  const withdrawing = mode === 'WITHDRAWAL';
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) { setError(vi ? 'Số tiền cần lớn hơn 0.' : 'The amount must be greater than zero.'); return; }
    if (withdrawing && Number(amount) > n(goal.savedAmount)) { setError(vi ? 'Số tiền rút không thể lớn hơn số đã tiết kiệm.' : 'You cannot withdraw more than the amount saved.'); return; }
    setBusy(true); setError('');
    try {
      await apiPost(`/savings-goals/${goal.goalId}/contributions`, { amount, contributionDate: date, contributionType: mode, description: description.trim() });
      saved();
    } catch (err) { setError(failure(err, lang)); } finally { setBusy(false); }
  };
  return <Modal title={withdrawing ? (vi ? 'Rút tiền từ mục tiêu' : 'Withdraw from this goal') : (vi ? 'Gần hơn một chút.' : 'One step closer.')} subtitle={goal.name} lang={lang} close={close} busy={busy}>
    <form className="wp-form" onSubmit={submit}>
      <div className="wp-contribution-summary"><Target size={20} /><span>{withdrawing ? (vi ? 'Có thể rút' : 'Available to withdraw') : (vi ? 'Còn cần' : 'Left to save')}</span><strong>{withdrawing ? money(goal.savedAmount, goal.currencyCode, lang) : money(Math.max(0, n(goal.targetAmount) - n(goal.savedAmount)), goal.currencyCode, lang)}</strong></div>
      <label className="wp-field"><span>{withdrawing ? (vi ? 'Số tiền rút' : 'Withdrawal amount') : (vi ? 'Số tiền đóng góp' : 'Contribution amount')} ({goal.currencyCode})</span><input autoFocus required type="number" inputMode="decimal" min="0.0001" max={withdrawing ? n(goal.savedAmount) : undefined} step="0.0001" placeholder="0" value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label className="wp-field"><span>{withdrawing ? (vi ? 'Ngày rút' : 'Withdrawal date') : (vi ? 'Ngày đóng góp' : 'Contribution date')}</span><input required type="date" max={today()} value={date} onChange={event => setDate(event.target.value)} /></label>
      <label className="wp-field"><span>{vi ? 'Ghi chú (tùy chọn)' : 'Note (optional)'}</span><textarea rows={2} maxLength={500} value={description} onChange={event => setDescription(event.target.value)} /></label>
      <p className="wp-form-note"><ShieldCheck size={16} />{withdrawing ? (vi ? 'Khoản rút được ghi nhận vào lịch sử mục tiêu. Số dư tài khoản không thay đổi.' : 'The withdrawal is recorded in the goal history. Account balances do not change.') : (vi ? 'Đây là ghi nhận tiết kiệm cho mục tiêu. Số dư tài khoản của bạn không thay đổi.' : 'This records savings toward your goal. Your account balance will not change.')}</p>
      {error && <p className="wp-form-error" role="alert">{error}</p>}
      <FormActions close={close} busy={busy} lang={lang} label={withdrawing ? (vi ? 'Xác nhận rút' : 'Confirm withdrawal') : (vi ? 'Ghi nhận đóng góp' : 'Record contribution')} />
    </form>
  </Modal>;
}

function GoalHistory({ goal, lang, close }: { goal: Goal; lang: Language; close: () => void }) {
  const vi = lang === 'vi';
  const query = useQuery({ queryKey: ['workspace', 'contributions', goal.goalId], queryFn: ({ signal }) => apiGet<Contribution[]>(`/savings-goals/${goal.goalId}/contributions`, signal) });
  return <Modal title={goal.name} subtitle={vi ? 'Mỗi bước tiến đều đáng ghi nhận.' : 'Every step forward deserves to be seen.'} lang={lang} close={close}>
    <div className="wp-history">{query.isPending ? <LoadingState lang={lang} /> : query.isError ? <ErrorState lang={lang} error={query.error} retry={() => void query.refetch()} />
      : !query.data.length ? <EmptyState icon={<History size={26} />} title={vi ? 'Hành trình đang chờ bạn' : 'Your journey starts here'} description={vi ? 'Các khoản đóng góp sẽ được lưu lại tại đây.' : 'Your contributions will appear here as you save.'} />
        : query.data.map(item => <div className="wp-history-row" key={item.contributionId}><span className={`wp-metric-icon ${item.contributionType === 'CONTRIBUTION' ? 'wp-lime' : 'wp-peach'}`}>{item.contributionType === 'CONTRIBUTION' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span>
          <div><strong>{item.description || (item.contributionType === 'CONTRIBUTION' ? (vi ? 'Đóng góp tiết kiệm' : 'Savings contribution') : (vi ? 'Rút tiết kiệm' : 'Withdrawal'))}</strong><span>{dateLabel(item.contributionDate, lang)}</span></div>
          <b>{item.contributionType === 'CONTRIBUTION' ? '+' : '−'}{money(item.amount, goal.currencyCode, lang)}</b>
        </div>)}</div>
  </Modal>;
}

export function GoalsPage({ currentLang: lang, currency = 'VND' }: PlanningPageProps) {
  const vi = lang === 'vi';
  const client = useQueryClient();
  const notify = useToast();
  const confirm = useConfirm();
  const [selectedCurrency, setCurrency] = useState(currency);
  const [filter, setFilter] = useState<'ACTIVE' | 'COMPLETED' | 'ALL'>('ACTIVE');
  const [showForm, setShowForm] = useState(false);
  const [contributing, setContributing] = useState<Goal | null>(null);
  const [history, setHistory] = useState<Goal | null>(null);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [withdrawing, setWithdrawing] = useState<Goal | null>(null);
  const query = useQuery({ queryKey: ['workspace', 'goals'], queryFn: ({ signal }) => apiGet<Goal[]>('/savings-goals', signal) });
  const goals = (query.data ?? []).filter(goal => goal.currencyCode === selectedCurrency);
  const liveGoals = goals.filter(goal => goal.status !== 'ARCHIVED');
  const visible = goals.filter(goal => filter === 'ALL' || goal.status === filter);
  const totalSaved = liveGoals.reduce((sum, goal) => sum + n(goal.savedAmount), 0);
  const target = liveGoals.reduce((sum, goal) => sum + n(goal.targetAmount), 0);
  const completed = goals.filter(goal => goal.status === 'COMPLETED').length;
  const saved = (isContribution = false) => {
    setShowForm(false); setEditing(null); setContributing(null); setWithdrawing(null);
    notify.success(isContribution ? (vi ? 'Đã ghi nhận. Bạn vừa tiến thêm một bước.' : 'Recorded. Another step forward.') : (editing ? (vi ? 'Đã cập nhật mục tiêu.' : 'Goal updated.') : (vi ? 'Mục tiêu đã sẵn sàng.' : 'Your goal is ready.')));
    void client.invalidateQueries();
  };
  const archive = async (goal: Goal) => {
    const approved = await confirm({
      title: vi ? 'Lưu trữ mục tiêu?' : 'Archive this goal?',
      description: vi ? `“${goal.name}” sẽ rời khỏi danh sách đang theo dõi. Toàn bộ lịch sử đóng góp vẫn được giữ lại.` : `“${goal.name}” will leave your active goals. Its full contribution history is kept.`,
      confirmLabel: vi ? 'Lưu trữ' : 'Archive',
      cancelLabel: vi ? 'Giữ lại' : 'Keep it',
    });
    if (!approved) return;
    try { await apiDelete(`/savings-goals/${goal.goalId}`); await client.invalidateQueries(); notify.success(vi ? 'Đã lưu trữ mục tiêu.' : 'Goal archived.'); }
    catch (err) { notify.error(failure(err, lang)); }
  };
  return <section className="wp-page">
    <PageHeading eyebrow={vi ? 'TƯƠNG LAI BẮT ĐẦU HÔM NAY' : 'TOMORROW STARTS TODAY'} title={vi ? 'Những điều đáng để dành.' : 'Good things are worth saving for.'}
      description={vi ? 'Biến điều bạn mong muốn thành kế hoạch có thể chạm tới.' : 'Turn your someday into a plan you can make happen.'}
      action={() => setShowForm(true)} actionText={vi ? 'Tạo mục tiêu' : 'New goal'}>
      <CurrencyPicker value={selectedCurrency} values={(query.data ?? []).map(item => item.currencyCode)} onChange={setCurrency} lang={lang} />
    </PageHeading>
    {query.isPending ? <LoadingState lang={lang} /> : query.isError ? <ErrorState error={query.error} lang={lang} retry={() => void query.refetch()} /> : <>
      <div className="wp-goals-overview">
        <div className="wp-hero wp-goals-hero"><div className="wp-goals-hero-content"><span className="wp-overline">{vi ? 'ĐÃ DÀNH CHO TƯƠNG LAI' : 'SAVED FOR YOUR FUTURE'}</span>
          <div className="wp-hero-amount">{money(totalSaved, selectedCurrency, lang)}</div><p>{vi ? 'Từng khoản nhỏ. Những thay đổi lớn.' : 'Small steps. Meaningful possibilities.'}</p>
          <div className="wp-hero-pill"><TrendingUp size={15} />{target > 0 ? `${Math.round(totalSaved / target * 100)}% ${vi ? 'tổng mục tiêu' : 'of your total goal'}` : (vi ? 'Sẵn sàng cho khởi đầu mới' : 'Ready for a fresh start')}</div></div>
          <div className="wp-goal-art" aria-hidden="true"><div /><div /><div /><Target size={62} strokeWidth={1.2} /></div>
        </div>
        <div className="wp-goal-stat"><div className="wp-metric-icon wp-lime"><Target size={22} /></div><strong>{goals.filter(goal => goal.status === 'ACTIVE').length}</strong><span>{vi ? 'Mục tiêu đang thực hiện' : 'Goals in motion'}</span><p>{vi ? 'Một tương lai do bạn lựa chọn.' : 'A future of your own choosing.'}</p></div>
        <div className="wp-goal-stat"><div className="wp-metric-icon wp-peach"><Sparkles size={22} /></div><strong>{completed}</strong><span>{vi ? 'Mục tiêu đã hoàn thành' : 'Milestones reached'}</span><p>{vi ? 'Ghi nhận từng thành quả.' : 'Celebrate every achievement.'}</p></div>
      </div>
      <div className="wp-section-bar"><h2>{vi ? 'Bảng mục tiêu của bạn' : 'Your vision board'} <span>{visible.length}</span></h2><div className="wp-tabs" aria-label={vi ? 'Lọc mục tiêu' : 'Filter goals'}>
        {(['ACTIVE', 'COMPLETED', 'ALL'] as const).map(value => <button key={value} className={filter === value ? 'is-active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'ACTIVE' ? (vi ? 'Đang thực hiện' : 'In progress') : value === 'COMPLETED' ? (vi ? 'Đã đạt được' : 'Completed') : (vi ? 'Tất cả' : 'All goals')}</button>)}
      </div></div>
      {visible.length === 0 ? <EmptyState icon={<Target size={30} />} title={filter === 'COMPLETED' ? (vi ? 'Mỗi hành trình đều có đích đến' : 'Every journey has a milestone') : (vi ? 'Điều tiếp theo bạn mong muốn là gì?' : 'What are you looking forward to?')}
        description={filter === 'COMPLETED' ? (vi ? 'Khi đạt số tiền mục tiêu, thành quả của bạn sẽ xuất hiện tại đây.' : 'Once you reach a target, your achievement will appear here.') : (vi ? 'Một chuyến đi, quỹ dự phòng hay ngôi nhà đầu tiên. Bắt đầu từ đây.' : 'A trip, a safety net, a place of your own. Start here.')}
        actionText={vi ? 'Tạo mục tiêu' : 'Create a goal'} action={() => setShowForm(true)} />
        : <div className="wp-card-grid">{visible.map((goal, index) => {
          const percent = n(goal.progressPercent);
          const reached = goal.status === 'COMPLETED';
          const overdue = goal.status === 'ACTIVE' && goal.targetDate && goal.targetDate < today();
          return <article className={`wp-goal-card wp-goal-color-${index % 3}`} key={goal.goalId}>
            <div className="wp-goal-card-top"><span className={`wp-status ${reached ? 'wp-status-good' : overdue ? 'wp-status-warning' : 'wp-status-neutral'}`}>{reached ? (vi ? 'Đã hoàn thành' : 'Completed') : goal.status === 'ARCHIVED' ? (vi ? 'Đã lưu trữ' : 'Archived') : overdue ? (vi ? 'Đã qua ngày mục tiêu' : 'Past target date') : (vi ? 'Đang thực hiện' : 'In progress')}</span>
              <div className="wp-goal-ring" style={{ '--wp-progress': `${pct(percent)}%` } as CSSProperties} role="img" aria-label={`${Math.round(percent)}%`}>
                <span>{reached ? <CheckCheck size={27} /> : <Target size={27} />}<b>{Math.round(percent)}%</b></span>
              </div></div>
            <h3>{goal.name}</h3><p className="wp-goal-description">{goal.description || (vi ? 'Từng bước tiến về điều bạn mong muốn.' : 'One step at a time toward what matters.')}</p>
            <div className="wp-goal-saved"><strong>{money(goal.savedAmount, goal.currencyCode, lang)}</strong><span>{vi ? 'trên' : 'of'} {money(goal.targetAmount, goal.currencyCode, lang)}</span></div>
            <div className="wp-progress"><span style={{ width: `${pct(percent)}%` }} /></div>
            <div className="wp-goal-deadline"><CalendarDays size={14} />{dateLabel(goal.targetDate, lang)}{goal.linkedAccountName && <span title={goal.linkedAccountName}><Landmark size={13} />{goal.linkedAccountName}</span>}</div>
            <div className="wp-goal-actions"><button className="wp-button wp-button-secondary" onClick={() => setHistory(goal)}><History size={16} />{vi ? 'Lịch sử' : 'History'}</button>
              {goal.status === 'ACTIVE' && <button className="wp-button wp-button-primary" onClick={() => setContributing(goal)}><Plus size={16} />{vi ? 'Đóng góp' : 'Add savings'}</button>}
              {goal.status === 'ACTIVE' && n(goal.savedAmount) > 0 && <button className="wp-button wp-button-secondary" onClick={() => setWithdrawing(goal)}><Minus size={16} />{vi ? 'Rút' : 'Withdraw'}</button>}
              <div className="wp-card-actions"><button className="wp-icon-button" aria-label={vi ? 'Sửa mục tiêu' : 'Edit goal'} onClick={() => { setEditing(goal); setShowForm(true); }}><Pencil size={15} /></button><button className="wp-icon-button" aria-label={vi ? 'Lưu trữ mục tiêu' : 'Archive goal'} onClick={() => void archive(goal)}><Archive size={15} /></button></div>
              {reached && <span className="wp-achieved"><Sparkles size={15} />{vi ? 'Bạn đã làm được!' : 'You made it!'}</span>}
            </div>
          </article>;
        })}</div>}
      <p className="wp-footnote"><ShieldCheck size={15} />{vi ? 'Tiết kiệm mục tiêu được ghi nhận riêng với số dư tài khoản. Tổng quan không bao gồm mục tiêu đã lưu trữ.' : 'Goal savings are recorded separately from account balances. Overview excludes archived goals.'}</p>
    </>}
    {showForm && <GoalForm lang={lang} currency={selectedCurrency} goal={editing} close={() => { setShowForm(false); setEditing(null); }} saved={currencyCode => { setCurrency(currencyCode); setFilter('ACTIVE'); saved(); }} />}
    {contributing && <ContributionForm goal={contributing} lang={lang} close={() => setContributing(null)} saved={() => saved(true)} />}
    {withdrawing && <ContributionForm goal={withdrawing} mode="WITHDRAWAL" lang={lang} close={() => setWithdrawing(null)} saved={() => saved(true)} />}
    {history && <GoalHistory goal={history} lang={lang} close={() => setHistory(null)} />}
  </section>;
}

const accountIcons = { CASH: Wallet, BANK: Landmark, SAVINGS: Target, CREDIT_CARD: CreditCard, OTHER: Layers3 };
function accountLabel(kind: AccountKind, lang: Language) {
  const labels = {
    CASH: ['Tiền mặt', 'Cash'], BANK: ['Ngân hàng', 'Bank account'],
    SAVINGS: ['Tiết kiệm', 'Savings'], CREDIT_CARD: ['Thẻ tín dụng', 'Credit card'], OTHER: ['Khác', 'Other'],
  };
  return (labels[kind] ?? labels.OTHER)[lang === 'vi' ? 0 : 1];
}

function AccountForm({ lang, currency, close, saved, account }: { lang: Language; currency: string; close: () => void; saved: (currencyCode: string) => void; account?: Account | null }) {
  const vi = lang === 'vi';
  const editing = !!account;
  const [form, setForm] = useState({
    name: account?.name ?? '', accountType: account?.accountType ?? 'BANK',
    openingBalance: account ? String(account.openingBalance) : '', currencyCode: account?.currencyCode ?? currency,
    description: account?.description ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || (!editing && (!Number.isFinite(Number(form.openingBalance)) || Number(form.openingBalance) < 0))) { setError(vi ? 'Nhập tên và số dư ban đầu từ 0 trở lên.' : 'Enter a name and a non-negative opening balance.'); return; }
    setBusy(true); setError('');
    try {
      if (account) await apiPut(`/accounts/${account.accountId}`, { name: form.name.trim(), description: form.description.trim() });
      else await apiPost('/accounts', { ...form, name: form.name.trim(), openingBalance: form.openingBalance || '0' });
      saved(form.currencyCode);
    } catch (err) { setError(failure(err, lang)); } finally { setBusy(false); }
  };
  return <Modal title={editing ? (vi ? 'Chỉnh sửa tài khoản' : 'Edit your account') : (vi ? 'Thêm một nơi giữ tiền' : 'A place for your money')} subtitle={editing ? (vi ? 'Cập nhật tên và ghi chú. Loại tiền và số dư ban đầu được giữ nguyên để bảo toàn lịch sử.' : 'Update the name and note. Currency and opening balance stay fixed to protect your history.') : (vi ? 'Theo dõi số dư và dòng tiền trong một không gian.' : 'Track your balance and cash flow in one space.')} close={close} busy={busy} lang={lang}>
    <form className="wp-form" onSubmit={submit}>
      <label className="wp-field"><span>{vi ? 'Tên tài khoản' : 'Account name'}</span><input autoFocus required maxLength={100} placeholder={vi ? 'Ví dụ: Tài khoản chi tiêu chính' : 'e.g. Everyday account'} value={form.name} onChange={event => set('name', event.target.value)} /></label>
      <label className="wp-field"><span>{vi ? 'Loại tài khoản' : 'Account type'}</span><select value={form.accountType} disabled={editing} onChange={event => set('accountType', event.target.value)}>
        {(Object.keys(accountIcons) as AccountKind[]).map(kind => <option key={kind} value={kind}>{accountLabel(kind, lang)}</option>)}
      </select></label>
      <div className="wp-form-grid"><label className="wp-field"><span>{vi ? 'Số dư ban đầu' : 'Opening balance'}</span><input type="number" inputMode="decimal" min="0" step="0.0001" placeholder="0" disabled={editing} value={form.openingBalance} onChange={event => set('openingBalance', event.target.value)} /></label>
        <CurrencyField value={form.currencyCode} setValue={value => set('currencyCode', value)} lang={lang} /></div>
      <label className="wp-field"><span>{vi ? 'Ghi chú (tùy chọn)' : 'Description (optional)'}</span><textarea rows={3} maxLength={500} value={form.description} onChange={event => set('description', event.target.value)} /></label>
      <p className="wp-form-note"><ShieldCheck size={16} />{editing ? (vi ? 'Số dư hiện tại vẫn được tính từ số dư ban đầu và toàn bộ giao dịch đã ghi nhận.' : 'Your current balance still reflects the opening balance and every recorded transaction.') : (vi ? 'Đây là tài khoản theo dõi thủ công. Số dư sẽ thay đổi theo các giao dịch bạn ghi nhận.' : 'This is a manually tracked account. Its balance updates with the transactions you record.')}</p>
      {error && <p className="wp-form-error" role="alert">{error}</p>}
      <FormActions close={close} busy={busy} lang={lang} label={editing ? (vi ? 'Lưu thay đổi' : 'Save changes') : (vi ? 'Tạo tài khoản' : 'Create account')} />
    </form>
  </Modal>;
}

export function AccountsPage({ currentLang: lang, currency = 'VND' }: PlanningPageProps) {
  const vi = lang === 'vi';
  const client = useQueryClient();
  const notify = useToast();
  const confirm = useConfirm();
  const [selectedCurrency, setCurrency] = useState(currency);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const query = useAccounts();
  const accounts = (query.data ?? []).filter(account => !account.isArchived && account.currencyCode === selectedCurrency);
  const total = accounts.reduce((sum, account) => sum + n(account.currentBalance), 0);
  const positiveTotal = accounts.reduce((sum, account) => sum + Math.max(0, n(account.currentBalance)), 0);
  const breakdown = (Object.keys(accountIcons) as AccountKind[]).map(kind => ({ kind, amount: accounts.filter(account => account.accountType === kind).reduce((sum, account) => sum + n(account.currentBalance), 0), count: accounts.filter(account => account.accountType === kind).length })).filter(item => item.count > 0);
  const archive = async (account: Account) => {
    const approved = await confirm({
      title: vi ? 'Lưu trữ tài khoản?' : 'Archive this account?',
      description: vi ? `“${account.name}” sẽ rời khỏi danh sách theo dõi. Các giao dịch cũ và số dư lịch sử vẫn được bảo toàn.` : `“${account.name}” will leave your tracked accounts. Its transactions and historical balance are preserved.`,
      confirmLabel: vi ? 'Lưu trữ' : 'Archive',
      cancelLabel: vi ? 'Giữ lại' : 'Keep it',
    });
    if (!approved) return;
    try {
      await apiPatch(`/accounts/${account.accountId}/archive`, { isArchived: true });
      notify.success(vi ? 'Đã lưu trữ tài khoản. Lịch sử giao dịch vẫn được bảo toàn.' : 'Account archived. Your transaction history is preserved.');
      await client.invalidateQueries();
    } catch (err) { notify.error(failure(err, lang)); }
  };
  return <section className="wp-page">
    <PageHeading eyebrow={vi ? 'TIỀN CỦA BẠN, TRONG TẦM NHÌN' : 'YOUR MONEY, IN VIEW'} title={vi ? 'Mọi tài khoản. Một góc nhìn.' : 'Every account. One clear view.'}
      description={vi ? 'Biết tiền đang ở đâu, để tự tin với bước đi tiếp theo.' : 'Know where your money stands, so you can decide what comes next.'}
      action={() => setShowForm(true)} actionText={vi ? 'Thêm tài khoản' : 'Add account'}>
      <CurrencyPicker value={selectedCurrency} values={(query.data ?? []).map(item => item.currencyCode)} onChange={setCurrency} lang={lang} />
    </PageHeading>
    {query.isPending ? <LoadingState lang={lang} /> : query.isError ? <ErrorState error={query.error} lang={lang} retry={() => void query.refetch()} /> : <>
      <div className="wp-accounts-overview"><div className="wp-hero wp-account-hero"><div className="wp-hero-top"><span className="wp-overline">{vi ? 'TỔNG SỐ DƯ' : 'YOUR TOTAL BALANCE'}</span><div className="wp-hero-symbol"><Landmark size={22} /></div></div>
        <div className="wp-hero-amount">{money(total, selectedCurrency, lang)}</div><p>{vi ? `Trong ${accounts.length} tài khoản ${selectedCurrency}` : `Across ${accounts.length} ${selectedCurrency} accounts`}</p>
        <div className="wp-account-hero-bottom"><span><ShieldCheck size={15} />{vi ? 'Tính từ giao dịch đã ghi nhận' : 'Calculated from recorded transactions'}</span><span>{selectedCurrency}</span></div></div>
        <div className="wp-allocation"><div className="wp-section-bar"><h2>{vi ? 'Phân bổ tài khoản' : 'Where your money lives'}</h2><Layers3 size={19} /></div>
          {breakdown.length ? breakdown.map((item, index) => {
            const Icon = accountIcons[item.kind];
            return <div className="wp-allocation-row" key={item.kind}><div className={`wp-small-icon wp-color-${index % 4}`}><Icon size={16} /></div><div><span>{accountLabel(item.kind, lang)}</span><div className="wp-progress"><span style={{ width: `${positiveTotal > 0 ? pct(item.amount / positiveTotal * 100) : 0}%` }} /></div></div><strong>{money(item.amount, selectedCurrency, lang)}</strong></div>;
          }) : <p className="wp-muted">{vi ? 'Phân bổ sẽ hiển thị khi bạn thêm tài khoản.' : 'Your allocation will appear when you add an account.'}</p>}
        </div></div>
      <div className="wp-section-bar"><h2>{vi ? 'Tài khoản của bạn' : 'Your accounts'} <span>{accounts.length}</span></h2><span className="wp-subtle-label">{vi ? 'Cập nhật từ giao dịch thực tế' : 'Updated from your transactions'}</span></div>
      {accounts.length === 0 ? <EmptyState icon={<Landmark size={29} />} title={vi ? 'Bức tranh tài chính bắt đầu từ đây' : 'Your financial picture starts here'}
        description={vi ? `Thêm tài khoản ${selectedCurrency} đầu tiên để theo dõi tiền mặt, ngân hàng và tiết kiệm.` : `Add your first ${selectedCurrency} account to track cash, banking, and savings.`}
        actionText={vi ? 'Thêm tài khoản đầu tiên' : 'Add your first account'} action={() => setShowForm(true)} />
        : <div className="wp-card-grid wp-account-grid">{accounts.map((account, index) => {
          const Icon = accountIcons[account.accountType] ?? Wallet;
          return <article className={`wp-account-card wp-account-color-${index % 4}`} key={account.accountId}>
            <div className="wp-account-card-top"><div><Icon size={23} /><span>{accountLabel(account.accountType, lang)}</span></div><div className="wp-account-tools"><span className="wp-account-currency">{account.currencyCode}</span><div className="wp-card-actions"><button className="wp-icon-button" aria-label={vi ? 'Sửa tài khoản' : 'Edit account'} onClick={() => { setEditing(account); setShowForm(true); }}><Pencil size={15} /></button><button className="wp-icon-button" aria-label={vi ? 'Lưu trữ tài khoản' : 'Archive account'} onClick={() => void archive(account)}><Archive size={15} /></button></div></div></div>
            <h3>{account.name}</h3><p className="wp-account-balance">{money(account.currentBalance, account.currencyCode, lang)}</p>
            <p className="wp-account-description">{account.description || (vi ? 'Tài khoản theo dõi thủ công' : 'Manually tracked account')}</p>
            <div className="wp-account-card-bottom"><span><span className="wp-live-dot" />{vi ? 'Đang theo dõi' : 'Tracking enabled'}</span><span>{vi ? 'Số dư ban đầu' : 'Opening balance'}<b>{money(account.openingBalance, account.currencyCode, lang)}</b></span></div>
          </article>;
        })}<button className="wp-add-account-card" onClick={() => setShowForm(true)}><span><Plus size={26} /></span><strong>{vi ? 'Thêm tài khoản khác' : 'Add another account'}</strong><p>{vi ? 'Giữ bức tranh tài chính luôn trọn vẹn.' : 'Keep your whole financial picture together.'}</p></button></div>}
      <p className="wp-footnote"><ShieldCheck size={15} />{vi ? 'Số dư = số dư ban đầu + thu nhập − chi tiêu ± chuyển khoản. Các loại tiền được hiển thị riêng, không quy đổi.' : 'Balance = opening balance + income − expenses ± transfers. Currencies are shown separately, without conversion.'}</p>
    </>}
    {showForm && <AccountForm lang={lang} currency={selectedCurrency} account={editing} close={() => { setShowForm(false); setEditing(null); }} saved={currencyCode => { setCurrency(currencyCode); setShowForm(false); notify.success(editing ? (vi ? 'Thông tin tài khoản đã được cập nhật.' : 'Your account details are up to date.') : (vi ? 'Đã tạo tài khoản mới.' : 'Account created.')); setEditing(null); void client.invalidateQueries(); }} />}
  </section>;
}
