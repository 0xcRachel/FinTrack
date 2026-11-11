import { setToken } from '../lib/api';
import type { Language, Translations } from '../lib/i18n';
import { AuthLayout } from './auth/minimal/AuthLayout';
import { AuthForm } from './auth/minimal/AuthForm';
import { AuthThemeProvider } from './auth/minimal/ThemeContext';
import type { AuthResult, AuthUser } from './auth/authTypes';
import '../css/AuthSoft.css';

interface AuthScreenProps {
  onAuthSuccess: (user: AuthUser) => void;
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  t: Translations;
  notice?: string;
}

export function AuthScreen({ onAuthSuccess, currentLang, onLanguageChange, t, notice }: AuthScreenProps) {
  const authenticated = (result: AuthResult, email: string, fullName?: string) => {
    const token = result.accessToken || result.token;
    if (!token || !result.userId) return;
    setToken(token);
    onAuthSuccess({
      email: result.email || email.trim(),
      fullName: result.fullName || fullName || email.trim().split('@')[0],
      userId: result.userId,
      avatarUrl: result.avatarUrl,
    });
  };

  return <AuthThemeProvider>
    <AuthLayout currentLang={currentLang} onLanguageChange={onLanguageChange}>
      <AuthForm vi={currentLang === 'vi'} t={t} notice={notice} onAuthenticated={authenticated} />
    </AuthLayout>
  </AuthThemeProvider>;
}
