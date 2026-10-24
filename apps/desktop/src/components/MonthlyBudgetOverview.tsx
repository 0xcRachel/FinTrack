import React, { useRef } from 'react';
import { Calendar, Plus, Target } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Translations, Language } from '../lib/i18n';
import '../css/MonthlyBudgetOverview.css';

gsap.registerPlugin(useGSAP);

interface MonthlyBudgetOverviewProps {
  totalBudget?: number;
  spent?: number;
  remaining?: number;
  onAddTransaction: () => void;
  onOpenDebts?: () => void;
  t?: Translations;
  currentLang?: Language;
}

export const MonthlyBudgetOverview: React.FC<MonthlyBudgetOverviewProps> = ({
  totalBudget = 0,
  spent = 0,
  remaining = 0,
  onAddTransaction,
  onOpenDebts,
  t,
  currentLang = 'vi',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const percent = totalBudget > 0 ? Math.min(100, Math.round((spent / totalBudget) * 100)) : 0;

  const now = new Date();
  const currentMonthStr = now.toLocaleDateString(currentLang === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'short',
    year: 'numeric',
  });

  useGSAP(() => {
    gsap.to('.fw-budget-progress-bar', {
      width: `${percent}%`,
      duration: 1.0,
      ease: 'power3.out',
    });

    gsap.from('.fw-budget-metric-col', {
      y: 10,
      opacity: 0,
      stagger: 0.06,
      duration: 0.4,
      ease: 'power2.out',
    });
  }, { scope: cardRef, dependencies: [percent] });

  const formatMoney = (val: number) => {
    return val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <div ref={cardRef} className="fw-budget-card">
      {/* Header */}
      <div className="fw-budget-header">
        <h2 className="fw-budget-title">{t?.monthlyBudgetOverview || 'Monthly Budget Overview'}</h2>
        <div className="fw-budget-date-pill">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentMonthStr}</span>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="fw-budget-progress-track">
        <div className="fw-budget-progress-bar" />
      </div>

      {/* 3 Metrics */}
      <div className="fw-budget-metrics-row">
        <div className="fw-budget-metric-col">
          <span className="fw-budget-metric-label">{t?.totalBudget || 'Total Budget'}</span>
          <span className="fw-budget-metric-val total">${formatMoney(totalBudget)}</span>
        </div>

        <div className="fw-budget-metric-col">
          <span className="fw-budget-metric-label">{t?.spent || 'Spent'}</span>
          <span className="fw-budget-metric-val spent">${formatMoney(spent)}</span>
        </div>

        <div className="fw-budget-metric-col">
          <span className="fw-budget-metric-label">{t?.remaining || 'Remaining'}</span>
          <span className="fw-budget-metric-val remaining">${formatMoney(remaining)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="fw-budget-actions-row">
        <button onClick={onAddTransaction} className="fw-budget-btn">
          <Plus className="w-4 h-4 text-purple-400" />
          <span>{t?.addTransaction || 'Add Transaction'}</span>
        </button>

        <button onClick={onOpenDebts} className="fw-budget-btn">
          <Target className="w-4 h-4 text-slate-400" />
          <span>{t?.necessaryDebts || 'Necessary Debts'}</span>
        </button>
      </div>
    </div>
  );
};
