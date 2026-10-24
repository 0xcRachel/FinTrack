import { ChevronRight, Globe2, Menu, Plus, Search } from 'lucide-react';
import type { Language } from '../lib/i18n';
export function Topbar({title,currentLang,onLanguageChange,onSearch,onAdd,onMenu,onOpenSettings,userName}: {
  title:string; currentLang: Language; onLanguageChange:(lang:Language)=>void; onSearch:()=>void; onAdd:()=>void; onMenu:()=>void; onOpenSettings:()=>void; userName:string;
}) {
  const vi = currentLang === 'vi';
  return <header className="ft-topbar">
    <div className="ft-breadcrumb"><button className="ft-icon-btn ft-menu-toggle" onClick={onMenu} aria-label={vi ? 'Mở menu' : 'Open navigation'}><Menu size={21}/></button><span>{vi ? 'Không gian cá nhân' : 'Personal workspace'}</span><ChevronRight size={13}/><b>{title}</b></div>
    <div className="ft-topbar-actions">
      <button className="ft-search-trigger" onClick={onSearch}><Search size={16}/><span>{vi ? 'Tìm kiếm...' : 'Search anything...'}</span><kbd>Ctrl K</kbd></button>
      <button className="ft-language" onClick={() => onLanguageChange(vi ? 'en' : 'vi')} aria-label={vi ? 'Switch to English' : 'Đổi sang tiếng Việt'}><Globe2 size={16}/>{vi ? 'VI' : 'EN'}</button>
      <button className="ft-icon-btn ft-top-add" onClick={onAdd} aria-label={vi ? 'Thêm giao dịch' : 'Add transaction'}><Plus size={20}/></button>
      <button className="ft-avatar ft-profile-button" onClick={onOpenSettings} aria-label={vi ? 'Mở hồ sơ' : 'Open profile'}>{userName.slice(0,1).toUpperCase()}</button>
    </div>
  </header>;
}
