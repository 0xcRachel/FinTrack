import React, { useRef } from 'react';
import { Sparkles } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Translations } from '../lib/i18n';
import '../css/AiInsightsCard.css';

gsap.registerPlugin(useGSAP);

interface AiInsightsCardProps {
  spentPercentage?: number;
  daysLeft?: number;
  onOptimise?: () => void;
  t?: Translations;
}

export const AiInsightsCard: React.FC<AiInsightsCardProps> = ({
  spentPercentage = 58,
  daysLeft = 15,
  onOptimise,
  t,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Subtle float animation for coin elements
    gsap.to('.fw-ai-coin', {
      y: -3,
      duration: 2,
      stagger: 0.25,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, { scope: cardRef });

  return (
    <div ref={cardRef} className="fw-ai-card">
      {/* Header */}
      <div className="fw-ai-header">
        <div className="fw-ai-badge">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <span className="fw-ai-title">{t?.aiInsights || 'AI Insights'}</span>
      </div>

      {/* Body Copy */}
      <p className="fw-ai-copy">
        {t?.aiSpentSummary ? (
          t.aiSpentSummary(spentPercentage, daysLeft)
        ) : (
          <>
            You've spent <span className="fw-ai-highlight">{spentPercentage}%</span> of your budget with{' '}
            <strong>{daysLeft} days</strong> left in the month.
          </>
        )}
      </p>

      {/* Refined Minimalist Vector Illustration */}
      <div className="fw-ai-illustration">
        <svg
          viewBox="0 0 200 120"
          className="fw-ai-svg"
          fill="none"
          stroke="#798296"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Character */}
          <path d="M 60,110 C 60,85 75,75 90,75 C 105,75 120,85 120,110" />
          <circle cx="85" cy="50" r="13" />
          {/* Binoculars */}
          <rect x="92" y="44" width="16" height="10" rx="3" fill="#14172b" stroke="#94a3b8" />
          <path d="M 108,49 L 122,46" stroke="#94a3b8" strokeWidth="2" />
          <path d="M 108,52 L 122,54" stroke="#94a3b8" strokeWidth="2" />
          {/* Arms */}
          <path d="M 72,75 Q 85,62 95,58" />
          <path d="M 112,78 Q 116,68 104,58" />
          {/* Coins */}
          <ellipse className="fw-ai-coin" cx="140" cy="30" rx="7" ry="5" fill="#facc15" stroke="#ca8a04" opacity="0.85" />
          <ellipse className="fw-ai-coin" cx="158" cy="42" rx="6" ry="4" fill="#facc15" stroke="#ca8a04" opacity="0.85" />
          <ellipse className="fw-ai-coin" cx="132" cy="52" rx="5" ry="3.5" fill="#facc15" stroke="#ca8a04" opacity="0.85" />
          {/* Ascending mini bars */}
          <rect x="150" y="88" width="5" height="18" rx="1.5" fill="#1e2238" stroke="#3b4256" />
          <rect x="159" y="78" width="5" height="28" rx="1.5" fill="#1e2238" stroke="#3b4256" />
          <rect x="168" y="65" width="5" height="41" rx="1.5" fill="#8b5cf6" stroke="#a78bfa" />
          <path d="M 146,108 L 178,108" stroke="#3b4256" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Footer */}
      <div className="fw-ai-footer">
        <p className="fw-ai-status-text">{t?.aiSpendingOnTrack || 'Your spending is on track!'}</p>
        <button onClick={onOptimise} className="fw-ai-cta-btn">
          {t?.optimiseBudget || 'Optimise Budget'}
        </button>
      </div>
    </div>
  );
};
