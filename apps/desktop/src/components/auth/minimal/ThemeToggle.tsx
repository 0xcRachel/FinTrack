import { motion } from 'framer-motion';
import { useAuthTheme } from './ThemeContext';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 26, mass: 0.8 };

export function ThemeToggle() {
  const { theme, toggle } = useAuthTheme();
  const light = theme === 'light';
  return <button
    type="button"
    className="ma-theme-toggle"
    onClick={event => {
      const rect = event.currentTarget.getBoundingClientRect();
      toggle({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }}
    aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
    aria-pressed={light}
  >
    <motion.span
      key={theme}
      className="ma-theme-burst"
      initial={{ scale: 0.35, opacity: 0.55 }}
      animate={{ scale: 2.6, opacity: 0 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden="true"
    />
    <motion.svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={false}
      animate={{ rotate: light ? 360 : 0 }}
      transition={SPRING}
    >
      <motion.g initial={false} animate={{ opacity: light ? 1 : 0, scale: light ? 1 : 0.4 }} transition={SPRING} style={{ transformOrigin: '12px 12px' }}>
        <circle cx="12" cy="12" r="3.8" />
        {Array.from({ length: 8 }, (_, index) => {
          const angle = (index * Math.PI) / 4;
          return <line key={index} x1={12 + Math.cos(angle) * 6.4} y1={12 + Math.sin(angle) * 6.4} x2={12 + Math.cos(angle) * 8.6} y2={12 + Math.sin(angle) * 8.6} />;
        })}
      </motion.g>
      <motion.path
        d="M20.6 13.7A8.5 8.5 0 1 1 10.3 3.4a7 7 0 0 0 10.3 10.3z"
        initial={false}
        animate={{ opacity: light ? 0 : 1, scale: light ? 0.4 : 1 }}
        transition={SPRING}
        style={{ transformOrigin: '12px 12px' }}
      />
    </motion.svg>
  </button>;
}
