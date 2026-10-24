import React, { useRef } from 'react';
import { SlidersHorizontal, ReceiptText } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Translations, Language } from '../lib/i18n';
import type { TransactionDto } from '../types/api';
import '../css/RecentTransactionsTable.css';

gsap.registerPlugin(useGSAP);

interface RecentTransactionsTableProps {
  transactions?: TransactionDto[];
  isLoading?: boolean;
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

export const RecentTransactionsTable: React.FC<RecentTransactionsTableProps> = ({
  transactions,
  isLoading,
  t,
  currentLang = 'vi',
}) => {
  const tableCardRef = useRef<HTMLDivElement>(null);

  const rows = (transactions || []).slice(0, 10).map((item) => {
    const rawCat = item.categoryName || 'General';
    const localizedCat = currentLang === 'vi' ? (CATEGORY_NAMES_VI[rawCat] || rawCat) : rawCat;
    const dateFormatted = item.transactionDate
      ? new Date(item.transactionDate).toLocaleDateString(currentLang === 'vi' ? 'vi-VN' : 'en-US', {
          month: 'short',
          day: 'numeric',
        })
      : '—';

    // The backend Spring Boot model returns `transactionType` (e.g. 'EXPENSE', 'INCOME', 'TRANSFER')
    const tType = item.transactionType || item.type;
    const isExpense = tType === 'EXPENSE';
    const isIncome = tType === 'INCOME';
    const isTransfer = tType === 'TRANSFER';

    return {
      id: item.transactionId || item.id || Math.random(),
      date: dateFormatted,
      merchant: item.merchant || item.description || (currentLang === 'vi' ? 'Giao dịch' : 'Transaction'),
      category: localizedCat,
      amount: Math.abs(parseFloat(item.amount) || 0),
      currency: item.currencyCode || 'VND',
      isExpense,
      isIncome,
      isTransfer,
    };
  });

  useGSAP(() => {
    const elRows = tableCardRef.current?.querySelectorAll('.fw-trans-tr');
    if (elRows && elRows.length > 0) {
      gsap.from(elRows, {
        y: 10,
        opacity: 0,
        stagger: 0.04,
        duration: 0.35,
        ease: 'power2.out',
      });
    }
  }, { scope: tableCardRef, dependencies: [transactions] });

  return (
    <div ref={tableCardRef} className="fw-trans-card">
      <div className="fw-trans-header">
        <h2 className="fw-trans-title">{t?.recentTransactions || 'Recent Transactions'}</h2>
        <button className="fw-trans-filter-btn" title={t?.filterTransactions || 'Filter transactions'}>
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="fw-trans-table-wrap">
        <table className="fw-trans-table">
          <thead>
            <tr>
              <th className="fw-trans-th">{t?.thDate || 'Date'}</th>
              <th className="fw-trans-th">{t?.thMerchant || 'Merchant'}</th>
              <th className="fw-trans-th">{t?.thCategory || 'Category'}</th>
              <th className="fw-trans-th right">{t?.thAmount || 'Amount'}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="fw-trans-td" style={{ textAlign: 'center', color: '#717a8e', padding: '24px 0' }}>
                  {t?.loadingTransactions || 'Loading transactions from Spring Boot...'}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="fw-trans-td" style={{ textAlign: 'center', padding: '36px 0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <ReceiptText className="w-7 h-7 text-slate-600" />
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
                      {t?.emptyNoTransactions || 'Chưa có giao dịch nào'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {t?.emptyNoTransactionsSub || 'Nhấn "+ Thêm giao dịch" để bắt đầu ghi chép thu chi của bạn.'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="fw-trans-tr">
                  <td className="fw-trans-td date">{row.date}</td>
                  <td className="fw-trans-td merchant">{row.merchant}</td>
                  <td className="fw-trans-td">
                    <span className="fw-trans-badge">{row.category}</span>
                  </td>
                  <td className={`fw-trans-td amount ${row.isExpense ? 'expense' : (row.isIncome ? 'income' : 'transfer')}`}>
                    {row.isExpense ? '-' : (row.isIncome ? '+' : '')}
                    {row.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {row.currency}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
