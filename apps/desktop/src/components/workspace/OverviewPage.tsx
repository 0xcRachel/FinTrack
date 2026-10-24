import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, CircleArrowUp, Leaf, Plus, Sparkles, Target, Wallet } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { categoryLabel, localeFor, money, monthRange, unwrap } from '../../lib/format';
import type { Language } from '../../lib/i18n';
import type { AccountDto, CashFlowDto, DashboardInsightsDto, DashboardSummaryDto, PageResponse, TransactionPage } from '../../types/api';
import type { NavItemKey } from '../Sidebar';
import { TransactionRows } from './TransactionsPage';

interface Breakdown { categories: { categoryId: string; categoryName: string; amount: string; percentOfExpense: number }[]; totalExpense: string }
interface Goal { goalId: number; name: string; savedAmount: string; targetAmount: string; progressPercent: number; currencyCode: string; status: string }
const palette = ['#38533c', '#9cb46c', '#d2dfa8', '#dfbc87', '#c7cbc0'];

export function OverviewPage({ currentLang, userName, onAdd, onNavigate }: {
  currentLang: Language; userName: string; onAdd: () => void; onNavigate: (tab: NavItemKey) => void;
}) {
  const vi = currentLang === 'vi';
  const [offset, setOffset] = useState(0);
  const [lens, setLens] = useState<string>();
  const range = monthRange(offset);
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: ({signal}) => apiGet<PageResponse<AccountDto>>('/accounts?size=100', signal) });
  const activeAccounts = unwrap(accounts.data).filter(a => !a.isArchived);
  const currencies = [...new Set(activeAccounts.map(a => a.currencyCode))].sort();
  const currencyCounts = activeAccounts.reduce<Record<string, number>>((acc, account) => {
    acc[account.currencyCode] = (acc[account.currencyCode] ?? 0) + 1;
    return acc;
  }, {});
  const dominant = [...currencies].sort((a, b) => (currencyCounts[b] ?? 0) - (currencyCounts[a] ?? 0) || a.localeCompare(b))[0] || 'VND';
  const currency = lens && currencies.includes(lens) ? lens : dominant;
  const lensAccounts = activeAccounts.filter(a => a.currencyCode === currency);
  const params = `startDate=${range.startDate}&endDate=${range.endDate}&currency=${currency}`;
  const summary = useQuery({ queryKey: ['dashboard', 'summary', params], queryFn: ({signal}) => apiGet<DashboardSummaryDto>(`/dashboard/summary?${params}`, signal) });
  const insights = useQuery({ queryKey: ['dashboard', 'insights', params], queryFn: ({signal}) => apiGet<DashboardInsightsDto>(`/dashboard/insights?${params}`, signal) });
  const cash = useQuery({ queryKey: ['dashboard', 'cash-flow', params], queryFn: ({signal}) => apiGet<CashFlowDto>(`/dashboard/cash-flow?${params}`, signal) });
  const breakdown = useQuery({ queryKey: ['dashboard', 'breakdown', params], queryFn: ({signal}) => apiGet<Breakdown>(`/dashboard/expense-breakdown?${params}`, signal) });
  const transactions = useQuery({ queryKey: ['transactions','recent'], queryFn: ({signal}) => apiGet<TransactionPage>('/transactions?size=5&sort=transactionDate,desc', signal) });
  const goals = useQuery({ queryKey: ['goals','overview'], queryFn: ({signal}) => apiGet<PageResponse<Goal>>('/savings-goals?size=100', signal) });
  const ready = !!summary.data && !!accounts.data;
  const value = (v?: string) => ready ? money(v || 0, currentLang, currency) : '—';
  const income = Number(summary.data?.totalIncome || 0);
  const expense = Number(summary.data?.totalExpense || 0);
  const flow = (cash.data?.points ?? []).map(p => ({ ...p, label: p.date.slice(8), income: Number(p.income), expense: Number(p.expense) }));
  const categories = (breakdown.data?.categories ?? []).map(c => ({ ...c, amount: Number(c.amount) })).sort((a,b) => b.amount-a.amount);
  const activeGoals = unwrap(goals.data).filter(g => g.status !== 'ARCHIVED' && g.currencyCode === currency).slice(0,3);
  const month = range.date.toLocaleDateString(localeFor(currentLang), { month: 'long', year: 'numeric' });
  const rate = insights.data?.savingsRate != null ? Math.round(insights.data.savingsRate) : (income > 0 ? Math.round((income - expense) / income * 100) : null);
  const topCategory = insights.data?.topCategoryName ? categoryLabel(insights.data.topCategoryName, currentLang) : null;
  const topCategoryShare = insights.data?.topCategoryPercent != null ? Math.round(insights.data.topCategoryPercent) : null;
  const pressure = (insights.data?.overBudgetCount ?? 0) + (insights.data?.nearLimitCount ?? 0);
  const focusHeadline = rate != null && ready
    ? (vi ? `Bạn đang giữ lại\n${rate}% thu nhập.` : `You are keeping\n${rate}% of income.`)
    : ready && expense > income
      ? (vi ? 'Một nhịp chậm.\nĐể nhìn lại.' : 'A pause.\nA clearer look.')
      : (income > expense && ready ? (vi ? 'Dành chỗ cho\nnhững điều lớn hơn.' : 'Make room for\nbigger things.') : (vi ? 'Mỗi bước nhỏ.\nMột tương lai lớn.' : 'Small steps.\nBigger possibilities.'));
  const focusCopy = topCategory
    ? (vi ? `${topCategory} là nhóm chi lớn nhất, chiếm ${topCategoryShare ?? 0}% chi tiêu trong kỳ. ${pressure > 0 ? `${pressure} ngân sách đang cần bạn chú ý.` : 'Mọi ngân sách vẫn trong tầm kiểm soát.'}` : `${topCategory} is your largest expense group at ${topCategoryShare ?? 0}% of spending. ${pressure > 0 ? `${pressure} budgets need a look.` : 'Every budget is still under control.'}`)
    : (vi ? 'Ghi lại giao dịch và đặt mục tiêu đầu tiên. Bức tranh tài chính bắt đầu từ bạn.' : 'Track a transaction. Set your first goal. A clearer financial picture starts with you.');
  return <div className="ft-page ft-overview">
    <div className="ft-page-heading">
      <div><div className="ft-eyebrow"><span />{vi ? 'MỖI NGÀY, TIẾN MỘT CHÚT' : 'A LITTLE PROGRESS, EVERY DAY'}</div><h1>{vi ? 'Chào' : 'Hello'}, {userName.split(' ').filter(Boolean).at(-1)} <span className="ft-greeting-sun">✳</span></h1><p>{vi ? 'Một góc nhìn rõ ràng hơn cho tiền và những dự định của bạn.' : 'A clearer view of your money. More room for what matters.'}</p></div>
      <div className="ft-heading-actions"><div className="ft-period-control"><button aria-label={vi ? 'Tháng trước' : 'Previous month'} onClick={() => setOffset(offset-1)}><ChevronLeft size={16}/></button><CalendarDays size={15}/><span>{month}</span><button disabled={offset >= 0} aria-label={vi ? 'Tháng sau' : 'Next month'} onClick={() => setOffset(offset+1)}><ChevronRight size={16}/></button></div><button className="ft-btn ft-btn-primary" onClick={onAdd}><Plus size={17}/>{vi ? 'Thêm giao dịch' : 'Add transaction'}</button></div>
    </div>
    {(summary.isError || accounts.isError) && <ErrorNotice currentLang={currentLang} onRetry={() => { void summary.refetch(); void accounts.refetch(); }}/>}
    {currencies.length > 1 && <div className="ft-lens-bar">
      <div className="ft-lens-copy"><span>{vi ? 'ĐANG XEM THEO' : 'VIEWING IN'}</span><b>{currency}</b><small>{vi ? `${lensAccounts.length}/${activeAccounts.length} tài khoản` : `${lensAccounts.length}/${activeAccounts.length} accounts`}</small></div>
      <div className="ft-lens-options" role="group" aria-label={vi ? 'Chọn loại tiền để tổng hợp' : 'Choose the currency to aggregate'}>
        {currencies.map(code => <button key={code} type="button" aria-pressed={code === currency} className={code === currency ? 'active' : ''} onClick={() => setLens(code)}>{code}<small>{currencyCounts[code]}</small></button>)}
      </div>
      <p>{vi ? `Mọi con số tổng hợp bên dưới chỉ tính các tài khoản ${currency}. Đổi loại tiền để xem bức tranh còn lại.` : `Every total below uses only your ${currency} accounts. Switch currency to see the other side of your money.`}</p>
    </div>}
    <div className="ft-overview-grid">
      <section className="ft-balance-card">
        <div className="ft-balance-art" aria-hidden="true"><div/><div/><div/><div/><span>✳</span></div>
        <div className="ft-balance-label"><Wallet size={17}/>{vi ? 'Tổng số dư hiện tại' : 'Your total balance'}<span>{currency}</span></div>
        <div className="ft-balance-amount">{value(summary.data?.totalBalance)}</div>
        <p className="ft-balance-caption">{accounts.data ? (currencies.length > 1 ? `${lensAccounts.length} ${vi ? 'tài khoản' : 'accounts'} ${currency} · ${activeAccounts.length} ${vi ? 'tài khoản tổng cộng' : 'accounts in total'}` : `${activeAccounts.length} ${vi ? 'tài khoản trong không gian của bạn' : 'accounts in your workspace'}`) : vi ? 'Đang cập nhật số dư của bạn' : 'Updating your balance'}</p>
        <div className="ft-balance-bottom"><span><span className="ft-live-dot"/>{vi ? `Số liệu tổng hợp theo ${currency}` : `Aggregated in ${currency}`}</span><button onClick={() => onNavigate('accounts')}>{vi ? 'Xem tài khoản' : 'View accounts'}<ArrowUpRight size={16}/></button></div>
      </section>
      <section className="ft-focus-card">
        <div className="ft-card-top"><span className="ft-eyebrow"><Sparkles size={15}/>{vi ? 'GÓC NHÌN THÁNG NÀY' : 'THIS MONTH, IN FOCUS'}</span><Leaf size={25} strokeWidth={1.3}/></div>
        <h2>{focusHeadline}</h2>
        <p>{focusCopy}</p>
        <div className="ft-signal-row">
          <div><small>{vi ? 'Danh mục lớn nhất' : 'Top category'}</small><b>{topCategory ?? '—'}{topCategoryShare != null && <em> · {topCategoryShare}%</em>}</b></div>
          <div><small>{vi ? 'Ngân sách cần chú ý' : 'Budgets to watch'}</small><b>{insights.data ? pressure : '—'}{insights.data && <em> / {insights.data.budgetCount}</em>}</b></div>
          <div><small>{vi ? 'Mục tiêu đang tiến' : 'Goals in motion'}</small><b>{insights.data ? insights.data.activeGoals : '—'}{insights.data && <em> · {insights.data.completedGoals} {vi ? 'xong' : 'done'}</em>}</b></div>
        </div>
        <button className="ft-text-button" onClick={() => onNavigate('insights')}>{vi ? 'Khám phá góc nhìn tài chính' : 'Explore your money insights'}<CircleArrowUp size={23}/></button>
      </section>
      <div className="ft-metrics">
        <Metric icon={<ArrowDownLeft size={20}/>} label={vi ? 'Thu nhập trong kỳ' : 'Period income'} value={value(summary.data?.totalIncome)} caption={vi ? 'Tiền vào các tài khoản' : 'Money coming into your accounts'} color="green"/>
        <Metric icon={<ArrowUpRight size={20}/>} label={vi ? 'Chi tiêu trong kỳ' : 'Period expenses'} value={value(summary.data?.totalExpense)} caption={vi ? 'Những khoản đã chi' : 'Money spent during this period'} color="peach"/>
        <Metric icon={<Target size={20}/>} label={vi ? 'Dòng tiền ròng' : 'Net cash flow'} value={value(summary.data?.netCashFlow)} caption={vi ? 'Thu nhập trừ chi tiêu' : 'Income minus expenses'} color="lilac"/>
      </div>
      <section className="ft-card ft-cashflow">
        <div className="ft-card-top"><div><h2>{vi ? 'Nhịp điệu dòng tiền' : 'Your cash flow'}</h2><p className="ft-subtext">{vi ? 'Thu nhập và chi tiêu theo ngày' : 'Your income and expenses, day by day'}</p></div><button className="ft-icon-btn ft-outlined" aria-label={vi ? 'Xem báo cáo' : 'View reports'} onClick={() => onNavigate('reports')}><ArrowUpRight size={18}/></button></div>
        <div className="ft-chart-key"><span><i style={{background:'#526e45'}}/>{vi ? 'Thu nhập' : 'Income'}</span><span><i style={{background:'#c6cea9'}}/>{vi ? 'Chi tiêu' : 'Expenses'}</span><small>{currency}</small></div>
        {cash.isError ? <ErrorNotice currentLang={currentLang} onRetry={() => void cash.refetch()}/> : !flow.some(p => p.income || p.expense) ?
          <ChartEmpty loading={cash.isLoading || accounts.isLoading} currentLang={currentLang} onAdd={onAdd}/> :
          <div className="ft-chart" role="img" aria-label={vi ? `Biểu đồ dòng tiền ${month}` : `Cash flow chart for ${month}`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={flow} margin={{top:10,right:5,left:-18,bottom:0}}>
            <defs><linearGradient id="ft-income-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a8c482" stopOpacity={.35}/><stop offset="100%" stopColor="#a8c482" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#edf0e8"/><XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={25} tick={{fill:'#8b9286',fontSize:11}}/><YAxis tickLine={false} axisLine={false} tick={{fill:'#8b9286',fontSize:10}} tickFormatter={v => new Intl.NumberFormat(localeFor(currentLang),{notation:'compact'}).format(v)}/>
            <Tooltip formatter={(v, name) => [money(Number(v),currentLang,currency), name === 'income' ? (vi ? 'Thu nhập' : 'Income') : (vi ? 'Chi tiêu' : 'Expenses')]} labelFormatter={label => `${vi ? 'Ngày' : 'Day'} ${label}`} contentStyle={{borderRadius:12,border:'1px solid #e5e8de',fontSize:12}}/>
            <Area type="monotone" dataKey="expense" stroke="#bcc8a1" fill="#edf0e2" fillOpacity={.4} strokeWidth={2} isAnimationActive={false}/>
            <Area type="monotone" dataKey="income" stroke="#526e45" fill="url(#ft-income-gradient)" strokeWidth={2.5} isAnimationActive={false}/>
          </AreaChart></ResponsiveContainer></div>}
      </section>
      <section className="ft-card ft-spending">
        <div className="ft-card-top"><div><h2>{vi ? 'Tiền của bạn đi đâu?' : 'Where your money goes'}</h2><p className="ft-subtext">{vi ? 'Chi tiêu theo danh mục' : 'Expenses by category'}</p></div></div>
        {breakdown.isError ? <ErrorNotice currentLang={currentLang} onRetry={() => void breakdown.refetch()}/> : categories.length === 0 ? <ChartEmpty loading={breakdown.isLoading || accounts.isLoading} currentLang={currentLang} onAdd={onAdd}/> : <>
          <div className="ft-donut"><ResponsiveContainer width="100%" height={170}><PieChart><Pie data={categories} dataKey="amount" innerRadius={59} outerRadius={77} paddingAngle={3} cornerRadius={5} stroke="none" isAnimationActive={false}>{categories.map((c,i) => <Cell key={c.categoryId ?? i} fill={palette[i%palette.length]}/>)}</Pie><Tooltip formatter={(v) => money(Number(v),currentLang,currency)} /></PieChart></ResponsiveContainer><div className="ft-donut-center"><small>{vi ? 'Tổng chi tiêu' : 'Total spent'}</small><b>{money(breakdown.data?.totalExpense || 0,currentLang,currency)}</b></div></div>
          <div className="ft-category-list">{categories.slice(0,4).map((c,i) => <div key={c.categoryId ?? i}><i style={{background:palette[i]}}/><span>{categoryLabel(c.categoryName,currentLang)}</span><b>{Number(c.percentOfExpense).toFixed(0)}%</b></div>)}</div>
        </>}
      </section>
      <section className="ft-card ft-recent"><div className="ft-card-top"><h2>{vi ? 'Giao dịch gần đây' : 'Recent transactions'}</h2><button className="ft-text-button" onClick={() => onNavigate('transactions')}>{vi ? 'Xem tất cả' : 'View all'}<ArrowRight size={16}/></button></div>{transactions.isError ? <ErrorNotice currentLang={currentLang} onRetry={() => void transactions.refetch()}/> : <TransactionRows rows={transactions.data?.content ?? []} currentLang={currentLang} loading={transactions.isLoading} compact onAdd={onAdd}/>}</section>
      <section className="ft-card ft-goals-preview"><div className="ft-card-top"><h2>{vi ? 'Tiến gần mục tiêu' : 'Closer to your goals'}</h2><button className="ft-icon-btn ft-outlined" onClick={() => onNavigate('goals')} aria-label={vi ? 'Xem mục tiêu' : 'View goals'}><ArrowUpRight size={18}/></button></div>
        {goals.isError ? <ErrorNotice currentLang={currentLang} onRetry={() => void goals.refetch()}/> : activeGoals.length ? activeGoals.map((g,i) => <div className="ft-mini-goal" key={g.goalId}><div><span className={`ft-goal-icon goal-${i}`}><Target size={18}/></span><b>{g.name}</b><small>{Number(g.progressPercent).toFixed(0)}%</small></div><progress value={Number(g.savedAmount)} max={Number(g.targetAmount) || 1}/><p>{money(g.savedAmount,currentLang,g.currencyCode)}<span>/ {money(g.targetAmount,currentLang,g.currencyCode)}</span></p></div>) : <div className="ft-goal-empty"><span><Target size={30} strokeWidth={1.3}/></span><h3>{goals.isLoading ? (vi ? 'Đang tải mục tiêu...' : 'Loading goals...') : (vi ? 'Điều tiếp theo bạn mơ đến?' : 'What’s your next big thing?')}</h3><p>{vi ? 'Một chuyến đi, một tổ ấm, hay sự an tâm. Bắt đầu dành dụm từ hôm nay.' : 'A journey, a home, or peace of mind. Start putting something aside today.'}</p><button className="ft-btn ft-btn-secondary" onClick={() => onNavigate('goals')}><Plus size={16}/>{vi ? 'Tạo mục tiêu' : 'Create a goal'}</button></div>}
      </section>
    </div>
    <footer className="ft-page-footer"><span>fintrack.</span><p>{vi ? 'Rõ ràng hôm nay. Vững vàng ngày mai.' : 'Clarity today. Confidence tomorrow.'}</p><span>{vi ? 'Không gian của riêng bạn' : 'Your personal money space'}</span></footer>
  </div>;
}
function Metric({icon,label,value,caption,color}:{icon:React.ReactNode;label:string;value:string;caption:string;color:string}) {
  return <section className="ft-metric"><div className="ft-metric-label"><span>{label}</span><span className={`ft-metric-icon ${color}`}>{icon}</span></div><strong>{value}</strong><p>{caption}</p></section>;
}
export function ErrorNotice({currentLang,onRetry}:{currentLang:Language;onRetry:()=>void}) {
  return <div className="ft-error" role="alert"><span>{currentLang === 'vi' ? 'Chưa tải được dữ liệu. Vui lòng kiểm tra kết nối.' : 'We couldn’t load your data. Please check your connection.'}</span><button onClick={onRetry}>{currentLang === 'vi' ? 'Thử lại' : 'Try again'}</button></div>;
}
function ChartEmpty({loading,currentLang,onAdd}:{loading:boolean;currentLang:Language;onAdd:()=>void}) {
  const vi = currentLang === 'vi';
  return <div className="ft-chart-empty"><div className="ft-empty-bars" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div><b>{loading ? (vi ? 'Đang tải dữ liệu...' : 'Loading your data...') : (vi ? 'Bức tranh đang chờ bạn' : 'Your story starts here')}</b><p>{vi ? 'Ghi lại thu chi để thấy xu hướng của bạn.' : 'Track your money to see the bigger picture.'}</p><button className="ft-text-button" onClick={onAdd}>{vi ? 'Ghi lại giao dịch' : 'Add a transaction'}<ArrowRight size={15}/></button></div>;
}
