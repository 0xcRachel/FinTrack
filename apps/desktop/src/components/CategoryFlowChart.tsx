import React, { useState, useRef } from 'react';
import { Calendar, Asterisk, PieChart } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Translations, Language } from '../lib/i18n';
import '../css/CategoryFlowChart.css';

gsap.registerPlugin(useGSAP);

export interface CategoryItem {
  name: string;
  amount: number;
  barColor: string;
}

interface CategoryFlowChartProps {
  totalBudget?: number;
  items?: CategoryItem[];
  t?: Translations;
  currentLang?: Language;
}

const CATEGORY_NAMES_VI: Record<string, string> = {
  'Salary': 'Tiền lương',
  'Freelance': 'Thu nhập tự do',
  'Investment Income': 'Thu nhập đầu tư & Lãi',
  'Other Income': 'Thu nhập khác',
  'Food & Dining': 'Ăn uống',
  'Transportation': 'Đi lại & Xăng xe',
  'Shopping': 'Mua sắm',
  'Housing': 'Nhà cửa & Tiền thuê',
  'Utilities': 'Điện nước & Internet',
  'Health': 'Sức khỏe & Y tế',
  'Entertainment': 'Giải trí',
  'Education': 'Giáo dục & Học tập',
  'Other Expense': 'Chi tiêu khác',
};

const DEFAULT_COLORS = ['#818cf8', '#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa'];

export const CategoryFlowChart: React.FC<CategoryFlowChartProps> = ({
  totalBudget = 0,
  items,
  t,
  currentLang = 'vi',
}) => {
  const [activeTab, setActiveTab] = useState<'spending' | 'budget' | 'bills'>('spending');
  const containerRef = useRef<HTMLDivElement>(null);

  const displayItems = (items || []).map((item, idx) => ({
    ...item,
    name: currentLang === 'vi' ? (CATEGORY_NAMES_VI[item.name] || item.name) : item.name,
    barColor: item.barColor || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
  }));

  const now = new Date();
  const currentMonthStr = now.toLocaleDateString(currentLang === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'short',
    year: 'numeric',
  });

  useGSAP(() => {
    if (displayItems.length === 0) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.fw-flow-source', {
      scale: 0.9,
      opacity: 0,
      duration: 0.5,
    })
    .from('.fw-flow-ribbon', {
      opacity: 0,
      scaleX: 0,
      transformOrigin: 'left center',
      stagger: 0.06,
      duration: 0.5,
    }, '-=0.3')
    .from('.fw-flow-target-item', {
      x: 12,
      opacity: 0,
      stagger: 0.05,
      duration: 0.35,
    }, '-=0.3');
  }, { scope: containerRef, dependencies: [displayItems.length] });

  return (
    <div ref={containerRef} className="fw-flow-card">
      {/* Header */}
      <div className="fw-flow-header">
        <h2 className="fw-flow-title">{t?.spendingByCategory || 'Spending By Category'}</h2>

        <div className="fw-flow-controls">
          <div className="fw-flow-segmented">
            <button
              onClick={() => setActiveTab('spending')}
              className={`fw-flow-seg-btn ${activeTab === 'spending' ? 'active' : ''}`}
            >
              {t?.tabSpending || 'Spending'}
            </button>
            <button
              onClick={() => setActiveTab('budget')}
              className={`fw-flow-seg-btn ${activeTab === 'budget' ? 'active' : ''}`}
            >
              {t?.tabBudget || 'Budget'}
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`fw-flow-seg-btn ${activeTab === 'bills' ? 'active' : ''}`}
            >
              {t?.tabBills || 'Bills'}
            </button>
          </div>

          <div className="fw-flow-date-pill">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentMonthStr}</span>
          </div>
        </div>
      </div>

      {/* Body Diagram */}
      {displayItems.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '190px', gap: '8px' }}>
          <PieChart className="w-8 h-8 text-slate-600" />
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
            {t?.emptyNoCategories || 'Chưa có dữ liệu danh mục'}
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
            {t?.emptyNoCategoriesSub || 'Dữ liệu phân loại chi tiêu sẽ hiển thị khi bạn có giao dịch thực tế.'}
          </p>
        </div>
      ) : (
        <div className="fw-flow-body">
          {/* Source Box */}
          <div className="fw-flow-source">
            <div className="fw-flow-budget-box">
              <span className="fw-flow-budget-label">{t?.totalBudget || 'Total Budget'}</span>
              <span className="fw-flow-budget-amount">${totalBudget.toLocaleString()}</span>
            </div>
            <div className="fw-flow-asterisk-box">
              <Asterisk className="w-7 h-7 stroke-[2.75]" />
            </div>
          </div>

          {/* Center SVG Ribbons */}
          <div className="fw-flow-canvas">
            <svg
              className="fw-flow-svg"
              viewBox="0 0 320 200"
              preserveAspectRatio="none"
            >
              {displayItems.map((cat, i) => {
                const step = 180 / Math.max(1, displayItems.length - 1);
                const targetY = 20 + i * step;
                return (
                  <path
                    key={cat.name}
                    className="fw-flow-ribbon"
                    d={`M 0,100 C 130,100 180,${targetY} 320,${targetY}`}
                    fill="none"
                    stroke={cat.barColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeOpacity="0.8"
                  />
                );
              })}
            </svg>
          </div>

          {/* Target Categories */}
          <div className="fw-flow-targets">
            {displayItems.map((cat) => (
              <div key={cat.name} className="fw-flow-target-item">
                <span
                  className="fw-flow-target-bar"
                  style={{ backgroundColor: cat.barColor }}
                />
                <div className="fw-flow-target-text">
                  <span className="fw-flow-target-name">{cat.name}</span>
                  <span className="fw-flow-target-val">${cat.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="fw-flow-footer">
        <p className="fw-flow-footer-title">{t?.savingConsistent || "You're saving consistently!"}</p>
        <p className="fw-flow-footer-sub">
          {t?.savingAdvice || 'Consider increasing your weekly savings for faster progress.'}
        </p>
      </div>
    </div>
  );
};
