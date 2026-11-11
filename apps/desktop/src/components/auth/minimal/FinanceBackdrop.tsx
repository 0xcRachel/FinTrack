import { useId } from 'react';
import { motion } from 'framer-motion';

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const MONTHS = ['01', '03', '05', '07', '09', '11'];

export function FinanceBackdrop({ vi }: { vi: boolean }) {
  const id = useId().replace(/:/g, '');
  return <div className="ma-finance" aria-hidden="true">
    <svg className="ma-finance-chart" viewBox="0 0 900 360" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`ma-fin-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ma-fin-fill)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <text className="ma-finance-caption" x="900" y="14" textAnchor="end">
        {vi ? 'DÒNG TIỀN · 12 THÁNG' : 'CASH FLOW · 12 MONTHS'}
      </text>
      <g className="ma-finance-guides">
        {[80, 170, 260].map(y => <line key={y} x1="0" y1={y} x2="900" y2={y} />)}
        {[0, 1, 2, 3, 4, 5].map(index => <line key={index} x1={index * 180} y1="330" x2={index * 180} y2="338" />)}
      </g>
      {MONTHS.map((month, index) => <text key={month} className="ma-finance-month" x={index * 180 + 8} y="356">{month}</text>)}
      <motion.path
        className="ma-finance-area"
        d="M0 286 C 90 274, 150 300, 230 254 S 330 196, 412 216 S 522 158, 604 178 S 722 106, 812 120 S 872 98, 900 92 L900 338 L0 338 Z"
        fill={`url(#ma-fin-fill-${id})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.3, delay: 0.9, ease: EASE_OUT }}
      />
      <motion.path
        className="ma-finance-line"
        d="M0 286 C 90 274, 150 300, 230 254 S 330 196, 412 216 S 522 158, 604 178 S 722 106, 812 120 S 872 98, 900 92"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2, delay: 0.4, ease: EASE_OUT }}
      />
      <g className="ma-finance-dots">
        <circle cx="412" cy="216" r="2" />
        <circle cx="812" cy="120" r="2" />
      </g>
    </svg>
  </div>;
}
