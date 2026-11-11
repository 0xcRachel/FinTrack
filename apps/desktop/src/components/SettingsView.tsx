import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Asterisk, Bot, ChevronRight, Globe2, Loader2, LogOut, Save, SlidersHorizontal, Sparkles, UserRound } from 'lucide-react';
import { apiGet, apiPut } from '../lib/api';
import { aiConfigured, loadAiConfig, saveAiConfig, testAiConnection } from '../lib/ai';
import { useToast } from './ui/ToastProvider';
import { useErrorToast } from './ui/useErrorToast';
import type { Language, Translations } from '../lib/i18n';
import type { HealthStatus, DatabaseHealth } from '../types/api';
import '../css/SettingsView.css';
import '../css/ai.css';

interface SettingsViewProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  t: Translations;
  health?: HealthStatus;
  dbHealth?: DatabaseHealth;
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  onProfileUpdated: (profile: { fullName: string; email: string; avatarUrl?: string }) => void;
  onLogout: () => void;
}

interface UserSettings {
  theme: string;
  displayCurrency: string;
  locale: string;
  dateFormat: string;
  dashboardDefaultPeriod: string;
}

function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const size = 160;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas unavailable'));
        return;
      }
      const scale = Math.max(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.86));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Invalid image'));
    };
    image.src = url;
  });
}

export function SettingsView({ currentLang, onLanguageChange, t, userName = '', userEmail = '', avatarUrl, onProfileUpdated, onLogout }: SettingsViewProps) {
  const vi = currentLang === 'vi';
  const queryClient = useQueryClient();
  const notify = useToast();
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: ({ signal }) => apiGet<UserSettings>('/settings', signal),
    retry: 1,
    refetchOnWindowFocus: false,
  });
  useErrorToast(settingsQuery.isError, vi ? 'Chưa thể tải cài đặt. Hãy thử kết nối lại.' : 'Your preferences could not be loaded. Please try again.');
  const [draft, setDraft] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiConfig, setAiConfig] = useState(loadAiConfig);
  const [testingAi, setTestingAi] = useState(false);
  const [profileName, setProfileName] = useState(userName);
  const [profileAvatar, setProfileAvatar] = useState<string | undefined>(avatarUrl);
  const [profileSaving, setProfileSaving] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settingsQuery.data) setDraft(settingsQuery.data);
  }, [settingsQuery.data]);

  useEffect(() => { setProfileName(userName); }, [userName]);
  useEffect(() => { setProfileAvatar(avatarUrl); }, [avatarUrl]);

  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(settingsQuery.data);
  const initials = userName.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'FT';

  const handleAvatarFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify.error(vi ? 'Chọn một tệp ảnh (JPG hoặc PNG).' : 'Choose an image file (JPG or PNG).');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      notify.error(vi ? 'Ảnh tối đa 6MB.' : 'The image must be 6MB or smaller.');
      return;
    }
    try {
      setProfileAvatar(await fileToAvatar(file));
    } catch {
      notify.error(vi ? 'Không đọc được ảnh này.' : 'This image could not be read.');
    }
  };

  const saveProfile = async () => {
    const name = profileName.trim();
    if (!name) {
      notify.error(vi ? 'Vui lòng nhập họ và tên.' : 'Please enter your full name.');
      return;
    }
    if (profileSaving) return;
    setProfileSaving(true);
    try {
      const result = await apiPut<{ fullName: string; email: string; avatarUrl?: string }>('/profile', {
        fullName: name,
        avatarUrl: profileAvatar ?? null,
      });
      setProfileName(result.fullName);
      setProfileAvatar(result.avatarUrl ?? undefined);
      onProfileUpdated(result);
      notify.success(vi ? 'Đã cập nhật hồ sơ của bạn.' : 'Your profile has been updated.');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : (vi ? 'Không thể lưu hồ sơ.' : 'Could not save your profile.'));
    } finally {
      setProfileSaving(false);
    }
  };

  const changePreference = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    if (key === 'locale') onLanguageChange(value.startsWith('vi') ? 'vi' : 'en');
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || saving || !dirty) return;
    setSaving(true);
    try {
      const result = await apiPut<UserSettings>('/settings', draft);
      queryClient.setQueryData(['settings'], result);
      setDraft(result);
      onLanguageChange(result.locale.startsWith('vi') ? 'vi' : 'en');
      window.dispatchEvent(new CustomEvent('fintrack:settings-updated', { detail: result }));
      notify.success(t.settingsSaveSuccess);
    } catch {
      notify.error(vi ? 'Chưa lưu được. Thay đổi vẫn còn ở đây để bạn thử lại.' : 'Could not save. Your changes are here so you can retry.');
    } finally {
      setSaving(false);
    }
  };

  const persistAi = () => {
    const saved = saveAiConfig(aiConfig);
    setAiConfig(saved);
    notify.success(vi ? 'Đã lưu cấu hình trợ lý AI.' : 'AI advisor settings saved.');
  };

  const testAi = async () => {
    if (testingAi) return;
    if (!aiConfigured(aiConfig)) {
      notify.error(vi ? 'Nhập Base URL, model và API key trước khi kiểm tra (Ollama local không cần key).' : 'Enter a base URL, model, and API key before testing (local Ollama needs no key).');
      return;
    }
    setTestingAi(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const reply = await testAiConnection(aiConfig, controller.signal);
      notify.success(vi ? `Kết nối thành công · ${reply.slice(0, 60)}` : `Connected · ${reply.slice(0, 60)}`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : (vi ? 'Không kết nối được tới API AI.' : 'Could not reach the AI API.'));
    } finally {
      clearTimeout(timeout);
      setTestingAi(false);
    }
  };

  const aiPresets = [
    { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
    { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
    { name: 'Ollama (local)', baseUrl: 'http://127.0.0.1:11434/v1', model: 'llama3.1' },
  ];

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
            <div className="ft-settings-avatar">{profileAvatar ? <img src={profileAvatar} alt="" /> : initials}</div>
            <h2>{userName || (vi ? 'Tài khoản của bạn' : 'Your account')}</h2>
            <p>{userEmail}</p>
            <span className="ft-settings-account-label"><span /> {vi ? 'Không gian cá nhân' : 'Personal workspace'}</span>
          </div>
          <nav className="ft-settings-section-nav" aria-label={vi ? 'Các phần cài đặt' : 'Settings sections'}>
            <a href="#settings-profile"><UserRound size={17} /><span>{vi ? 'Hồ sơ của bạn' : 'Your profile'}</span><ChevronRight size={14} /></a>
            <a href="#settings-preferences"><Globe2 size={17} /><span>{vi ? 'Tùy chọn hiển thị' : 'Preferences'}</span><ChevronRight size={14} /></a>
            <a href="#settings-ai"><Bot size={17} /><span>{vi ? 'Trợ lý AI' : 'AI advisor'}</span><ChevronRight size={14} /></a>
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
            <div className="ft-settings-profile-edit">
              <div className="ft-settings-avatar ft-settings-avatar-lg">{profileAvatar ? <img src={profileAvatar} alt="" /> : initials}</div>
              <div className="ft-settings-avatar-actions">
                <button type="button" className="ft-settings-upload" onClick={() => avatarInput.current?.click()}>{vi ? 'Đổi ảnh' : 'Change photo'}</button>
                {profileAvatar && <button type="button" className="ft-settings-avatar-remove" onClick={() => setProfileAvatar(undefined)}>{vi ? 'Xoá ảnh' : 'Remove photo'}</button>}
                <small>{vi ? 'JPG hoặc PNG, tối đa 6MB' : 'JPG or PNG, up to 6MB'}</small>
                <input ref={avatarInput} type="file" accept="image/*" hidden onChange={event => void handleAvatarFile(event)} />
              </div>
            </div>
            <div className="ft-settings-profile-fields">
              <div className="ft-settings-field">
                <label htmlFor="settings-profile-name">{vi ? 'Họ và tên' : 'Full name'}</label>
                <input id="settings-profile-name" className="ft-settings-select" value={profileName} maxLength={100} onChange={event => setProfileName(event.target.value)} disabled={profileSaving} />
              </div>
              <div className="ft-settings-field">
                <span>{vi ? 'Địa chỉ email' : 'Email address'}</span>
                <p>{userEmail || '—'}</p>
              </div>
            </div>
            <div className="ft-settings-profile-actions">
              <button type="button" className="ft-settings-save-button" onClick={() => void saveProfile()} disabled={profileSaving || !profileName.trim() || (profileName.trim() === userName && profileAvatar === avatarUrl)}>
                {profileSaving ? <Loader2 size={16} className="ft-settings-spinner" /> : <Save size={16} />}
                {profileSaving ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu hồ sơ' : 'Save profile')}
              </button>
            </div>
          </section>

          <section id="settings-preferences" className="ft-settings-card">
            <div className="ft-settings-section-heading">
              <span className="ft-settings-section-icon"><Globe2 size={19} /></span>
              <div><h2>{vi ? 'Theo cách bạn muốn' : 'Just how you like it'}</h2><p>{vi ? 'Ngôn ngữ và cách hiển thị phù hợp với bạn.' : 'The language and display preferences that feel right for you.'}</p></div>
            </div>
            {settingsQuery.isPending && <div className="ft-settings-loading" role="status"><Loader2 size={19} className="ft-settings-spinner" /><span>{vi ? 'Đang tải tùy chọn của bạn…' : 'Loading your preferences…'}</span></div>}
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
                  <p className="ft-settings-feedback" role="status" aria-live="polite">
                    {dirty ? <><span className="ft-settings-unsaved-dot" />{vi ? 'Bạn có thay đổi chưa lưu.' : 'You have unsaved changes.'}</> : <>{vi ? 'Tùy chọn được lưu vào tài khoản.' : 'Preferences are saved to your account.'}</>}
                  </p>
                  <button type="submit" className="ft-settings-save-button" disabled={saving || !dirty}>
                    {saving ? <Loader2 size={16} className="ft-settings-spinner" /> : <Save size={16} />}
                    {saving ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu thay đổi' : 'Save changes')}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section id="settings-ai" className="ft-settings-card">
            <div className="ft-settings-section-heading">
              <span className="ft-settings-section-icon"><Bot size={19} /></span>
              <div><h2>{vi ? 'Trợ lý tài chính AI' : 'AI financial advisor'}</h2><p>{vi ? 'Kết nối API chuẩn OpenAI để AI đọc báo cáo và gợi ý cách tiết kiệm.' : 'Connect an OpenAI-compatible API so AI can read your reports and suggest savings.'}</p></div>
            </div>
            <div className="ai-settings-grid">
              <div className="ai-settings-field wide">
                <label htmlFor="settings-ai-url">Base URL</label>
                <input id="settings-ai-url" type="url" inputMode="url" spellCheck={false} placeholder="https://api.openai.com/v1" value={aiConfig.baseUrl} onChange={event => setAiConfig({ ...aiConfig, baseUrl: event.target.value })} />
                <small>{vi ? 'Đường dẫn gốc của API, ví dụ https://api.openai.com/v1. Có thể dùng Groq, OpenRouter hoặc Ollama local.' : 'API root URL, e.g. https://api.openai.com/v1. Works with Groq, OpenRouter, or a local Ollama.'}</small>
              </div>
              <div className="ai-settings-field">
                <label htmlFor="settings-ai-model">Model</label>
                <input id="settings-ai-model" type="text" spellCheck={false} placeholder="gpt-4o-mini" value={aiConfig.model} onChange={event => setAiConfig({ ...aiConfig, model: event.target.value })} />
              </div>
              <div className="ai-settings-field">
                <label htmlFor="settings-ai-key">API key</label>
                <input id="settings-ai-key" type="password" autoComplete="off" spellCheck={false} placeholder={vi ? 'Để trống nếu dùng Ollama local' : 'Leave empty for local Ollama'} value={aiConfig.apiKey} onChange={event => setAiConfig({ ...aiConfig, apiKey: event.target.value })} />
              </div>
            </div>
            <div className="ai-settings-presets">
              {aiPresets.map(preset => <button key={preset.name} type="button" onClick={() => setAiConfig({ ...aiConfig, baseUrl: preset.baseUrl, model: preset.model })}>{preset.name}</button>)}
            </div>
            <label className="ai-settings-toggle">
              <input type="checkbox" checked={aiConfig.autoAnalyze} onChange={event => setAiConfig({ ...aiConfig, autoAnalyze: event.target.checked })} />
              {vi ? 'Tự động phân tích báo cáo khi mở trợ lý AI' : 'Automatically analyze when opening the AI advisor'}
            </label>
            <p className="ai-settings-note">{vi ? 'API key chỉ được lưu trên thiết bị này (localStorage), không gửi tới server FinTrack. Khi phân tích, dữ liệu tài chính trong tháng sẽ được gửi tới nhà cung cấp AI bạn chọn.' : 'The API key is stored only on this device (localStorage) and never sent to the FinTrack server. When analyzing, this month’s financial data is sent to the AI provider you choose.'}</p>
            <div className="ai-settings-actions">
              <button type="button" className="ft-btn ft-btn-secondary" onClick={() => void testAi()} disabled={testingAi}>
                {testingAi ? <Loader2 size={16} className="ft-spin" /> : <Sparkles size={16} />}
                {testingAi ? (vi ? 'Đang kiểm tra…' : 'Testing…') : (vi ? 'Kiểm tra kết nối' : 'Test connection')}
              </button>
              <button type="button" className="ft-btn ft-btn-primary" onClick={persistAi}><Save size={16} />{vi ? 'Lưu cấu hình AI' : 'Save AI settings'}</button>
            </div>
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
