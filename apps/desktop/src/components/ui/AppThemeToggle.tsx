import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useAppTheme } from '../../lib/appTheme';

export function AppThemeToggle() {
  const { theme, toggle } = useAppTheme();
  const dark = theme === 'dark';
  return <button
    type="button"
    className="ft-icon-btn ft-theme-toggle"
    onClick={event => {
      const rect = event.currentTarget.getBoundingClientRect();
      toggle({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }}
    aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    aria-pressed={dark}
  >
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={theme}
        initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24, mass: 0.8 }}
      >
        {dark ? <Sun size={17} strokeWidth={1.6} /> : <Moon size={17} strokeWidth={1.6} />}
      </motion.span>
    </AnimatePresence>
  </button>;
}
