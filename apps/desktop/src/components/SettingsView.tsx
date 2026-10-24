import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowUpRight, Asterisk, ChevronRight, Globe2, Loader2, LogOut, RefreshCw, Save, SlidersHorizontal, UserRound } from 'lucide-react';
import { apiGet, apiPut } from '../lib/api';
import { useToast } from './ui/ToastProvider';
import type { Language, Translations } from '../lib/i18n';
import type { HealthStatus, DatabaseHealth } from '../types/api';
import '../css/SettingsView.css';

interface SettingsViewProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  t: Translations;
  health?: HealthStatus;
  dbHealth?: DatabaseHealth;
  userName?: string;
  userEmail?: string;
  onLogout: () => void;
}

interface UserSettings {
  theme: string;
  displayCurrency: string;
  locale: string;
  dateFormat: string;
  dashboardDefaultPeriod: string;
}

export function SettingsView({ currentLang, onLanguageChange, t, userName = '', userEmail = '', onLogout }: SettingsViewProps) {
  const vi = currentLang === 'vi';
  const queryClient = useQueryClient();
  const notify = useToast();
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: ({ signal }) => apiGet<UserSettings>('/settings', signal),
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const [draft, setDraft] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) setDraft(settingsQuery.data);
  }, [settingsQuery.data]);

  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(settingsQuery.data);
  const initials = userName.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'FT';

  const changePreference = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setSaveError(false);
    if (key === 'locale') onLanguageChange(value.startsWith('vi') ? 'vi' : 'en');
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || saving || !dirty) return;
    setSaving(true);
    setSaveError(false);
    try {
      const result = await apiPut<UserSettings>('/settings', draft);
      queryClient.setQueryData(['settings'], result);
      setDraft(result);
      onLanguageChange(result.locale.startsWith('vi') ? 'vi' : 'en');
      window.dispatchEvent(new CustomEvent('fintrack:settings-updated', { detail: result }));
      notify.success(t.settingsSaveSuccess);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ft-settings">
      <header className="ft-settings-heading">
        <div>
          <p className="ft-settings-eyebrow">{vi ? 'KHÔNG GIAN CỦA BẠN' : 'MAKE IT YOURS'}</p>
          <h1>{vi ? 'Một chút riêng bạn.' : 'A little more you.'}</h1>
          <p>{vi ? 'Điều chỉnh những chi tiết nhỏ để mỗi ngày đều thuận tiện hơn.' : 'Set the little details that make every day feel a little easier.'}</p>
        </div>
        <span className="ft-settings-heading-icon"><SlidersHorizontal size={25} /></span>
      </header>

      <div className="ft-settings-layout">
        <aside className="ft-settings-aside">
          <div className="ft-settings-profile-summary">
            <div className="ft-settings-avatar">{initials}</div>
            <h2>{userName || (vi ? 'Tài khoản của bạn' : 'Your account')}</h2>
            <p>{userEmail}</p>
            <span className="ft-settings-account-label"><span /> {vi ? 'Không gian cá nhân' : 'Personal workspace'}</span>
          </div>
          <nav className="ft-settings-section-nav" aria-label={vi ? 'Các phần cài đặt' : 'Settings sections'}>
            <a href="#settings-profile"><UserRound size={17} /><span>{vi ? 'Hồ sơ của bạn' : 'Your profile'}</span><ChevronRight size={14} /></a>
            <a href="#settings-preferences"><Globe2 size={17} /><span>{vi ? 'Tùy chọn hiển thị' : 'Preferences'}</span><ChevronRight size={14} /></a>
            <a href="#settings-session"><LogOut size={17} /><span>{vi ? 'Phiên đăng nhập' : 'Your session'}</span><ChevronRight size={14} /></a>
          </nav>
          <div className="ft-settings-note">
            <Asterisk size={30} strokeWidth={1.7} />
            <h3>{vi ? 'Nhịp sống của bạn. Cách quản lý của bạn.' : 'Your pace. Your way.'}</h3>
            <p>{vi ? 'Một không gian rõ ràng giúp bạn tập trung vào những điều thực sự quan trọng.' : 'A little clarity gives you more room for the things that matter.'}</p>
            <ArrowUpRight size={22} className="ft-settings-note-arrow" />
          </div>
        </aside>

        <div className="ft-settings-main">
          <section id="settings-profile" className="ft-settings-card">
            <div className="ft-settings-section-heading">
              <span className="ft-settings-section-icon"><UserRound size={19} /></span>
              <div><h2>{vi ? 'Hồ sơ của bạn' : 'Your profile'}</h2><p>{vi ? 'Thông tin của tài khoản đang đăng nhập.' : 'The details of your signed-in account.'}</p></div>
            </div>
            <div className="ft-settings-profile-fields">
              <div><span>{vi ? 'Họ và tên' : 'Full name'}</span><p>{userName || '—'}</p></div>
              <div><span>{vi ? 'Địa chỉ email' : 'Email address'}</span><p>{userEmail || '—'}</p></div>
            </div>
          </section>

          <section id="settings-preferences" className="ft-settings-card">
            <div className="ft-settings-section-heading">
              <span className="ft-settings-section-icon"><Globe2 size={19} /></span>
              <div><h2>{vi ? 'Theo cách bạn muốn' : 'Just how you like it'}</h2><p>{vi ? 'Ngôn ngữ và cách hiển thị phù hợp với bạn.' : 'The language and display preferences that feel right for you.'}</p></div>
            </div>
            {settingsQuery.isPending && <div className="ft-settings-loading" role="status"><Loader2 size={19} className="ft-settings-spinner" /><span>{vi ? 'Đang tải tùy chọn của bạn…' : 'Loading your preferences…'}</span></div>}
            {settingsQuery.isError && (
              <div className="ft-settings-load-error" role="alert">
                <AlertCircle size={20} />
                <p>{vi ? 'Chưa thể tải cài đặt. Hãy thử kết nối lại.' : 'Your preferences could not be loaded. Please try again.'}</p>
                <button type="button" onClick={() => settingsQuery.refetch()} disabled={settingsQuery.isFetching}><RefreshCw size={15} /> {vi ? 'Thử lại' : 'Retry'}</button>
              </div>
            )}
            {draft && !settingsQuery.isError && (
              <form onSubmit={saveSettings} aria-busy={saving}>
                <fieldset className="ft-settings-preference-fields" disabled={saving}>
                  <div className="ft-settings-language-row">
                    <div className="ft-settings-field-copy"><label htmlFor="settings-language">{vi ? 'Ngôn ngữ' : 'Language'}</label><p>{vi ? 'Chọn ngôn ngữ cho không gian của bạn.' : 'Choose the language for your workspace.'}</p></div>
                    <select id="settings-language" value={draft.locale} onChange={(event) => changePreference('locale', event.target.value)} className="ft-settings-select">
                      <option value="vi-VN">Tiếng Việt</option><option value="en-US">English</option>
                    </select>
                  </div>
                  <div className="ft-settings-form-grid">
                    <div className="ft-settings-field">
                      <label htmlFor="settings-currency">{vi ? 'Tiền tệ ưu tiên' : 'Preferred currency'}</label>
                      <select id="settings-currency" value={draft.displayCurrency} onChange={(event) => changePreference('displayCurrency', event.target.value)} className="ft-settings-select">
                        <option value="VND">VND — Đồng Việt Nam</option><option value="USD">USD — US Dollar</option>
                        {!['VND', 'USD'].includes(draft.displayCurrency) && <option value={draft.displayCurrency}>{draft.displayCurrency}</option>}
                      </select>
                      <small>{vi ? 'Không quy đổi số tiền trong tài khoản.' : 'Account balances are not converted.'}</small>
                    </div>
                    <div className="ft-settings-field">
                      <label htmlFor="settings-date">{vi ? 'Định dạng ngày' : 'Date format'}</label>
                      <select id="settings-date" value={draft.dateFormat} onChange={(event) => changePreference('dateFormat', event.target.value)} className="ft-settings-select">
                        <option value="dd/MM/yyyy">{vi ? 'Ngày / Tháng / Năm' : 'Day / Month / Year'}</option>
                        <option value="MM/dd/yyyy">{vi ? 'Tháng / Ngày / Năm' : 'Month / Day / Year'}</option>
                        <option value="yyyy-MM-dd">{vi ? 'Năm – Tháng – Ngày' : 'Year – Month – Day'}</option>
                        {!['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'].includes(draft.dateFormat) && <option value={draft.dateFormat}>{draft.dateFormat}</option>}
                      </select>
                    </div>
                    <div className="ft-settings-field ft-settings-field-wide">
                      <label htmlFor="settings-period">{vi ? 'Khoảng thời gian mặc định' : 'Default overview period'}</label>
                      <select id="settings-period" value={draft.dashboardDefaultPeriod} onChange={(event) => changePreference('dashboardDefaultPeriod', event.target.value)} className="ft-settings-select">
                        <option value="THIS_MONTH">{vi ? 'Tháng này' : 'This month'}</option>
                        <option value="LAST_MONTH">{vi ? 'Tháng trước' : 'Last month'}</option>
                        <option value="THIS_YEAR">{vi ? 'Năm nay' : 'This year'}</option>
                        {!['THIS_MONTH', 'LAST_MONTH', 'THIS_YEAR'].includes(draft.dashboardDefaultPeriod) && <option value={draft.dashboardDefaultPeriod}>{draft.dashboardDefaultPeriod}</option>}
                      </select>
                    </div>
                  </div>
                </fieldset>
                <div className="ft-settings-save-row">
                  <p className={saveError ? 'ft-settings-feedback error' : 'ft-settings-feedback'} role={saveError ? 'alert' : 'status'} aria-live="polite">
                    {saveError ? <><AlertCircle size={15} />{vi ? 'Chưa lưu được. Thay đổi vẫn còn ở đây để bạn thử lại.' : 'Could not save. Your changes are here so you can retry.'}</> : dirty ? <><span className="ft-settings-unsaved-dot" />{vi ? 'Bạn có thay đổi chưa lưu.' : 'You have unsaved changes.'}</> : <>{vi ? 'Tùy chọn được lưu vào tài khoản.' : 'Preferences are saved to your account.'}</>}
                  </p>
                  <button type="submit" className="ft-settings-save-button" disabled={saving || !dirty}>
                    {saving ? <Loader2 size={16} className="ft-settings-spinner" /> : <Save size={16} />}
                    {saving ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu thay đổi' : 'Save changes')}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section id="settings-session" className="ft-settings-card ft-settings-session">
            <div><h2>{vi ? 'Hẹn gặp lại, bất cứ lúc nào.' : 'See you whenever you’re ready.'}</h2><p>{vi ? 'Đăng xuất khỏi phiên hiện tại trên thiết bị này.' : 'Sign out of your current session on this device.'}</p></div>
            <button type="button" className="ft-settings-logout" onClick={onLogout}><LogOut size={16} />{t.navLogout}</button>
          </section>
        </div>
      </div>
    </div>
  );
}
