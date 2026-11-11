import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Command, Globe2, LockKeyhole, Sparkles } from 'lucide-react';
import type { Language } from '../../../lib/i18n';
import { FinanceBackdrop } from './FinanceBackdrop';
import { ScrambleText } from '../../ui/ScrambleText';
import { ThemeToggle } from './ThemeToggle';
import { useAuthTheme } from './ThemeContext';

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

function RevealLine({ text, delay = 0, muted = false }: { text: string; delay?: number; muted?: boolean }) {
  return <span className={`ma-reveal-line ${muted ? 'is-muted' : ''}`}>{Array.from(text).map((char, index) => <motion.span
    key={`${char}-${index}`}
    className="ma-reveal-char"
    initial={{ y: '110%' }}
    animate={{ y: '0%' }}
    transition={{ duration: 0.8, delay: delay + index * 0.022, ease: EASE_OUT }}
  >{char === ' ' ? '\u00A0' : char}</motion.span>)}</span>;
}

export function AuthLayout({ currentLang, onLanguageChange, children }: {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  children: ReactNode;
}) {
  const vi = currentLang === 'vi';
  const { theme } = useAuthTheme();
  return <div className="ma-shell" data-theme={theme}>
    <section className="ma-left" aria-label={vi ? 'Giới thiệu FinTrack' : 'About FinTrack'}>
      <div className="ma-ambient" aria-hidden="true"><i /><i /><i /></div>
      <FinanceBackdrop vi={vi} />
      <div className="ma-visual-content">
        <motion.header className="ma-brand" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_OUT }}>
          <span className="ma-brand-mark"><Command size={15} strokeWidth={1.6} /></span>
          <span className="ma-brand-name">fintrack<span>.</span></span>
        </motion.header>

        <div className="ma-hero">
          <motion.p className="ma-eyebrow" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}>
            <ScrambleText text={vi ? 'TÀI CHÍNH CÁ NHÂN, TINH GIẢN' : 'PRIVATE FINANCE, REFINED'} />
          </motion.p>
          <h1>
            <RevealLine text={vi ? 'Mọi dòng tiền.' : 'Every movement.'} delay={0.18} />
            <RevealLine text={vi ? 'Một góc nhìn.' : 'One clear view.'} delay={0.32} muted />
          </h1>
          <motion.p className="ma-hero-copy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.55, ease: EASE_OUT }}>
            {vi ? 'Một không gian yên tĩnh cho ngân sách, mục tiêu và những quyết định quan trọng. Đẹp, riêng tư và luôn trong tầm tay.' : 'A quiet place for budgets, goals, and the decisions that matter. Beautiful, private, and always within reach.'}
          </motion.p>
        </div>

        <motion.div className="ma-quote-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7, ease: EASE_OUT }}>
          <div className="ma-quote-top"><Sparkles size={14} strokeWidth={1.5} /><span>{vi ? 'GÓC NHÌN MỖI NGÀY' : 'A DAILY PERSPECTIVE'}</span></div>
          <p>{vi ? '“Rõ ràng không phải là biết mọi thứ. Mà là biết điều gì quan trọng.”' : '“Clarity is not knowing everything. It is knowing what matters.”'}</p>
          <div className="ma-quote-foot"><span><LockKeyhole size={12} strokeWidth={1.5} />{vi ? 'Dữ liệu riêng tư' : 'Private by design'}</span><span>FINTRACK © {new Date().getFullYear()}</span></div>
        </motion.div>

        <footer className="ma-left-footer">
          <span>{vi ? 'Thiết kế cho desktop' : 'Designed for desktop'}</span>
          <span>JWT · LOCAL-FIRST</span>
        </footer>
      </div>
    </section>

    <section className="ma-right">
      <div className="ma-right-top">
        <span className="ma-mobile-brand"><Command size={17} strokeWidth={1.6} />fintrack<span>.</span></span>
        <div className="ma-right-actions">
          <ThemeToggle />
          <button type="button" className="ma-language" onClick={() => onLanguageChange(vi ? 'en' : 'vi')} aria-label={vi ? 'Switch to English' : 'Chuyển sang tiếng Việt'}>
            <Globe2 size={13} strokeWidth={1.5} /><span><ScrambleText text={vi ? 'EN' : 'VI'} /></span>
          </button>
        </div>
      </div>
      <div className="ma-right-content">{children}</div>
      <footer className="ma-right-footer">
        <span>© {new Date().getFullYear()} FinTrack</span>
        <span>{vi ? 'Không gian của riêng bạn' : 'Your private space'}</span>
      </footer>
    </section>
  </div>;
}
