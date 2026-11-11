import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownUp, Bot, ChartNoAxesCombined, Check, ChevronDown, CircleHelp, Command, LayoutGrid, LogOut, Plus, Settings2, Sparkles, Target, Tags, Users, Wallet, X } from 'lucide-react';
import type { Language } from '../lib/i18n';
import type { WorkspaceDto } from '../types/api';
import { workspaceInitial, workspaceMeta, workspaceName } from '../lib/workspaces';
import { SwapText } from './ui/SwapText';

export type NavItemKey = 'dashboard' | 'transactions' | 'accounts' | 'categories' | 'budgets' | 'goals' | 'reports' | 'insights' | 'ai' | 'settings' | 'help';
export const navLabels = (lang: Language): Record<NavItemKey, string> => lang === 'vi' ? {
  dashboard: 'Tổng quan', transactions: 'Giao dịch', accounts: 'Tài khoản', categories: 'Danh mục', budgets: 'Ngân sách', goals: 'Mục tiêu',
  reports: 'Báo cáo', insights: 'Góc nhìn tài chính', ai: 'Trợ lý AI', settings: 'Cài đặt', help: 'Trợ giúp',
} : { dashboard: 'Overview', transactions: 'Transactions', accounts: 'Accounts', categories: 'Categories', budgets: 'Budgets', goals: 'Savings goals',
  reports: 'Reports', insights: 'Money insights', ai: 'AI advisor', settings: 'Settings', help: 'Help center' };
const icons = { dashboard: LayoutGrid, transactions: ArrowDownUp, accounts: Wallet, categories: Tags, budgets: ChartNoAxesCombined, goals: Target,
  reports: ChartNoAxesCombined, insights: Sparkles, ai: Bot, settings: Settings2, help: CircleHelp };

export function Brand() {
  return <div className="ft-brand">
    <span className="ft-brand-mark"><Command size={22} strokeWidth={2.2} /></span>
    <span className="ft-brand-word">fintrack<span className="ft-brand-dot">.</span></span>
  </div>;
}

interface SidebarProps {
  activeTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  onLogout: () => void;
  currentLang: Language;
  userName: string;
  avatarUrl?: string;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  workspaces: WorkspaceDto[];
  activeWorkspaceId: number | null;
  onSwitchWorkspace: (workspaceId: number) => void;
  onCreateWorkspace: () => void;
  onManageWorkspace: (workspace: WorkspaceDto) => void;
}

export function Sidebar({
  activeTab, onSelectTab, onLogout, currentLang, userName, avatarUrl, open, onClose,
  collapsed, workspaces, activeWorkspaceId, onSwitchWorkspace, onCreateWorkspace, onManageWorkspace,
}: SidebarProps) {
  const vi = currentLang === 'vi';
  const labels = navLabels(currentLang);
  const activeWorkspace = workspaces.find(space => space.workspaceId === activeWorkspaceId) ?? null;
  const activeName = activeWorkspace
    ? workspaceName(activeWorkspace, vi)
    : (vi ? 'Không gian cá nhân' : 'Personal workspace');
  const [spaceOpen, setSpaceOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 296 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!spaceOpen) return;
    const close = () => setSpaceOpen(false);
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', key);
    };
  }, [spaceOpen]);

  useEffect(() => { if (collapsed) setSpaceOpen(false); }, [collapsed]);

  const toggleSpaceMenu = () => {
    if (spaceOpen) { setSpaceOpen(false); return; }
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = 296;
    const railRight = trigger.closest('.ft-sidebar')?.getBoundingClientRect().right ?? rect.right;
    const preferredLeft = collapsed ? railRight + 8 : rect.left;
    const left = Math.max(12, Math.min(preferredLeft, window.innerWidth - width - 12));
    const estimatedHeight = 380;
    const top = Math.min(rect.bottom + 8, Math.max(12, window.innerHeight - estimatedHeight - 12));
    setMenuPos({ top, left, width });
    setSpaceOpen(true);
  };

  const chooseWorkspace = (workspaceId: number) => {
    setSpaceOpen(false);
    if (workspaceId !== activeWorkspaceId) onSwitchWorkspace(workspaceId);
    onClose();
  };

  const item = (key: NavItemKey) => {
    const Icon = icons[key];
    return <button key={key} className={`ft-nav-item ${activeTab === key ? 'active' : ''}`}
      aria-current={activeTab === key ? 'page' : undefined}
      title={collapsed ? labels[key] : undefined}
      onClick={() => { onSelectTab(key); onClose(); }}>
      <Icon size={18} strokeWidth={1.7} />
      <span className="ft-nav-label"><SwapText text={labels[key]} /></span>
      {activeTab === key && <span className="ft-nav-indicator" />}
    </button>;
  };

  return <>
    {open && <button className="ft-sidebar-scrim" aria-label={vi ? 'Đóng menu' : 'Close navigation'} onClick={onClose} />}
    <aside className={`ft-sidebar ${open ? 'open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="ft-brand-row">
        <Brand />
        <button className="ft-mobile-close ft-icon-btn" onClick={onClose} aria-label={vi ? 'Đóng menu' : 'Close navigation'}><X size={20} /></button>
      </div>

      <div className={`ft-workspace ${activeWorkspace?.type === 'FAMILY' ? 'is-family' : ''}`}>
        <button ref={triggerRef} type="button" className="ft-workspace-trigger"
          onClick={toggleSpaceMenu} aria-haspopup="menu" aria-expanded={spaceOpen}
          aria-label={vi ? `Không gian hiện tại: ${activeName}` : `Current space: ${activeName}`}
          title={collapsed ? activeName : undefined}>
          <span className={`ft-workspace-icon ${activeWorkspace?.type === 'FAMILY' ? 'is-family' : ''}`}>
            {workspaceInitial(activeWorkspace, vi)}
          </span>
          <span className="ft-workspace-copy">
            <b><SwapText text={activeName} /></b>
            <small>{activeWorkspace ? workspaceMeta(activeWorkspace, vi) : (vi ? 'Tài chính của bạn' : 'Your money, in focus')}</small>
          </span>
          <ChevronDown size={15} className="ft-workspace-caret" />
          <span className="ft-live-dot" />
        </button>
      </div>

      <nav aria-label={vi ? 'Điều hướng chính' : 'Main navigation'}>
        <p className="ft-nav-caption"><span className="ft-nav-caption-text"><SwapText text={vi ? 'KHÔNG GIAN LÀM VIỆC' : 'WORKSPACE'} /></span></p>
        {(['dashboard','transactions','accounts','categories','budgets','goals'] as NavItemKey[]).map(item)}
        <p className="ft-nav-caption"><span className="ft-nav-caption-text"><SwapText text={vi ? 'KHÁM PHÁ' : 'DISCOVER'} /></span></p>
        {(['ai','reports','insights'] as NavItemKey[]).map(item)}
      </nav>

      <div className="ft-sidebar-bottom">
        {item('settings')}{item('help')}
        <div className="ft-sidebar-user">
          <span className="ft-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : userName.slice(0, 1).toUpperCase()}</span>
          <div className="ft-user-copy"><b>{userName}</b><small>{vi ? 'Tài khoản cá nhân' : 'Personal account'}</small></div>
          <button onClick={onLogout} className="ft-icon-btn ft-logout" title={vi ? 'Đăng xuất' : 'Log out'} aria-label={vi ? 'Đăng xuất' : 'Log out'}><LogOut size={17} /></button>
        </div>
      </div>
    </aside>

    {spaceOpen && createPortal(<>
      <div className="ft-space-backdrop" aria-hidden="true" onClick={() => setSpaceOpen(false)} />
      <div className="ft-space-menu" role="menu" aria-label={vi ? 'Các không gian của bạn' : 'Your spaces'}
        style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}>
        <div className="ft-space-menu-head">
          <span>{vi ? 'Không gian của bạn' : 'Your spaces'}</span>
          <small>{workspaces.length}</small>
        </div>
        <div className="ft-space-list">
          {workspaces.map(space => {
            const selected = space.workspaceId === activeWorkspaceId;
            return <button key={space.workspaceId} type="button" role="menuitemradio" aria-checked={selected}
              className={`ft-space-option ${selected ? 'is-selected' : ''}`} onClick={() => chooseWorkspace(space.workspaceId)}>
              <span className={`ft-space-avatar ${space.type === 'FAMILY' ? 'is-family' : ''}`}>
                {workspaceInitial(space, vi)}
              </span>
              <span className="ft-space-option-copy">
                <b>{workspaceName(space, vi)}</b>
                <small>{workspaceMeta(space, vi)}</small>
              </span>
              {selected && <Check size={16} className="ft-space-check" />}
            </button>;
          })}
          {workspaces.length === 0 && <p className="ft-space-empty">{vi ? 'Đang tải không gian…' : 'Loading spaces…'}</p>}
        </div>
        <div className="ft-space-menu-actions">
          <button type="button" onClick={() => { setSpaceOpen(false); onCreateWorkspace(); }}>
            <Plus size={16} />{vi ? 'Tạo không gian mới' : 'Create a new space'}
          </button>
          {activeWorkspace?.type === 'FAMILY' && (
            <button type="button" onClick={() => { setSpaceOpen(false); onManageWorkspace(activeWorkspace); }}>
              <Users size={16} />{vi ? 'Thành viên & chia sẻ' : 'Members & sharing'}
            </button>
          )}
        </div>
      </div>
    </>, document.body)}
  </>;
}
