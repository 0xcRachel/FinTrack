import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowDownLeft, ArrowUpRight, Loader2, Palette, Pencil, Plus, Tags } from 'lucide-react';
import { apiGet, apiPatch, apiPost, apiPut } from '../../lib/api';
import { money, unwrap } from '../../lib/format';
import type { Language } from '../../lib/i18n';
import type { PageResponse } from '../../types/api';
import { useToast } from '../ui/ToastProvider';
import { useConfirm } from '../ui/ConfirmProvider';
import { Dialog } from './Dialog';

type CategoryKind = 'EXPENSE' | 'INCOME';
interface Category {
  categoryId: number;
  name: string;
  categoryType: CategoryKind;
  description?: string;
  colorHex?: string;
  iconName?: string;
  isArchived?: boolean;
  transactionCount?: number | null;
  totalSpent?: string | null;
}
interface CategoryForm { name: string; description: string; colorHex: string; iconName: string }

const SWATCHES = ['#5A6B43', '#82976A', '#C2A15E', '#B8775F', '#A4453A', '#3F6B4A', '#6C608C', '#4C6B8A', '#9A7C3F', '#7A6A4F'];

const emptyForm = (): CategoryForm => ({ name: '', description: '', colorHex: SWATCHES[0], iconName: 'tag' });

export function CategoriesPage({ currentLang, currency = 'VND' }: { currentLang: Language; currency?: string }) {
  const vi = currentLang === 'vi';
  const client = useQueryClient();
  const notify = useToast();
  const confirm = useConfirm();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formType, setFormType] = useState<CategoryKind>('EXPENSE');
  const [form, setForm] = useState<CategoryForm>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [archiving, setArchiving] = useState<number | null>(null);

  const expense = useQuery({ queryKey: ['categories', 'EXPENSE', 'manage'], queryFn: ({ signal }) => apiGet<PageResponse<Category>>('/categories?type=EXPENSE&size=200', signal) });
  const income = useQuery({ queryKey: ['categories', 'INCOME', 'manage'], queryFn: ({ signal }) => apiGet<PageResponse<Category>>('/categories?type=INCOME&size=200', signal) });

  const openCreate = (kind: CategoryKind) => {
    setEditing(null); setFormType(kind); setForm(emptyForm()); setError(''); setDialogOpen(true);
  };
  const openEdit = (category: Category) => {
    setEditing(category); setFormType(category.categoryType);
    setForm({ name: category.name, description: category.description ?? '', colorHex: category.colorHex ?? SWATCHES[0], iconName: category.iconName ?? 'tag' });
    setError(''); setDialogOpen(true);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!form.name.trim()) { setError(vi ? 'Đặt tên cho danh mục này.' : 'Give this category a name.'); return; }
    setBusy(true);
    try {
      if (editing) {
        await apiPut(`/categories/${editing.categoryId}`, { name: form.name.trim(), description: form.description.trim(), colorHex: form.colorHex, iconName: form.iconName });
      } else {
        await apiPost('/categories', { name: form.name.trim(), categoryType: formType, description: form.description.trim(), colorHex: form.colorHex, iconName: form.iconName });
      }
      await client.invalidateQueries({ queryKey: ['categories'] });
      setDialogOpen(false);
      notify.success(editing ? (vi ? 'Đã cập nhật danh mục.' : 'Category updated.') : (vi ? 'Đã tạo danh mục mới.' : 'Category created.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : (vi ? 'Không thể lưu danh mục.' : 'Could not save the category.'));
    } finally { setBusy(false); }
  };
  const archive = async (category: Category) => {
    const approved = await confirm({
      title: vi ? 'Lưu trữ danh mục?' : 'Archive this category?',
      description: vi ? `“${category.name}” sẽ biến mất khỏi danh sách chọn, nhưng giao dịch cũ vẫn giữ nguyên danh mục này.` : `“${category.name}” will leave the picker, but existing transactions keep their category.`,
      confirmLabel: vi ? 'Lưu trữ' : 'Archive',
      cancelLabel: vi ? 'Giữ lại' : 'Keep it',
    });
    if (!approved) return;
    setArchiving(category.categoryId);
    try {
      await apiPatch(`/categories/${category.categoryId}/archive`);
      await client.invalidateQueries({ queryKey: ['categories'] });
      notify.success(vi ? 'Đã lưu trữ danh mục.' : 'Category archived.');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : (vi ? 'Không thể lưu trữ danh mục.' : 'Could not archive the category.'));
    } finally { setArchiving(null); }
  };

  const panel = (kind: CategoryKind, query: typeof expense) => {
    const categories = unwrap(query.data).filter(c => !c.isArchived);
    const Icon = kind === 'EXPENSE' ? ArrowUpRight : ArrowDownLeft;
    return <section className={`ft-card ft-category-panel`}>
      <div className={`ft-category-panel-head ${kind === 'EXPENSE' ? 'expense' : 'income'}`}>
        <span><Icon size={17} /></span>
        <h2>{kind === 'EXPENSE' ? (vi ? 'Danh mục chi' : 'Expense categories') : (vi ? 'Danh mục thu' : 'Income categories')}</h2>
        <small>{categories.length}</small>
        <button className="ft-icon-btn" aria-label={vi ? 'Thêm danh mục' : 'Add category'} onClick={() => openCreate(kind)}><Plus size={17} /></button>
      </div>
      <div className="ft-category-panel-body">
        {query.isError && <div className="ft-error" role="alert">{vi ? 'Không tải được danh mục.' : 'Could not load categories.'}<button onClick={() => void query.refetch()}>{vi ? 'Thử lại' : 'Retry'}</button></div>}
        {query.isLoading && <div className="ft-table-loading">{[0, 1, 2].map(i => <div key={i}><i /><span /><b /></div>)}</div>}
        {!query.isLoading && !query.isError && categories.length === 0 && <div className="ft-category-empty">{vi ? 'Chưa có danh mục. Tạo một danh mục để bắt đầu phân loại.' : 'No categories yet. Create one to start organising.'}</div>}
        {categories.map(category => <div className="ft-category-row" key={category.categoryId}>
          <i className="ft-category-swatch" style={{ background: category.colorHex || '#82976A' }} />
          <div><b>{category.name}</b><small>{category.description || (vi ? 'Chưa có mô tả' : 'No description')}</small></div>
          {category.totalSpent != null && Number(category.totalSpent) > 0 && <small>{money(category.totalSpent, currentLang, currency)}</small>}
          <div className="ft-row-actions">
            <button className="ft-icon-btn" aria-label={vi ? 'Sửa danh mục' : 'Edit category'} onClick={() => openEdit(category)}><Pencil size={14} /></button>
            <button className="ft-icon-btn danger" aria-label={vi ? 'Lưu trữ danh mục' : 'Archive category'} disabled={archiving === category.categoryId} onClick={() => archive(category)}>{archiving === category.categoryId ? <Loader2 size={14} className="ft-spin" /> : <Archive size={14} />}</button>
          </div>
        </div>)}
      </div>
    </section>;
  };

  return <div className="ft-page">
    <div className="ft-page-heading">
      <div>
        <div className="ft-eyebrow">{vi ? 'NGÔN NGỮ CỦA NHỮNG CON SỐ' : 'THE LANGUAGE OF YOUR MONEY'}</div>
        <h1>{vi ? 'Danh mục, gọn gàng.' : 'Categories, composed.'}</h1>
        <p>{vi ? 'Tạo cách phân loại riêng để mỗi báo cáo phản ánh đúng cách bạn sống và chi tiêu.' : 'Shape the taxonomy behind every report so each insight reflects how you really live and spend.'}</p>
      </div>
      <div className="ft-heading-actions">
        <button className="ft-btn ft-btn-primary" onClick={() => openCreate('EXPENSE')}><Plus size={17} />{vi ? 'Thêm danh mục' : 'Add category'}</button>
      </div>
    </div>
    <div className="ft-category-layout">
      {panel('EXPENSE', expense)}
      {panel('INCOME', income)}
    </div>
    <div className="ft-notice" style={{ marginTop: 18 }}>
      <Tags size={16} />
      <span>{vi ? 'Mẹo: giữ danh mục đủ cụ thể để hiểu rõ, nhưng đủ ít để báo cáo không bị vụn. Khoảng 8–12 danh mục chi là điểm cân bằng tốt.' : 'A good rule: specific enough to be useful, few enough to stay readable. Around 8–12 expense categories is a healthy balance.'}</span>
    </div>
    {dialogOpen && <Dialog title={editing ? (vi ? 'Chỉnh sửa danh mục' : 'Edit category') : (vi ? 'Tạo danh mục mới' : 'New category')} onClose={() => { if (!busy) setDialogOpen(false); }} closeLabel={vi ? 'Đóng' : 'Close'}>
      <p className="ft-dialog-subtitle">{editing ? (vi ? 'Thay đổi tên, màu sắc hoặc mô tả. Loại danh mục được giữ nguyên.' : 'Refine the name, colour or description. The category type stays the same.') : (vi ? 'Một danh mục rõ ràng giúp báo cáo của bạn dễ đọc hơn.' : 'A clear category keeps every report easier to read.')}</p>
      <form className="ft-form" onSubmit={save}>
        {error && <div className="ft-error" role="alert">{error}</div>}
        <div className="ft-form-grid">
          <label>{vi ? 'Tên danh mục' : 'Category name'}<input autoFocus required maxLength={80} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={vi ? 'Ví dụ: Cà phê' : 'e.g. Coffee'} /></label>
          <label>{vi ? 'Loại' : 'Type'}<select value={formType} disabled={!!editing} onChange={e => setFormType(e.target.value as CategoryKind)}><option value="EXPENSE">{vi ? 'Khoản chi' : 'Expense'}</option><option value="INCOME">{vi ? 'Thu nhập' : 'Income'}</option></select></label>
        </div>
        <label>{vi ? 'Màu nhận diện' : 'Colour'}<div className="ft-color-field"><input type="color" value={form.colorHex} onChange={e => setForm({ ...form, colorHex: e.target.value })} aria-label={vi ? 'Chọn màu' : 'Pick a colour'} /><span>{form.colorHex.toUpperCase()}</span></div></label>
        <div className="ft-color-swatches" role="group" aria-label={vi ? 'Màu gợi ý' : 'Suggested colours'}>{SWATCHES.map(color => <button type="button" key={color} className={form.colorHex.toLowerCase() === color.toLowerCase() ? 'active' : ''} style={{ background: color }} aria-label={color} onClick={() => setForm({ ...form, colorHex: color })} />)}</div>
        <label>{vi ? 'Mô tả (không bắt buộc)' : 'Description (optional)'}<textarea rows={2} maxLength={255} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={vi ? 'Danh mục này dùng cho khoản nào?' : 'What belongs in this category?'} /></label>
        <div className="ft-form-actions"><button type="button" className="ft-btn ft-btn-secondary" disabled={busy} onClick={() => setDialogOpen(false)}>{vi ? 'Hủy' : 'Cancel'}</button><button type="submit" className="ft-btn ft-btn-primary" disabled={busy}>{busy ? <Loader2 size={16} className="ft-spin" /> : <Palette size={16} />}{busy ? (vi ? 'Đang lưu...' : 'Saving...') : (vi ? 'Lưu danh mục' : 'Save category')}</button></div>
      </form>
    </Dialog>}
  </div>;
}
