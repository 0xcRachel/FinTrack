import { ArrowDownUp, ChartNoAxesCombined, CircleHelp, Command, LayoutGrid, LogOut, Settings2, Sparkles, Target, Tags, Wallet, X } from 'lucide-react';
import type { Language } from '../lib/i18n';
export type NavItemKey = 'dashboard' | 'transactions' | 'accounts' | 'categories' | 'budgets' | 'goals' | 'reports' | 'insights' | 'settings' | 'help';
export const navLabels = (lang: Language): Record<NavItemKey, string> => lang === 'vi' ? {
  dashboard: 'Tổng quan', transactions: 'Giao dịch', accounts: 'Tài khoản', categories: 'Danh mục', budgets: 'Ngân sách', goals: 'Mục tiêu',
  reports: 'Báo cáo', insights: 'Góc nhìn tài chính', settings: 'Cài đặt', help: 'Trợ giúp',
} : { dashboard: 'Overview', transactions: 'Transactions', accounts: 'Accounts', categories: 'Categories', budgets: 'Budgets', goals: 'Savings goals',
  reports: 'Reports', insights: 'Money insights', settings: 'Settings', help: 'Help center' };
const icons = { dashboard: LayoutGrid, transactions: ArrowDownUp, accounts: Wallet, categories: Tags, budgets: ChartNoAxesCombined, goals: Target,
  reports: ChartNoAxesCombined, insights: Sparkles, settings: Settings2, help: CircleHelp };
export function Brand() {
  return <div className="ft-brand"><span className="ft-brand-mark"><Command size={22} strokeWidth={2.2} /></span><span>fintrack<span className="ft-brand-dot">.</span></span></div>;
}
export function Sidebar({ activeTab, onSelectTab, onLogout, currentLang, userName, open, onClose }: {
  activeTab: NavItemKey; onSelectTab: (tab: NavItemKey) => void; onLogout: () => void; currentLang: Language; userName: string; open: boolean; onClose: () => void;
}) {
  const vi = currentLang === 'vi';
  const labels = navLabels(currentLang);
  const item = (key: NavItemKey) => { const Icon = icons[key]; return <button key={key} className={`ft-nav-item ${activeTab === key ? 'active' : ''}`}
    aria-current={activeTab === key ? 'page' : undefined} onClick={() => { onSelectTab(key); onClose(); }}><Icon size={18} strokeWidth={1.7} /><span>{labels[key]}</span>
    {activeTab === key && <span className="ft-nav-indicator" />}</button>; };
  return <>
    {open && <button className="ft-sidebar-scrim" aria-label={vi ? 'Đóng menu' : 'Close navigation'} onClick={onClose} />}
    <aside className={`ft-sidebar ${open ? 'open' : ''}`}>
      <div className="ft-brand-row"><Brand /><button className="ft-mobile-close ft-icon-btn" onClick={onClose} aria-label={vi ? 'Đóng menu' : 'Close navigation'}><X size={20} /></button></div>
      <div className="ft-workspace"><span className="ft-workspace-icon">P</span><div><b>{vi ? 'Không gian cá nhân' : 'Personal workspace'}</b><small>{vi ? 'Tài chính của bạn' : 'Your money, in focus'}</small></div><span className="ft-live-dot" /></div>
      <nav aria-label={vi ? 'Điều hướng chính' : 'Main navigation'}>
        <p className="ft-nav-caption">{vi ? 'KHÔNG GIAN LÀM VIỆC' : 'WORKSPACE'}</p>
        {(['dashboard','transactions','accounts','categories','budgets','goals'] as NavItemKey[]).map(item)}
        <p className="ft-nav-caption">{vi ? 'KHÁM PHÁ' : 'DISCOVER'}</p>
        {(['reports','insights'] as NavItemKey[]).map(item)}
      </nav>
      <div className="ft-sidebar-bottom">
        {item('settings')}{item('help')}
        <div className="ft-sidebar-user"><span className="ft-avatar">{userName.slice(0,1).toUpperCase()}</span><div><b>{userName}</b><small>{vi ? 'Tài khoản cá nhân' : 'Personal account'}</small></div><button onClick={onLogout} className="ft-icon-btn" aria-label={vi ? 'Đăng xuất' : 'Log out'}><LogOut size={17}/></button></div>
      </div>
    </aside>
  </>;
}
