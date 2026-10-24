import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Translations, Language } from '../lib/i18n';
import '../css/SpendingTrendChart.css';

gsap.registerPlugin(useGSAP);

interface SpendingTrendChartProps {
  t?: Translations;
  currentLang?: Language;
  hasData?: boolean;
}

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({
  t,
  currentLang = 'vi',
  hasData = false,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const currentMonthStr = now.toLocaleDateString(currentLang === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'short',
    year: 'numeric',
  });

  useGSAP(() => {
    if (!hasData) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.fw-trend-spline', {
      opacity: 0,
      scaleY: 0,
      transformOrigin: 'bottom center',
      duration: 0.8,
    })
    .from('.fw-trend-point', {
      scale: 0,
      opacity: 0,
      stagger: 0.08,
      duration: 0.4,
    }, '-=0.4');
  }, { scope: chartRef, dependencies: [hasData] });

  return (
    <div ref={chartRef} className="fw-trend-card">
      {/* Header */}
      <div className="fw-trend-header">
        <h2 className="fw-trend-title">{t?.spendingTrend || 'Spending Trend'}</h2>
        <div className="fw-trend-date-pill">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentMonthStr}</span>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="fw-trend-chart-area">
        <div className="fw-trend-yaxis">
          <span>{currentLang === 'vi' ? '1.5tr' : '1500'}</span>
          <span>{currentLang === 'vi' ? '1.0tr' : '1000'}</span>
          <span>{currentLang === 'vi' ? '500k' : '500'}</span>
          <span>0</span>
        </div>

        <div className="fw-trend-canvas">
          <svg
            className="fw-trend-svg"
            viewBox="0 0 320 180"
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="neon-glow-trend" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <linearGradient id="trend-fill-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Baseline path */}
            <line
              x1="30"
              y1="160"
              x2="290"
              y2="160"
              stroke="#202636"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />

            {hasData && (
              <>
                <path
                  d="M 30,155 C 65,150 75,145 90,145 C 120,145 130,130 145,130 C 175,130 180,48 200,48 C 220,48 230,132 245,132 C 265,132 275,140 290,140 L 290,160 L 30,160 Z"
                  fill="url(#trend-fill-gradient)"
                />
                <path
                  className="fw-trend-spline"
                  d="M 30,155 C 65,150 75,145 90,145 C 120,145 130,130 145,130 C 175,130 180,48 200,48 C 220,48 230,132 245,132 C 265,132 275,140 290,140"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  filter="url(#neon-glow-trend)"
                />
              </>
            )}
          </svg>

          {!hasData && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: '0.8rem',
            }}>
              {currentLang === 'vi' ? 'Chưa có đủ dữ liệu giao dịch trong tháng' : 'Not enough transaction data for this month'}
            </div>
          )}
        </div>
      </div>

      {/* X Axis */}
      <div className="fw-trend-xaxis">{currentMonthStr}</div>
    </div>
  );
};
