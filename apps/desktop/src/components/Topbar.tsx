import { ChevronRight, Globe2, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search } from 'lucide-react';
import type { Language } from '../lib/i18n';
import { AppThemeToggle } from './ui/AppThemeToggle';
import { SwapText } from './ui/SwapText';

export function Topbar({ title, workspaceName, currentLang, onLanguageChange, onSearch, onAdd, onMenu, onOpenSettings, onToggleSidebar, sidebarCollapsed, userName, avatarUrl }: {
  title: string;
  workspaceName: string;
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  onSearch: () => void;
  onAdd: () => void;
  onMenu: () => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  userName: string;
  avatarUrl?: string;
}) {
  const vi = currentLang === 'vi';
  return <header className="ft-topbar">
    <div className="ft-topbar-left">
      <button className="ft-icon-btn ft-collapse-toggle" onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? (vi ? 'Mở rộng thanh bên' : 'Expand sidebar') : (vi ? 'Thu gọn thanh bên' : 'Collapse sidebar')}
        aria-expanded={!sidebarCollapsed}
        title={sidebarCollapsed ? (vi ? 'Mở rộng thanh bên' : 'Expand sidebar') : (vi ? 'Thu gọn thanh bên' : 'Collapse sidebar')}>
        {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
      <div className="ft-breadcrumb">
        <button className="ft-icon-btn ft-menu-toggle" onClick={onMenu} aria-label={vi ? 'Mở menu' : 'Open navigation'}><Menu size={21} /></button>
        <span className="ft-breadcrumb-space" title={workspaceName}><SwapText text={workspaceName} /></span>
        <ChevronRight size={13} />
        <b><SwapText text={title} /></b>
      </div>
    </div>
    <div className="ft-topbar-actions">
      <button className="ft-search-trigger" onClick={onSearch}><Search size={16} /><span><SwapText text={vi ? 'Tìm kiếm...' : 'Search anything...'} /></span><kbd>Ctrl K</kbd></button>
      <AppThemeToggle />
      <button className="ft-language" onClick={() => onLanguageChange(vi ? 'en' : 'vi')} aria-label={vi ? 'Switch to English' : 'Đổi sang tiếng Việt'}><Globe2 size={16} /><SwapText text={vi ? 'VI' : 'EN'} /></button>
      <button className="ft-icon-btn ft-top-add" onClick={onAdd} aria-label={vi ? 'Thêm giao dịch' : 'Add transaction'}><Plus size={20} /></button>
      <button className="ft-avatar ft-profile-button" onClick={onOpenSettings} aria-label={vi ? 'Mở hồ sơ' : 'Open profile'}>{avatarUrl ? <img src={avatarUrl} alt="" /> : userName.slice(0, 1).toUpperCase()}</button>
    </div>
  </header>;
}
