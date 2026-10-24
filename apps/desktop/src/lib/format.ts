import type { Language } from './i18n';

export const localeFor = (lang: Language) => lang === 'vi' ? 'vi-VN' : 'en-US';
export const money = (value: number | string, lang: Language = 'vi', currency = 'VND') =>
  new Intl.NumberFormat(localeFor(lang), { style: 'currency', currency, maximumFractionDigits: currency === 'VND' ? 0 : 2 }).format(Number(value) || 0);
export const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const monthRange = (offset = 0) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return { startDate: localDate(start), endDate: localDate(new Date(start.getFullYear(), start.getMonth() + 1, 0)), date: start };
};
export const unwrap = <T,>(data?: T[] | { content: T[] }): T[] => Array.isArray(data) ? data : data?.content ?? [];
const categoryNames: Record<string, string> = {
  'Salary': 'Tiền lương', 'Freelance': 'Làm việc tự do', 'Investment Income': 'Đầu tư',
  'Other Income': 'Thu nhập khác', 'Food & Dining': 'Ăn uống', 'Transportation': 'Di chuyển',
  'Shopping': 'Mua sắm', 'Housing': 'Nhà ở', 'Utilities': 'Tiện ích', 'Health': 'Sức khỏe',
  'Entertainment': 'Giải trí', 'Education': 'Học tập', 'Other Expense': 'Chi tiêu khác',
};
export const categoryLabel = (name: string, lang: Language) => lang === 'vi' ? categoryNames[name] ?? name : name;
