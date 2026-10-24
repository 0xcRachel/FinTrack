import { useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Asterisk, Check, Eye, EyeOff, Globe2, Loader2 } from 'lucide-react';
import { ApiRequestError, setToken, apiPost } from '../lib/api';
import type { Language, Translations } from '../lib/i18n';
import '../css/AuthScreen.css';

interface AuthScreenProps {
  onAuthSuccess: (user: { email: string; fullName: string; userId: number }) => void;
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  t: Translations;
  notice?: string;
}

interface AuthResponse {
  accessToken?: string;
  token?: string;
  userId: number;
  email: string;
  fullName?: string;
}

export function AuthScreen({ onAuthSuccess, currentLang, onLanguageChange, t, notice }: AuthScreenProps) {
  const vi = currentLang === 'vi';
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    setErrorMsg('');
    if (mode === 'register' && !fullName.trim()) {
      setErrorMsg(vi ? 'Vui lòng nhập họ và tên.' : 'Please enter your full name.');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setErrorMsg(vi ? 'Mật khẩu xác nhận chưa khớp.' : 'Your passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      const body = mode === 'login'
        ? { email: email.trim(), password }
        : { email: email.trim(), password, fullName: fullName.trim() };
      const result = await apiPost<AuthResponse>(`/auth/${mode}`, body);
      const token = result.accessToken || result.token;
      if (!token || !result.userId) {
        throw new Error(vi ? 'Không thể hoàn tất đăng nhập. Vui lòng thử lại.' : 'Unable to complete sign in. Please try again.');
      }
      setToken(token);
      onAuthSuccess({
        email: result.email || email.trim(),
        fullName: result.fullName || fullName.trim() || email.trim().split('@')[0],
        userId: result.userId,
      });
    } catch (error) {
      if (error instanceof ApiRequestError && error.isNetworkError) {
        setErrorMsg(vi ? 'Không thể kết nối. Kiểm tra kết nối và thử lại.' : 'Unable to connect. Check your connection and try again.');
      } else if (error instanceof ApiRequestError && error.status === 401) {
        setErrorMsg(vi ? 'Email hoặc mật khẩu chưa đúng.' : 'The email or password is incorrect.');
      } else if (error instanceof ApiRequestError && error.status === 409) {
        setErrorMsg(vi ? 'Email này đã được đăng ký. Bạn có thể đăng nhập.' : 'This email is already registered. You can sign in instead.');
      } else {
        setErrorMsg(error instanceof Error ? error.message : (vi ? 'Đã có lỗi xảy ra. Vui lòng thử lại.' : 'Something went wrong. Please try again.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setErrorMsg('');
    setConfirmPassword('');
  };

  return (
    <main className="ft-auth">
      <section className="ft-auth-story" aria-label={vi ? 'Chào mừng đến Fintrack' : 'Welcome to Fintrack'}>
        <a href="#fintrack-auth-form" className="ft-auth-brand" aria-label="Fintrack">
          <span className="ft-auth-brand-mark"><Asterisk size={30} strokeWidth={2.8} /></span>
          <span>fintrack<span className="ft-auth-brand-period">.</span></span>
        </a>
        <div className="ft-auth-story-copy">
          <p className="ft-auth-eyebrow"><span /> {vi ? 'TÀI CHÍNH, THEO CÁCH CỦA BẠN' : 'MONEY, ON YOUR TERMS'}</p>
          <h1>{vi ? <>Hiểu tiền mình.<br /><em>Sống theo ý mình.</em></> : <>Find your balance.<br /><em>Live your way.</em></>}</h1>
          <p className="ft-auth-story-description">
            {vi ? 'Một nơi cho dòng tiền, kế hoạch và những điều bạn muốn làm tiếp theo.' : 'One home for your money, your plans, and everything you want to do next.'}
          </p>
        </div>
        <div className="ft-auth-art" aria-hidden="true">
          <div className="ft-auth-orbit ft-auth-orbit-outer" />
          <div className="ft-auth-orbit ft-auth-orbit-middle" />
          <div className="ft-auth-orbit ft-auth-orbit-inner" />
          <div className="ft-auth-art-center"><Asterisk size={88} strokeWidth={1.65} /></div>
          <span className="ft-auth-orbit-dot" />
          <div className="ft-auth-art-chip ft-auth-chip-plan">
            <span className="ft-auth-chip-icon"><ArrowUpRight size={21} /></span>
            <span>{vi ? 'Lên kế hoạch' : 'Make a plan'}<small>{vi ? 'Cho điều bạn mong muốn' : 'For what matters to you'}</small></span>
          </div>
          <div className="ft-auth-art-chip ft-auth-chip-flow">
            <span className="ft-auth-chip-icon"><ArrowDownLeft size={21} /></span>
            <span>{vi ? 'Hiểu dòng tiền' : 'Know your money'}<small>{vi ? 'Rõ ràng từng khoản chi' : 'Clarity in every expense'}</small></span>
          </div>
          <span className="ft-auth-art-spark">+</span>
        </div>
        <div className="ft-auth-story-footer">
          <span>{vi ? 'Từng quyết định nhỏ. Một tương lai lớn.' : 'Small decisions. A bigger future.'}</span>
          <span className="ft-auth-story-index">FINTRACK / PERSONAL FINANCE</span>
        </div>
      </section>
      <section className="ft-auth-form-side">
        <div className="ft-auth-topline">
          <span className="ft-auth-mobile-brand"><Asterisk size={23} /> fintrack.</span>
          <button type="button" className="ft-auth-language" onClick={() => onLanguageChange(vi ? 'en' : 'vi')} aria-label={vi ? 'Switch to English' : 'Chuyển sang tiếng Việt'}>
            <Globe2 size={16} /> {vi ? 'Tiếng Việt' : 'English'} <span>{vi ? 'EN' : 'VI'}</span>
          </button>
        </div>
        <div className="ft-auth-form-wrap">
          <div className="ft-auth-heading">
            <span className="ft-auth-welcome-mark"><Asterisk size={24} /></span>
            <p className="ft-auth-form-eyebrow">{vi ? 'KHÔNG GIAN TÀI CHÍNH CỦA BẠN' : 'YOUR PERSONAL MONEY SPACE'}</p>
            <h2>{mode === 'login' ? (vi ? 'Mừng bạn trở lại.' : 'Welcome back.') : (vi ? 'Khởi đầu rõ ràng hơn.' : 'Your fresh start.')}</h2>
            <p>{mode === 'login' ? (vi ? 'Đăng nhập để tiếp tục hành trình tài chính của bạn.' : 'Sign in and pick up where your plans left off.') : (vi ? 'Tạo tài khoản và bắt đầu làm chủ dòng tiền.' : 'Create an account and give your money a little direction.')}</p>
          </div>
          <div className="ft-auth-tabs" aria-label={vi ? 'Loại đăng nhập' : 'Account access'}>
            <button type="button" aria-pressed={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')} disabled={isLoading}>{t.authLoginBtn}</button>
            <button type="button" aria-pressed={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')} disabled={isLoading}>{t.authRegisterBtn}</button>
          </div>
          <form id="fintrack-auth-form" className="ft-auth-form" onSubmit={handleSubmit} aria-busy={isLoading}>
            {mode === 'register' && (
              <div className="ft-auth-field">
                <label htmlFor="auth-full-name">{t.authFullName}</label>
                <input id="auth-full-name" name="name" type="text" autoComplete="name" required maxLength={100} placeholder={vi ? 'Họ và tên của bạn' : 'Your full name'} value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={isLoading} />
              </div>
            )}
            <div className="ft-auth-field">
              <label htmlFor="auth-email">{t.authEmail}</label>
              <input id="auth-email" name="email" type="email" autoComplete="email" required maxLength={255} placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isLoading} />
            </div>
            <div className="ft-auth-field">
              <label htmlFor="auth-password">{t.authPassword}</label>
              <div className="ft-auth-password-wrap">
                <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 8 : undefined} maxLength={72} placeholder={mode === 'register' ? (vi ? 'Tối thiểu 8 ký tự' : 'At least 8 characters') : (vi ? 'Nhập mật khẩu' : 'Enter your password')} value={password} onChange={(event) => setPassword(event.target.value)} disabled={isLoading} aria-describedby={mode === 'register' ? 'auth-password-hint' : undefined} />
                <button type="button" className="ft-auth-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? (vi ? 'Ẩn mật khẩu' : 'Hide password') : (vi ? 'Hiện mật khẩu' : 'Show password')} aria-pressed={showPassword}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode === 'register' && <small id="auth-password-hint">{vi ? 'Sử dụng từ 8 đến 72 ký tự.' : 'Use between 8 and 72 characters.'}</small>}
            </div>
            {mode === 'register' && (
              <div className="ft-auth-field">
                <label htmlFor="auth-confirm-password">{t.authConfirmPassword}</label>
                <input id="auth-confirm-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={72} placeholder={vi ? 'Nhập lại mật khẩu' : 'Enter your password again'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={isLoading} />
              </div>
            )}
            {notice && !errorMsg && <p className="ft-auth-notice" role="status">{notice}</p>}
            {errorMsg && <p className="ft-auth-error" role="alert">{errorMsg}</p>}
            <button type="submit" disabled={isLoading} className="ft-auth-submit">
              <span>{isLoading ? (vi ? 'Đang xử lý…' : 'Just a moment…') : mode === 'login' ? (vi ? 'Vào không gian của bạn' : 'Enter your space') : (vi ? 'Tạo tài khoản' : 'Create your account')}</span>
              {isLoading ? <Loader2 size={18} className="ft-auth-spinner" /> : <ArrowRight size={18} />}
            </button>
          </form>
          <div className="ft-auth-form-note"><Check size={15} /> {vi ? 'Mọi kế hoạch tốt bắt đầu từ một bước nhỏ.' : 'Every good plan starts with one small step.'}</div>
        </div>
        <footer className="ft-auth-bottomline"><span>© {new Date().getFullYear()} Fintrack</span><span>{vi ? 'Rõ ràng hơn. Chủ động hơn.' : 'More clarity. More possibility.'}</span></footer>
      </section>
    </main>
  );
}
