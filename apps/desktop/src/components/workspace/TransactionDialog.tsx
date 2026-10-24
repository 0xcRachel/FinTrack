import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Loader2, Wallet } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../../lib/api';
import { categoryLabel, localDate, unwrap } from '../../lib/format';
import type { Language } from '../../lib/i18n';
import type { AccountDto, CategoryDto, PageResponse, TransactionCreateRequest, TransactionDto, TransactionType } from '../../types/api';
import { Dialog } from './Dialog';

export function TransactionDialog({currentLang,onClose,onSuccess,onAccounts,transaction}:{
  currentLang:Language;
  onClose:()=>void;
  onSuccess:()=>void;
  onAccounts:()=>void;
  transaction?:TransactionDto;
}) {
  const vi = currentLang === 'vi';
  const client = useQueryClient();
  const editingId = transaction ? (transaction.transactionId ?? transaction.id) : undefined;
  const initialType: TransactionType = transaction?.transactionType || transaction?.type || 'EXPENSE';
  const [type,setType] = useState<TransactionType>(initialType);
  const [amount,setAmount] = useState(transaction ? String(transaction.amount) : '');
  const [accountId,setAccountId] = useState(transaction
    ? String((initialType === 'INCOME' ? transaction.destinationAccountId : transaction.sourceAccountId) ?? '')
    : '');
  const [targetId,setTargetId] = useState(transaction?.destinationAccountId ? String(transaction.destinationAccountId) : '');
  const [categoryId,setCategoryId] = useState(transaction?.categoryId ? String(transaction.categoryId) : '');
  const [date,setDate] = useState(transaction?.transactionDate || localDate(new Date()));
  const [merchant,setMerchant] = useState(transaction?.merchant || '');
  const [description,setDescription] = useState(transaction?.description || '');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const accounts = useQuery({queryKey:['accounts'],queryFn:({signal})=>apiGet<PageResponse<AccountDto>>('/accounts?size=100',signal)});
  const categories = useQuery({queryKey:['categories',type],queryFn:({signal})=>apiGet<PageResponse<CategoryDto>>(`/categories?type=${type}&size=100`,signal),enabled:type!=='TRANSFER'});
  const list = unwrap(accounts.data).filter(a=>!a.isArchived);
  const selected = list.find(a=>String(a.accountId)===accountId);
  const categoryList = unwrap(categories.data).filter(c=>!c.isArchived);
  const submit = async(e:React.FormEvent)=>{
    e.preventDefault();setError('');
    if(!selected || !Number.isFinite(Number(amount)) || Number(amount)<=0) {setError(vi?'Chọn tài khoản và nhập số tiền lớn hơn 0.':'Choose an account and enter an amount above zero.');return;}
    if(type!=='TRANSFER' && !categoryId){setError(vi?'Chọn một danh mục cho giao dịch này.':'Choose a category for this transaction.');return;}
    if(type==='TRANSFER' && (!targetId || targetId===accountId)){setError(vi?'Chọn tài khoản nhận khác tài khoản nguồn.':'Choose a different destination account.');return;}
    setBusy(true);
    const payload:TransactionCreateRequest={transactionType:type,amount,currencyCode:selected.currencyCode,transactionDate:date,merchant:merchant.trim(),description:description.trim(),
      ...(type==='INCOME'?{destinationAccountId:Number(accountId)}:{sourceAccountId:Number(accountId)}),
      ...(type==='TRANSFER'?{destinationAccountId:Number(targetId)}:{categoryId:Number(categoryId)})};
    try{
      if(editingId) await apiPut(`/transactions/${editingId}`,payload);
      else await apiPost('/transactions',payload);
      await client.invalidateQueries();
      onSuccess();
    }catch(err){setError(err instanceof Error?err.message:(vi?'Không thể lưu giao dịch.':'Could not save transaction.'));}
    finally{setBusy(false);}
  };
  return <Dialog title={editingId ? (vi?'Chỉnh sửa giao dịch':'Edit transaction') : (vi?'Ghi lại một giao dịch':'Add a transaction')} onClose={()=>{if(!busy)onClose();}} closeLabel={vi?'Đóng':'Close'}>
    <p className="ft-dialog-subtitle">{editingId ? (vi?'Điều chỉnh lại cho khớp với thực tế. Số dư sẽ tự cập nhật.':'Adjust the details to match reality. Balances update automatically.') : (vi?'Một thói quen nhỏ. Một góc nhìn rõ ràng hơn.':'One small habit. A clearer financial picture.')}</p>
    <form className="ft-form" onSubmit={submit}>
      <div className="ft-segmented ft-type-picker">{([{value:'EXPENSE',icon:ArrowUpRight,label:vi?'Khoản chi':'Expense'},{value:'INCOME',icon:ArrowDownLeft,label:vi?'Thu nhập':'Income'},{value:'TRANSFER',icon:ArrowLeftRight,label:vi?'Chuyển khoản':'Transfer'}] as const).map(({value,icon:Icon,label})=><button key={value} type="button" aria-pressed={type===value} className={type===value?'active':''} onClick={()=>{setType(value);setCategoryId('');setError('');}}><Icon size={16}/>{label}</button>)}</div>
      {error && <div className="ft-error" role="alert">{error}</div>}
      {accounts.isError && <div className="ft-error" role="alert">{vi?'Chưa tải được tài khoản.':'Could not load accounts.'}<button type="button" onClick={()=>void accounts.refetch()}>{vi?'Thử lại':'Retry'}</button></div>}
      {!accounts.isLoading && !accounts.isError && list.length===0 ? <div className="ft-table-empty"><Wallet size={30}/><h3>{vi?'Tạo tài khoản đầu tiên':'Create your first account'}</h3><p>{vi?'Bạn cần một ví hoặc tài khoản để ghi lại thu chi.':'Add a wallet or account before recording transactions.'}</p><button type="button" className="ft-btn ft-btn-primary" onClick={onAccounts}>{vi?'Tạo tài khoản':'Create account'}</button></div> : <>
        <label className="ft-amount-input-label" htmlFor="transaction-amount">{vi?'Số tiền':'Amount'}<div className="ft-amount-input"><input id="transaction-amount" type="number" inputMode="decimal" min="0.0001" step="0.0001" required placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}/><span>{selected?.currencyCode || 'VND'}</span></div></label>
        <div className="ft-form-grid"><label>{vi?'Tài khoản':'Account'}<select required value={accountId} onChange={e=>{setAccountId(e.target.value);setTargetId('');}}><option value="">{vi?'Chọn tài khoản':'Select account'}</option>{list.map(a=><option key={a.accountId} value={a.accountId}>{a.name} · {a.currencyCode}</option>)}</select></label><label>{vi?'Ngày giao dịch':'Date'}<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label></div>
        {type==='TRANSFER'?<label>{vi?'Tài khoản nhận':'Destination account'}<select required value={targetId} onChange={e=>setTargetId(e.target.value)}><option value="">{vi?'Chọn tài khoản cùng loại tiền':'Choose an account in the same currency'}</option>{list.filter(a=>String(a.accountId)!==accountId&&a.currencyCode===selected?.currencyCode).map(a=><option key={a.accountId} value={a.accountId}>{a.name}</option>)}</select></label>:<label>{vi?'Danh mục':'Category'}<select required value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">{vi?'Chọn danh mục':'Select category'}</option>{categoryList.map(c=><option key={c.categoryId} value={c.categoryId}>{categoryLabel(c.name,currentLang)}</option>)}</select>{categories.isError&&<small>{vi?'Danh mục chưa tải được. Vui lòng thử lại sau.':'Categories unavailable. Please try again.'}</small>}</label>}
        <label>{vi?'Nơi chi tiêu / người gửi':'Merchant / sender'}<input maxLength={150} placeholder={vi?'Ví dụ: Highlands Coffee':'e.g. Coffee shop'} value={merchant} onChange={e=>setMerchant(e.target.value)}/></label>
        <label>{vi?'Ghi chú (không bắt buộc)':'Note (optional)'}<textarea rows={2} maxLength={500} placeholder={vi?'Thêm một vài chi tiết...':'Add a few details...'} value={description} onChange={e=>setDescription(e.target.value)}/></label>
        <div className="ft-form-actions"><button type="button" className="ft-btn ft-btn-secondary" disabled={busy} onClick={onClose}>{vi?'Hủy':'Cancel'}</button><button type="submit" className="ft-btn ft-btn-primary" disabled={busy||accounts.isLoading||accounts.isError}>{busy&&<Loader2 size={16} className="ft-spin"/>}{busy?(vi?'Đang lưu...':'Saving...'):editingId?(vi?'Lưu thay đổi':'Save changes'):(vi?'Lưu giao dịch':'Save transaction')}</button></div>
      </>}
    </form>
  </Dialog>;
}
