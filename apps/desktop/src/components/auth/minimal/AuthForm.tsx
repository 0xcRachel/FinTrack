import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, CircleAlert, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { apiPost } from '../../../lib/api';
import type { Translations } from '../../../lib/i18n';
import { authErrorMessage, emailPattern, type AuthResult } from '../authTypes';
import { ScrambleText } from '../../ui/ScrambleText';

type Mode = 'login' | 'register';
type Phase = 'idle' | 'loading' | 'success';
type Errors = { fullName?: string; email?: string; password?: string; confirm?: string };

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_SNAP: [number, number, number, number] = [0.87, 0, 0.13, 1];
const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30, mass: 0.8 };

function scorePassword(value: string) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.max(1, score);
}

function Field({ id, label, type = 'text', value, onChange, error, autoComplete, autoFocus, maxLength, disabled, passwordToggle }: {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  maxLength?: number;
  disabled?: boolean;
  passwordToggle?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  return <div className={`ma-field ${focused ? 'is-focused' : ''} ${value ? 'has-value' : ''} ${error ? 'has-error' : ''}`}>
    <div className="ma-field-body">
      <label htmlFor={id}><ScrambleText text={label} /></label>
      <input
        id={id}
        type={passwordToggle ? (reveal ? 'text' : 'password') : type}
        value={value}
        onChange={event => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=" "
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        maxLength={maxLength}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {passwordToggle && <button type="button" className="ma-field-eye" onClick={() => setReveal(state => !state)} aria-label={reveal ? 'Hide password' : 'Show password'} title={reveal ? 'Hide password' : 'Show password'} tabIndex={disabled ? -1 : 0}>
        {reveal ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
      </button>}
    </div>
    <span className="ma-field-rule" aria-hidden="true" />
    <AnimatePresence initial={false}>
      {error && <motion.p
        id={`${id}-error`}
        className="ma-field-error"
        role="alert"
        initial={{ height: 0, opacity: 0, x: 0 }}
        animate={{ height: 'auto', opacity: 1, x: [0, -3, 3, -2, 2, 0] }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.28, ease: EASE_OUT }}
      ><CircleAlert size={11} strokeWidth={1.5} />{error}</motion.p>}
    </AnimatePresence>
  </div>;
}

function Strength({ value, vi }: { value: string; vi: boolean }) {
  if (!value) return null;
  const score = scorePassword(value);
  const labels = vi ? ['YẾU', 'TRUNG BÌNH', 'TỐT', 'MẠNH'] : ['WEAK', 'FAIR', 'GOOD', 'STRONG'];
  return <div className="ma-strength" aria-live="polite">
    <div className="ma-strength-segments" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={score} aria-label={vi ? 'Độ mạnh mật khẩu' : 'Password strength'}>
      {[0, 1, 2, 3].map(index => <span key={index}>
        <motion.i initial={false} animate={{ width: index < score ? '100%' : '0%', opacity: index < score ? 1 : 0 }} transition={SPRING} />
      </span>)}
    </div>
    <span className="ma-strength-label">{vi ? 'ĐỘ MẠNH' : 'STRENGTH'} · {labels[score - 1]}</span>
  </div>;
}

export function AuthForm({ vi, t, notice, onAuthenticated }: {
  vi: boolean;
  t: Translations;
  notice?: string;
  onAuthenticated: (result: AuthResult, email: string, fullName?: string) => void;
}) {
  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const timer = useRef<number | null>(null);
  const busy = phase !== 'idle';

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const clear = (key: keyof Errors) => setErrors(current => ({ ...current, [key]: undefined }));

  const validate = () => {
    const next: Errors = {};
    if (mode === 'register' && !fullName.trim()) next.fullName = vi ? 'Nhập họ và tên.' : 'Enter your full name.';
    if (!email.trim()) next.email = vi ? 'Nhập địa chỉ email.' : 'Enter your email address.';
    else if (!emailPattern.test(email.trim())) next.email = vi ? 'Email chưa đúng định dạng.' : 'That email does not look right.';
    if (!password) next.password = vi ? 'Nhập mật khẩu.' : 'Enter your password.';
    else if (mode === 'register' && password.length < 8) next.password = vi ? 'Cần ít nhất 8 ký tự.' : 'Use at least 8 characters.';
    if (mode === 'register' && confirm !== password) next.confirm = vi ? 'Mật khẩu xác nhận chưa khớp.' : 'Your passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (!validate()) return;
    setFormError('');
    setPhase('loading');
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login' ? { email: email.trim(), password } : { email: email.trim(), password, fullName: fullName.trim() };
      const result = await apiPost<AuthResult>(endpoint, body);
      if (!(result.accessToken || result.token) || !result.userId) {
        throw new Error(vi ? 'Không thể hoàn tất đăng nhập. Vui lòng thử lại.' : 'Unable to complete sign in. Please try again.');
      }
      setPhase('success');
      timer.current = window.setTimeout(() => onAuthenticated(result, email.trim(), fullName.trim()), 650);
    } catch (error) {
      setFormError(authErrorMessage(error, vi));
      setPhase('idle');
    }
  };

  const demo = () => {
    setEmail('demo@fintrack.local');
    setPassword('Demo@1234');
    setErrors({});
    setFormError('');
  };

  const labels: Record<Phase, string> = {
    idle: mode === 'login' ? (vi ? 'Vào không gian của bạn' : 'Enter your space') : (vi ? 'Tạo tài khoản' : 'Create account'),
    loading: vi ? 'Đang xác thực…' : 'Authenticating…',
    success: vi ? 'Đã xác thực' : 'Verified',
  };

  return <motion.div className="ma-form-card" layout layoutDependency={mode} transition={{ layout: { duration: 0.45, ease: EASE_OUT } }}>
    <div className="ma-form-head">
      <span className="ma-eyebrow">FINTRACK / {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}</span>
      <motion.h2 key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT }}>
        <ScrambleText text={mode === 'login' ? (vi ? 'Mừng bạn trở lại.' : 'Welcome back.') : (vi ? 'Tạo không gian của bạn.' : 'Create your space.')} />
      </motion.h2>
      <p>{mode === 'login' ? (vi ? 'Đăng nhập để tiếp tục hành trình tài chính của bạn.' : 'Sign in and pick up where your plans left off.') : (vi ? 'Một tài khoản riêng cho toàn bộ dữ liệu tài chính của bạn.' : 'One private account for all of your financial data.')}</p>
    </div>

    <div className="ma-tabs" role="tablist" aria-label={vi ? 'Loại truy cập' : 'Access type'}>
      {(['login', 'register'] as Mode[]).map(value => <button
        key={value}
        type="button"
        role="tab"
        aria-selected={mode === value}
        className={mode === value ? 'is-active' : ''}
        onClick={() => { setMode(value); setErrors({}); setFormError(''); setPhase('idle'); }}
      >
        {mode === value && <motion.span className="ma-tab-pill" layoutId="ma-tab-pill" transition={SPRING} />}
        <span className="ma-tab-label"><ScrambleText text={value === 'login' ? (vi ? 'Đăng nhập' : 'Sign in') : (vi ? 'Đăng ký' : 'Register')} /></span>
      </button>)}
    </div>

    {notice && <p className="ma-notice" role="status">{notice}</p>}
    <AnimatePresence initial={false}>
      {formError && <motion.p className="ma-form-alert" role="alert" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE_OUT }}>
        <CircleAlert size={13} strokeWidth={1.5} />{formError}
      </motion.p>}
    </AnimatePresence>

    <form className="ma-form" onSubmit={submit} noValidate>
      {mode === 'register' && <div>
        <Field id="auth-full-name" label={t.authFullName} value={fullName} onChange={value => { setFullName(value); clear('fullName'); }} error={errors.fullName} autoComplete="name" maxLength={100} disabled={busy} />
      </div>}
      <div>
        <Field id="auth-email" label={t.authEmail} type="email" value={email} onChange={value => { setEmail(value); clear('email'); }} error={errors.email} autoComplete="email" maxLength={255} disabled={busy} />
      </div>
      <div>
        <Field id="auth-password" label={t.authPassword} value={password} onChange={value => { setPassword(value); clear('password'); }} error={errors.password} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} maxLength={72} disabled={busy} passwordToggle />
        {mode === 'register' && <Strength value={password} vi={vi} />}
      </div>
      {mode === 'register' && <div>
        <Field id="auth-confirm-password" label={t.authConfirmPassword} value={confirm} onChange={value => { setConfirm(value); clear('confirm'); }} error={errors.confirm} autoComplete="new-password" maxLength={72} disabled={busy} passwordToggle />
      </div>}

      <div className="ma-form-meta">
        <span className="ma-mono">{vi ? 'Bảo mật bằng JWT' : 'JWT secured'}</span>
        {mode === 'login' && <button type="button" className="ma-demo" onClick={demo} disabled={busy}><Sparkles size={12} strokeWidth={1.5} />{vi ? 'Dùng tài khoản demo' : 'Use demo account'}</button>}
      </div>

      <div>
        <motion.button type="submit" className={`ma-submit phase-${phase}`} disabled={busy} whileTap={{ scale: 0.98 }} transition={SPRING}>
          <span className="ma-submit-sheen" aria-hidden="true" />
          <motion.span key={`label-${phase}`} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: EASE_SNAP }}><ScrambleText text={labels[phase]} /></motion.span>
          <motion.span key={`icon-${phase}`} className="ma-submit-icon" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: EASE_SNAP }}>
            {phase === 'loading' ? <Loader2 size={15} className="ma-spin" strokeWidth={1.5} /> : phase === 'success' ? <Check size={15} strokeWidth={1.6} /> : <ArrowRight size={15} strokeWidth={1.5} />}
          </motion.span>
        </motion.button>
      </div>
    </form>

    <p className="ma-form-foot">{vi ? 'Mật khẩu được băm một chiều. Dữ liệu của bạn ở lại máy chủ riêng.' : 'Passwords are one-way hashed. Your data stays on your own server.'}</p>
  </motion.div>;
}
