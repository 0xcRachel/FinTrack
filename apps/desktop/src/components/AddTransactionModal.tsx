import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, PlusCircle } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { apiGet, apiPost } from '../lib/api';
import type { Translations, Language } from '../lib/i18n';
import type { TransactionCreateRequest, AccountDto, CategoryDto, PageResponse } from '../types/api';
import '../css/AddTransactionModal.css';

gsap.registerPlugin(useGSAP);

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  t: Translations;
  currentLang: Language;
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

const DEFAULT_CATEGORIES: CategoryDto[] = [
  { categoryId: 1, name: 'Salary', categoryType: 'INCOME' },
  { categoryId: 2, name: 'Freelance', categoryType: 'INCOME' },
  { categoryId: 3, name: 'Investment Income', categoryType: 'INCOME' },
  { categoryId: 4, name: 'Other Income', categoryType: 'INCOME' },
  { categoryId: 5, name: 'Food & Dining', categoryType: 'EXPENSE' },
  { categoryId: 6, name: 'Transportation', categoryType: 'EXPENSE' },
  { categoryId: 7, name: 'Shopping', categoryType: 'EXPENSE' },
  { categoryId: 8, name: 'Housing', categoryType: 'EXPENSE' },
  { categoryId: 9, name: 'Utilities', categoryType: 'EXPENSE' },
  { categoryId: 10, name: 'Health', categoryType: 'EXPENSE' },
  { categoryId: 11, name: 'Entertainment', categoryType: 'EXPENSE' },
  { categoryId: 12, name: 'Education', categoryType: 'EXPENSE' },
  { categoryId: 13, name: 'Other Expense', categoryType: 'EXPENSE' },
];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  t,
  currentLang,
}) => {
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number>(5);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [targetAccountId, setTargetAccountId] = useState<number | null>(null);
  const [categories, setCategories] = useState<CategoryDto[]>(DEFAULT_CATEGORIES);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  const resetForm = () => {
    setAmount('');
    setMerchant('');
    setDescription('');
    setErrorMsg('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTypeChange = (newType: 'EXPENSE' | 'INCOME' | 'TRANSFER') => {
    setType(newType);
    resetForm();
    if (newType === 'INCOME') setCategoryId(1);
    else if (newType === 'EXPENSE') setCategoryId(5);
  };

  // Reset form inputs whenever modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Load user accounts and categories whenever modal opens or type changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingAccounts(true);
    setErrorMsg('');

    const fetchAccountsAndCategories = async () => {
      try {
        // Fetch accounts
        const accRes = await apiGet<PageResponse<AccountDto> | AccountDto[]>('/accounts');
        const accList: AccountDto[] = Array.isArray(accRes)
          ? accRes
          : (accRes && Array.isArray(accRes.content) ? accRes.content : []);

        if (isMounted) {
          if (accList.length > 0) {
            setAccounts(accList);
            const activeAcc = accList.find((a) => !a.isArchived) || accList[0];
            const currentSelected = selectedAccountId;
            if (!currentSelected || !accList.some(a => (a.accountId || (a as any).id) === currentSelected)) {
              setSelectedAccountId(activeAcc.accountId || (activeAcc as any).id);
            }
            if (accList.length > 1 && !targetAccountId) {
              setTargetAccountId(accList[1].accountId || (accList[1] as any).id);
            }
          } else {
            // Auto-create a default cash account for this user so transactions succeed immediately
            try {
              const defaultAcc = await apiPost<AccountDto>('/accounts', {
                name: currentLang === 'vi' ? 'Ví tiền mặt' : 'Cash Wallet',
                accountType: 'CASH',
                currencyCode: 'VND',
                openingBalance: '0',
                description: 'Ví mặc định',
              });
              if (isMounted) {
                const newAccId = defaultAcc.accountId || (defaultAcc as any).id;
                setAccounts([defaultAcc]);
                setSelectedAccountId(newAccId);
              }
            } catch (createErr) {
              console.error('Could not auto-create wallet:', createErr);
            }
          }
        }

        // Fetch categories for current type
        try {
          const catRes = await apiGet<PageResponse<CategoryDto>>(`/categories?type=${type}`);
          if (isMounted && catRes && Array.isArray(catRes.content) && catRes.content.length > 0) {
            setCategories(catRes.content);
            const first = catRes.content[0];
            setCategoryId(first.categoryId || (first as any).id);
          }
        } catch {
          // Use default categories if categories endpoint is offline
        }
      } catch (err) {
        console.error('Failed to load accounts/categories', err);
      } finally {
        if (isMounted) setIsLoadingAccounts(false);
      }
    };

    fetchAccountsAndCategories();

    return () => {
      isMounted = false;
    };
  }, [isOpen, type, currentLang]);

  useGSAP(() => {
    if (isOpen) {
      gsap.from(dialogRef.current, {
        scale: 0.94,
        opacity: 0,
        y: 18,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }, { scope: dialogRef, dependencies: [isOpen] });

  if (!isOpen) return null;

  const currentAccount = accounts.find(
    (a) => (a.accountId || (a as any).id) === selectedAccountId
  );

  const currency = currentAccount?.currencyCode || 'VND';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg(t.modalErrorAmount || 'Vui lòng nhập số tiền hợp lệ lớn hơn 0.');
      return;
    }

    if (!selectedAccountId) {
      setErrorMsg(t.modalErrorAccount || 'Vui lòng chọn tài khoản thanh toán.');
      return;
    }

    if (type === 'TRANSFER' && (!targetAccountId || targetAccountId === selectedAccountId)) {
      setErrorMsg(currentLang === 'vi'
        ? 'Tài khoản đích phải khác tài khoản nguồn.'
        : 'Destination account must be different from source account.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload: TransactionCreateRequest = {
        transactionType: type,
        amount: parsedAmount.toFixed(4),
        currencyCode: currency,
        transactionDate: new Date().toISOString().split('T')[0],
        merchant: merchant.trim() || undefined,
        description: description.trim() || undefined,
        categoryId: type === 'TRANSFER' ? undefined : categoryId,
        sourceAccountId: type === 'INCOME' ? undefined : selectedAccountId,
        destinationAccountId: type === 'EXPENSE'
          ? undefined
          : (type === 'TRANSFER' ? targetAccountId! : selectedAccountId),
      };

      await apiPost('/transactions', payload);
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      if (rawMsg.includes('Account not found')) {
        setErrorMsg(currentLang === 'vi'
          ? 'Không tìm thấy tài khoản hợp lệ. Vui lòng tạo tài khoản mới.'
          : 'Account not found or archived. Please select an active account.');
      } else {
        setErrorMsg(rawMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) => {
    const cType = c.categoryType || c.type;
    return cType === type;
  });

  return (
    <div className="fw-modal-backdrop">
      <div ref={dialogRef} className="fw-modal-dialog">
        <div className="fw-modal-header">
          <h3 className="fw-modal-title">{t.modalAddTitle}</h3>
          <button onClick={handleClose} className="fw-modal-close-btn" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && <div className="fw-modal-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="fw-modal-form">
          {/* Type Selector */}
          <div className="fw-modal-type-grid">
            <button
              type="button"
              onClick={() => handleTypeChange('EXPENSE')}
              className={`fw-modal-type-btn ${type === 'EXPENSE' ? 'active' : ''}`}
            >
              {t.modalTypeExpense}
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('INCOME')}
              className={`fw-modal-type-btn ${type === 'INCOME' ? 'active' : ''}`}
            >
              {t.modalTypeIncome}
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('TRANSFER')}
              className={`fw-modal-type-btn ${type === 'TRANSFER' ? 'active' : ''}`}
            >
              {t.modalTypeTransfer}
            </button>
          </div>

          {/* Account Selector */}
          <div className="fw-modal-field">
            <label className="fw-modal-label">
              {type === 'TRANSFER'
                ? t.modalSourceAccount
                : (type === 'INCOME' ? t.modalDestinationAccount : t.modalAccount)}
            </label>
            {isLoadingAccounts ? (
              <div className="fw-modal-loading-pill">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{currentLang === 'vi' ? 'Đang tải tài khoản...' : 'Loading accounts...'}</span>
              </div>
            ) : accounts.length > 0 ? (
              <select
                value={selectedAccountId || ''}
                onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                className="fw-modal-select"
                required
              >
                {accounts.map((acc) => {
                  const id = acc.accountId || (acc as any).id;
                  return (
                    <option key={id} value={id}>
                      {acc.name} ({acc.currencyCode})
                    </option>
                  );
                })}
              </select>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const created = await apiPost<AccountDto>('/accounts', {
                      name: currentLang === 'vi' ? 'Ví tiền mặt' : 'Cash Wallet',
                      accountType: 'CASH',
                      currencyCode: 'VND',
                      openingBalance: '0',
                      description: 'Ví chính',
                    });
                    const id = created.accountId || (created as any).id;
                    setAccounts([created]);
                    setSelectedAccountId(id);
                  } catch (e) {
                    setErrorMsg(String(e));
                  }
                }}
                className="fw-modal-btn-create-acc"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{t.modalCreateDefaultAccount}</span>
              </button>
            )}
          </div>

          {/* Target Account if TRANSFER */}
          {type === 'TRANSFER' && (
            <div className="fw-modal-field">
              <label className="fw-modal-label">{t.modalDestinationAccount}</label>
              <select
                value={targetAccountId || ''}
                onChange={(e) => setTargetAccountId(Number(e.target.value))}
                className="fw-modal-select"
                required
              >
                <option value="">{t.modalSelectAccount}</option>
                {accounts.map((acc) => {
                  const id = acc.accountId || (acc as any).id;
                  return (
                    <option key={id} value={id}>
                      {acc.name} ({acc.currencyCode})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Amount */}
          <div className="fw-modal-field">
            <label className="fw-modal-label">
              {t.modalAmount} ({currency})
            </label>
            <input
              type="number"
              step="any"
              min="0.0001"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="fw-modal-input"
            />
          </div>

          {/* Category */}
          {type !== 'TRANSFER' && (
            <div className="fw-modal-field">
              <label className="fw-modal-label">{t.modalCategory}</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="fw-modal-select"
              >
                {filteredCategories.map((cat) => {
                  const id = cat.categoryId || (cat as any).id;
                  const displayName = currentLang === 'vi'
                    ? (CATEGORY_NAMES_VI[cat.name] || cat.name)
                    : cat.name;
                  return (
                    <option key={id} value={id}>
                      {displayName}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Merchant */}
          <div className="fw-modal-field">
            <label className="fw-modal-label">{t.modalMerchant}</label>
            <input
              type="text"
              placeholder={t.modalMerchantPlaceholder}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="fw-modal-input"
            />
          </div>

          {/* Note */}
          <div className="fw-modal-field">
            <label className="fw-modal-label">{t.modalDescription}</label>
            <input
              type="text"
              placeholder={t.modalDescriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="fw-modal-input"
            />
          </div>

          {/* Actions */}
          <div className="fw-modal-actions">
            <button type="button" onClick={handleClose} className="fw-modal-cancel-btn">
              {t.modalCancel}
            </button>
            <button type="submit" disabled={isSubmitting} className="fw-modal-submit-btn">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSubmitting ? t.modalSubmitting : t.modalSubmit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
