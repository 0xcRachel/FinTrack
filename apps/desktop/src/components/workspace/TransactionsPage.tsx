import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ChevronLeft, ChevronRight, Download, Loader2, Pencil, Plus, ReceiptText, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { API_BASE_URL, apiDelete, apiGet, getToken } from '../../lib/api';
import { categoryLabel, localeFor, money } from '../../lib/format';
import type { Language } from '../../lib/i18n';
import type { TransactionDto, TransactionPage } from '../../types/api';
import { useToast } from '../ui/ToastProvider';
import { useConfirm } from '../ui/ConfirmProvider';
import { TransactionDialog } from './TransactionDialog';

export function TransactionsPage({currentLang, onAdd, initialSearch = ''}:{currentLang:Language;onAdd:()=>void;initialSearch?:string}) {
  const vi = currentLang === 'vi';
  const client = useQueryClient();
  const notify = useToast();
  const confirm = useConfirm();
  const [search,setSearch] = useState(initialSearch);
  const [debounced,setDebounced] = useState(initialSearch);
  const [type,setType] = useState('');
  const [page,setPage] = useState(0);
  const [startDate,setStartDate] = useState('');
  const [endDate,setEndDate] = useState('');
  const [showDates,setShowDates] = useState(false);
  const [exporting,setExporting] = useState(false);
  const [editing,setEditing] = useState<TransactionDto | null>(null);
  const [deletingId,setDeletingId] = useState<number | null>(null);
  useEffect(() => { setSearch(initialSearch); setDebounced(initialSearch); setPage(0); },[initialSearch]);
  useEffect(() => { const id = setTimeout(() => {setDebounced(search);setPage(0);},250); return () => clearTimeout(id); },[search]);
  const filters = new URLSearchParams({sort:'transactionDate,desc',...(debounced ? {search:debounced} : {}),...(type ? {type} : {}),...(startDate ? {startDate} : {}),...(endDate ? {endDate} : {})});
  const validDates = !startDate || !endDate || startDate <= endDate;
  const query = useQuery({queryKey:['transactions',filters.toString(),page],queryFn:({signal})=>apiGet<TransactionPage>(`/transactions?${filters}&page=${page}&size=15`,signal),enabled:validDates});
  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reports/transactions/export?${filters}`,{headers:{Authorization:`Bearer ${getToken()}`}});
      if(!response.ok) throw new Error(vi ? 'Không thể xuất giao dịch. Vui lòng thử lại.' : 'Could not export transactions. Please retry.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');link.href=url;link.download='fintrack-transactions.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      notify.success(vi ? 'Đã chuẩn bị tệp CSV giao dịch.' : 'Your transaction CSV is ready.');
    }catch(err){notify.error(err instanceof Error ? err.message : (vi ? 'Không thể xuất giao dịch.' : 'Export failed.'));}finally{setExporting(false);}
  };
  const remove = async (row: TransactionDto) => {
    const id = row.transactionId ?? row.id;
    if (!id) return;
    const label = row.merchant || row.description || (vi ? 'giao dịch này' : 'this transaction');
    const approved = await confirm({
      title: vi ? 'Xóa giao dịch?' : 'Delete this transaction?',
      description: vi ? `“${label}” sẽ bị xóa và số dư tài khoản sẽ được tính lại. Thao tác này không thể hoàn tác.` : `“${label}” will be removed and your account balances recalculated. This cannot be undone.`,
      confirmLabel: vi ? 'Xóa giao dịch' : 'Delete transaction',
      cancelLabel: vi ? 'Giữ lại' : 'Keep it',
      tone: 'danger',
    });
    if (!approved) return;
    setDeletingId(id);
    try { await apiDelete(`/transactions/${id}`); await client.invalidateQueries(); notify.success(vi ? 'Đã xóa giao dịch.' : 'Transaction deleted.'); }
    catch (err) { notify.error(err instanceof Error ? err.message : (vi ? 'Không thể xóa giao dịch.' : 'Could not delete the transaction.')); }
    finally { setDeletingId(null); }
  };
  return <div className="ft-page">
    <div className="ft-page-heading"><div><div className="ft-eyebrow">{vi ? 'MỖI KHOẢN TIỀN ĐỀU CÓ CÂU CHUYỆN' : 'EVERY TRANSACTION TELLS A STORY'}</div><h1>{vi ? 'Dòng tiền, trong tầm tay.' : 'Every move, in view.'}</h1><p>{vi ? 'Tìm kiếm, theo dõi và hiểu rõ từng giao dịch của bạn.' : 'Find, track, and understand every movement of your money.'}</p></div><div className="ft-heading-actions"><button className="ft-btn ft-btn-secondary" onClick={exportCsv} disabled={exporting || !validDates}><Download size={16}/>{exporting ? (vi ? 'Đang xuất...' : 'Exporting...') : (vi ? 'Xuất CSV' : 'Export CSV')}</button><button className="ft-btn ft-btn-primary" onClick={onAdd}><Plus size={17}/>{vi ? 'Thêm giao dịch' : 'Add transaction'}</button></div></div>
    <section className="ft-card ft-transactions-card">
      <div className="ft-trans-toolbar"><div className="ft-segmented">{[['',vi?'Tất cả':'All transactions'],['INCOME',vi?'Thu nhập':'Income'],['EXPENSE',vi?'Chi tiêu':'Expenses'],['TRANSFER',vi?'Chuyển khoản':'Transfers']].map(([value,label])=><button key={value} aria-pressed={type===value} className={type===value?'active':''} onClick={()=>{setType(value);setPage(0);}}>{label}</button>)}</div><div className="ft-trans-search"><Search size={17}/><input aria-label={vi?'Tìm giao dịch':'Search transactions'} placeholder={vi?'Tìm tên, ghi chú...':'Search transactions...'} value={search} onChange={e=>setSearch(e.target.value)}/><button className="ft-icon-btn" aria-label={vi?'Lọc theo ngày':'Filter by date'} aria-expanded={showDates} onClick={()=>setShowDates(!showDates)}><SlidersHorizontal size={17}/></button></div></div>
      {showDates && <div className="ft-date-filters"><label>{vi?'Từ ngày':'From'}<input type="date" value={startDate} max={endDate || undefined} onChange={e=>{setStartDate(e.target.value);setPage(0);}}/></label><label>{vi?'Đến ngày':'To'}<input type="date" value={endDate} min={startDate || undefined} onChange={e=>{setEndDate(e.target.value);setPage(0);}}/></label><button className="ft-text-button" onClick={()=>{setStartDate('');setEndDate('');setPage(0);}}>{vi?'Xóa bộ lọc ngày':'Clear dates'}</button></div>}
      {!validDates && <div className="ft-error" role="alert">{vi?'Ngày kết thúc phải sau ngày bắt đầu.':'End date must not precede start date.'}</div>}
      {query.isError ? <div className="ft-error" role="alert">{vi?'Không tải được giao dịch.':'Could not load transactions.'}<button onClick={()=>void query.refetch()}>{vi?'Thử lại':'Retry'}</button></div> : <TransactionRows rows={query.data?.content ?? []} currentLang={currentLang} loading={query.isLoading} onAdd={onAdd} filtered={!!(search||type||startDate||endDate)} onEdit={setEditing} onDelete={remove} busyId={deletingId}/>}
      <div className="ft-table-footer"><span>{query.data?.totalElements ?? '—'} {vi?'giao dịch':'transactions'}</span><div><button className="ft-icon-btn ft-outlined" disabled={page===0 || query.isFetching} aria-label={vi?'Trang trước':'Previous page'} onClick={()=>setPage(page-1)}><ChevronLeft size={17}/></button><span>{vi?'Trang':'Page'} {page+1} / {Math.max(query.data?.totalPages ?? 1,1)}</span><button className="ft-icon-btn ft-outlined" disabled={page+1 >= (query.data?.totalPages ?? 0) || query.isFetching} aria-label={vi?'Trang sau':'Next page'} onClick={()=>setPage(page+1)}><ChevronRight size={17}/></button></div></div>
    </section>
    {editing && <TransactionDialog currentLang={currentLang} transaction={editing} onClose={()=>setEditing(null)} onSuccess={()=>{setEditing(null);notify.success(vi?'Đã cập nhật giao dịch.':'Transaction updated.');}} onAccounts={()=>{setEditing(null);onAdd();}}/>}
  </div>;
}
export function TransactionRows({rows,currentLang,loading,compact,onAdd,filtered,onEdit,onDelete,busyId}:{rows:TransactionDto[];currentLang:Language;loading?:boolean;compact?:boolean;onAdd:()=>void;filtered?:boolean;onEdit?:(row:TransactionDto)=>void;onDelete?:(row:TransactionDto)=>void;busyId?:number|null}) {
  const vi = currentLang === 'vi';
  const actions = !!onEdit || !!onDelete;
  if(loading) return <div className="ft-table-loading" aria-live="polite">{[0,1,2,3].map(i=><div key={i}><i/><span/><b/></div>)}<span className="sr-only">{vi?'Đang tải giao dịch':'Loading transactions'}</span></div>;
  if(!rows.length) return <div className="ft-table-empty"><span><ReceiptText size={28} strokeWidth={1.4}/></span><h3>{filtered ? (vi?'Không tìm thấy giao dịch':'No matching transactions') : (vi?'Bắt đầu câu chuyện tài chính của bạn':'Start your money story')}</h3><p>{filtered ? (vi?'Thử một từ khóa hoặc khoảng thời gian khác.':'Try another search or date range.') : (vi?'Ghi lại khoản thu hoặc chi đầu tiên để mọi thứ rõ ràng hơn.':'Add your first income or expense to see it all come together.')}</p>{!filtered && <button className="ft-text-button" onClick={onAdd}><Plus size={15}/>{vi?'Thêm giao dịch đầu tiên':'Add your first transaction'}</button>}</div>;
  return <div className="ft-table-scroll"><table className="ft-trans-table"><thead><tr><th>{vi?'Giao dịch':'Transaction'}</th><th>{vi?'Danh mục':'Category'}</th>{!compact && <th>{vi?'Tài khoản':'Account'}</th>}<th>{vi?'Ngày':'Date'}</th><th className="right">{vi?'Số tiền':'Amount'}</th>{actions && <th className="right"><span className="sr-only">{vi?'Thao tác':'Actions'}</span></th>}</tr></thead><tbody>{rows.map((row,i)=>{
    const type = row.transactionType || row.type;
    const id = row.transactionId ?? row.id ?? i;
    const Icon = type === 'INCOME' ? ArrowDownLeft : type === 'TRANSFER' ? ArrowLeftRight : ArrowUpRight;
    return <tr key={id}><td><div className="ft-merchant"><span className={`ft-merchant-icon ${type?.toLowerCase()}`}><Icon size={17}/></span><div><b>{row.merchant || row.description || (vi?'Giao dịch':'Transaction')}</b><small>{type==='INCOME'?(vi?'Khoản thu':'Income'):type==='TRANSFER'?(vi?'Chuyển khoản':'Transfer'):(vi?'Khoản chi':'Expense')}</small></div></div></td><td><span className="ft-category-badge">{row.categoryName ? categoryLabel(row.categoryName,currentLang) : '—'}</span></td>{!compact && <td>{row.sourceAccountName || row.destinationAccountName || '—'}</td>}<td className="ft-date">{new Date(`${row.transactionDate}T12:00:00`).toLocaleDateString(localeFor(currentLang),{day:'2-digit',month:'short'})}</td><td className={`ft-amount right ${type==='INCOME'?'income':''}`}>{type==='INCOME'?'+':type==='EXPENSE'?'−':''}{money(row.amount,currentLang,row.currencyCode)}</td>{actions && <td><div className="ft-row-actions">{onEdit && <button className="ft-icon-btn" aria-label={vi?'Sửa giao dịch':'Edit transaction'} onClick={()=>onEdit(row)}><Pencil size={15}/></button>}{onDelete && <button className="ft-icon-btn danger" aria-label={vi?'Xóa giao dịch':'Delete transaction'} disabled={busyId===row.transactionId || busyId===row.id} onClick={()=>onDelete(row)}>{busyId===row.transactionId || busyId===row.id ? <Loader2 size={15} className="ft-spin"/> : <Trash2 size={15}/>}</button>}</div></td>}</tr>;
  })}</tbody></table></div>;
}
