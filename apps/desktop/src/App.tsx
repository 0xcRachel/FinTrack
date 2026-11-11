import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Command, Plus, Search, Wallet, Target, ChartNoAxesCombined } from 'lucide-react';
import { Sidebar, navLabels, type NavItemKey } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { AuthScreen } from './components/AuthScreen';
import { SettingsView } from './components/SettingsView';
import { OverviewPage } from './components/workspace/OverviewPage';
import { TransactionsPage } from './components/workspace/TransactionsPage';
import { TransactionDialog } from './components/workspace/TransactionDialog';
import { BudgetPage, GoalsPage, AccountsPage } from './components/workspace/PlanningPages';
import { CategoriesPage } from './components/workspace/CategoriesPage';
import { ReportsPage, InsightsPage } from './components/workspace/AnalyticsPages';
import { AiAdvisorPage } from './components/workspace/AiAdvisorPage';
import { Dialog } from './components/workspace/Dialog';
import { CreateWorkspaceDialog, WorkspaceMembersDialog } from './components/workspace/WorkspaceDialogs';
import { apiGet, getToken, clearToken, AUTH_EXPIRED_EVENT, getActiveWorkspaceId, setActiveWorkspaceId } from './lib/api';
import { workspaceName } from './lib/workspaces';
import { useToast } from './components/ui/ToastProvider';
import { translations, getInitialLanguage, saveLanguage, type Language } from './lib/i18n';
import type { WorkspaceDto } from './types/api';
import './css/premium.css';

interface UserProfile { email: string; fullName: string; userId: number; avatarUrl?: string }
interface Preferences { displayCurrency: string; locale: string }
const navKeys: NavItemKey[] = ['dashboard','transactions','accounts','categories','budgets','goals','reports','insights','ai','settings','help'];
const initialPage = (): NavItemKey => { const key=location.hash.replace('#/',''); return navKeys.includes(key as NavItemKey) ? key as NavItemKey : 'dashboard'; };
export default function App() {
  const [currentLang,setCurrentLang]=useState<Language>(getInitialLanguage);
  const [activeTab,setActiveTab]=useState<NavItemKey>(initialPage);
  const [authenticated,setAuthenticated]=useState(()=>!!getToken());
  const [currentUser,setCurrentUser]=useState<UserProfile|null>(()=>{try{return JSON.parse(localStorage.getItem('fintrack_user')||'null');}catch{return null;}});
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [addOpen,setAddOpen]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const [search,setSearch]=useState('');
  const [transactionSearch,setTransactionSearch]=useState('');
  const [authNotice,setAuthNotice]=useState('');
  const [langPhase,setLangPhase]=useState<'idle'|'out'|'in'>('idle');
  const [activeWorkspaceId,setActiveWorkspaceIdState]=useState<number|null>(getActiveWorkspaceId);
  const [workspaceEpoch,setWorkspaceEpoch]=useState(0);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(()=>{try{return localStorage.getItem('fintrack_sidebar_collapsed')==='1';}catch{return false;}});
  const [isWideViewport,setIsWideViewport]=useState(()=>typeof window.matchMedia==='function'?window.matchMedia('(min-width: 1025px)').matches:true);
  const [createSpaceOpen,setCreateSpaceOpen]=useState(false);
  const [manageWorkspace,setManageWorkspace]=useState<WorkspaceDto|null>(null);
  const langOutTimer=useRef<number|null>(null);
  const langInTimer=useRef<number|null>(null);
  const client=useQueryClient();
  const notify=useToast();
  const vi=currentLang==='vi';
  const t=translations[currentLang];
  const labels=navLabels(currentLang);
  const userName=currentUser?.fullName || (vi?'Bạn':'Friend');
  const prefs=useQuery({queryKey:['settings'],queryFn:({signal})=>apiGet<Preferences>('/settings',signal),enabled:authenticated});
  const workspacesQuery=useQuery({queryKey:['workspaces'],queryFn:({signal})=>apiGet<WorkspaceDto[]>('/workspaces',signal),enabled:authenticated,staleTime:15_000,refetchOnWindowFocus:true,retry:1});
  const currency=prefs.data?.displayCurrency || 'VND';
  const workspaces=workspacesQuery.data ?? [];
  const activeWorkspace=workspaces.find(space=>space.workspaceId===activeWorkspaceId) ?? null;
  const activeWorkspaceName=activeWorkspace?workspaceName(activeWorkspace,vi):(vi?'Không gian cá nhân':'Personal workspace');
  const navCollapsed=sidebarCollapsed&&isWideViewport;
  const navigate=(tab:NavItemKey)=>{setActiveTab(tab);location.hash=`/${tab}`;setSidebarOpen(false);if(tab!=='transactions')setTransactionSearch('');};
  useLayoutEffect(()=>{window.scrollTo(0,0);},[activeTab,workspaceEpoch]);
  useEffect(()=>{
    if(typeof window.matchMedia!=='function') return;
    const query=window.matchMedia('(min-width: 1025px)');
    const update=()=>setIsWideViewport(query.matches);
    update();
    query.addEventListener('change',update);
    return()=>query.removeEventListener('change',update);
  },[]);
  useEffect(()=>{
    if(!authenticated) return;
    const list=workspacesQuery.data;
    if(!list?.length) return;
    if(activeWorkspaceId!==null&&list.some(space=>space.workspaceId===activeWorkspaceId)) return;
    const fallback=list.find(space=>space.isDefault)??list[0];
    setActiveWorkspaceId(fallback.workspaceId);
    if(activeWorkspaceId!==null){
      client.removeQueries({predicate:query=>!['workspaces','settings'].includes(String(query.queryKey[0]))});
      setWorkspaceEpoch(epoch=>epoch+1);
    }
    setActiveWorkspaceIdState(fallback.workspaceId);
  },[authenticated,workspacesQuery.data,activeWorkspaceId,client]);
  useEffect(()=>()=>{
    if(langOutTimer.current) window.clearTimeout(langOutTimer.current);
    if(langInTimer.current) window.clearTimeout(langInTimer.current);
  },[]);
  const languageChange=(lang:Language)=>{
    if(lang===currentLang) return;
    const commit=()=>{setCurrentLang(lang);saveLanguage(lang);};
    const reduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!authenticated||reduced){commit();return;}
    if(langOutTimer.current) window.clearTimeout(langOutTimer.current);
    if(langInTimer.current) window.clearTimeout(langInTimer.current);
    setLangPhase('out');
    langOutTimer.current=window.setTimeout(()=>{
      commit();
      setLangPhase('in');
      langInTimer.current=window.setTimeout(()=>setLangPhase('idle'),400);
    },170);
  };
  const switchWorkspace=(workspaceId:number)=>{
    if(workspaceId===activeWorkspaceId) return;
    setActiveWorkspaceId(workspaceId);
    setActiveWorkspaceIdState(workspaceId);
    setWorkspaceEpoch(epoch=>epoch+1);
    setAddOpen(false);setSearchOpen(false);setTransactionSearch('');setSidebarOpen(false);
    setCreateSpaceOpen(false);setManageWorkspace(null);
    sessionStorage.removeItem('fintrack_ai_thread');
    client.removeQueries({predicate:query=>!['workspaces','settings'].includes(String(query.queryKey[0]))});
  };
  const sidebarToggle=()=>setSidebarCollapsed(current=>{const next=!current;try{localStorage.setItem('fintrack_sidebar_collapsed',next?'1':'0');}catch{/* storage unavailable */}return next;});
  const workspaceCreated=(workspace:WorkspaceDto)=>{
    client.setQueryData<WorkspaceDto[]>(['workspaces'],current=>current?[...current,workspace]:[workspace]);
    void client.invalidateQueries({queryKey:['workspaces']});
    switchWorkspace(workspace.workspaceId);
  };
  const logout=()=>{clearToken();localStorage.removeItem('fintrack_user');sessionStorage.removeItem('fintrack_ai_thread');setActiveWorkspaceId(null);setActiveWorkspaceIdState(null);setWorkspaceEpoch(epoch=>epoch+1);setManageWorkspace(null);setCreateSpaceOpen(false);client.clear();notify.clear();setCurrentUser(null);setAuthenticated(false);setAddOpen(false);setSearchOpen(false);navigate('dashboard');};
  useEffect(()=>{const changed=()=>setActiveTab(initialPage());window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed);},[]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&authenticated){e.preventDefault();setSearchOpen(x=>!x);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[authenticated]);
  useEffect(()=>{const refresh=()=>void client.invalidateQueries({queryKey:['settings']});window.addEventListener('fintrack:settings-updated',refresh);return()=>window.removeEventListener('fintrack:settings-updated',refresh);},[client]);
  useEffect(()=>{
    const expired=()=>{
      clearToken();
      localStorage.removeItem('fintrack_user');
      sessionStorage.removeItem('fintrack_ai_thread');
      setActiveWorkspaceId(null);
      setActiveWorkspaceIdState(null);
      setWorkspaceEpoch(epoch=>epoch+1);
      setManageWorkspace(null);
      setCreateSpaceOpen(false);
      client.clear();
      setCurrentUser(null);
      setAuthenticated(false);
      setAddOpen(false);
      setSearchOpen(false);
      notify.clear();
      setActiveTab('dashboard');
      location.hash='/dashboard';
      setAuthNotice(vi?'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.':'Your session expired. Please sign in again.');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT,expired);
    return()=>window.removeEventListener(AUTH_EXPIRED_EVENT,expired);
  },[client,vi,notify]);
  if(!authenticated) return <AuthScreen notice={authNotice} onAuthSuccess={user=>{setAuthNotice('');client.clear();setActiveWorkspaceId(null);setActiveWorkspaceIdState(null);setWorkspaceEpoch(epoch=>epoch+1);setCurrentUser(user);localStorage.setItem('fintrack_user',JSON.stringify(user));setAuthenticated(true);}} currentLang={currentLang} onLanguageChange={languageChange} t={t}/>;
  return <div className={`ft-app${navCollapsed?' is-nav-collapsed':''}`}>
    <a className="ft-skip" href="#main-content">{vi?'Đến nội dung chính':'Skip to main content'}</a>
    <Sidebar activeTab={activeTab} onSelectTab={navigate} onLogout={logout} currentLang={currentLang} userName={userName} avatarUrl={currentUser?.avatarUrl} open={sidebarOpen} onClose={()=>setSidebarOpen(false)}
      collapsed={navCollapsed} workspaces={workspaces} activeWorkspaceId={activeWorkspaceId}
      onSwitchWorkspace={switchWorkspace} onCreateWorkspace={()=>setCreateSpaceOpen(true)} onManageWorkspace={space=>setManageWorkspace(space)}/>
    <div className="ft-main"><Topbar title={labels[activeTab]} workspaceName={activeWorkspaceName} currentLang={currentLang} onLanguageChange={languageChange} onSearch={()=>{setSearch('');setSearchOpen(true);}} onAdd={()=>setAddOpen(true)} onMenu={()=>setSidebarOpen(true)} onOpenSettings={()=>navigate('settings')} onToggleSidebar={sidebarToggle} sidebarCollapsed={navCollapsed} userName={userName} avatarUrl={currentUser?.avatarUrl}/>
      <main id="main-content" className={`ft-main-content${langPhase==='idle'?'':` is-lang-${langPhase}`}`} key={`${activeTab}-${workspaceEpoch}`}>
        {activeTab==='dashboard'&&<OverviewPage currentLang={currentLang} userName={userName} onAdd={()=>setAddOpen(true)} onNavigate={navigate}/>}
        {activeTab==='transactions'&&<TransactionsPage currentLang={currentLang} onAdd={()=>setAddOpen(true)} initialSearch={transactionSearch}/>}
        {activeTab==='accounts'&&<AccountsPage currentLang={currentLang} currency={currency}/>}
        {activeTab==='categories'&&<CategoriesPage currentLang={currentLang} currency={currency}/>}
        {activeTab==='budgets'&&<BudgetPage currentLang={currentLang} currency={currency}/>}
        {activeTab==='goals'&&<GoalsPage currentLang={currentLang} currency={currency}/>}
        {activeTab==='reports'&&<ReportsPage currentLang={currentLang} currency={currency}/>}
        {activeTab==='insights'&&<InsightsPage currentLang={currentLang} currency={currency} onNavigate={navigate}/>}
        {activeTab==='ai'&&<AiAdvisorPage currentLang={currentLang} currency={currency} onNavigate={navigate}/>}
        {activeTab==='settings'&&<div className="ft-page"><SettingsView currentLang={currentLang} onLanguageChange={languageChange} t={t} userName={userName} userEmail={currentUser?.email || ''} avatarUrl={currentUser?.avatarUrl} onProfileUpdated={profile=>{const next={...(currentUser||{email:profile.email,userId:0}),email:profile.email||currentUser?.email||'',fullName:profile.fullName,avatarUrl:profile.avatarUrl};setCurrentUser(next);localStorage.setItem('fintrack_user',JSON.stringify(next));}} onLogout={logout}/></div>}
        {activeTab==='help'&&<HelpPage currentLang={currentLang} onNavigate={navigate} onAdd={()=>setAddOpen(true)}/>}
      </main>
    </div>
    {addOpen&&<TransactionDialog currentLang={currentLang} onClose={()=>setAddOpen(false)} onAccounts={()=>{setAddOpen(false);navigate('accounts');}} onSuccess={()=>{setAddOpen(false);notify.success(vi?'Đã lưu giao dịch của bạn.':'Your transaction has been saved.');}}/>}
    {createSpaceOpen&&<CreateWorkspaceDialog currentLang={currentLang} onClose={()=>setCreateSpaceOpen(false)} onCreated={workspaceCreated}/>}
    {manageWorkspace&&<WorkspaceMembersDialog workspace={manageWorkspace} currentLang={currentLang} onClose={()=>setManageWorkspace(null)}/>}
    {searchOpen&&<Dialog title={vi?'Bạn muốn tìm gì?':'What are you looking for?'} onClose={()=>setSearchOpen(false)} closeLabel={vi?'Đóng':'Close'}><div className="ft-command-search"><Search size={20}/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder={vi?'Tìm trang hoặc giao dịch...':'Find a page or transaction...'} aria-label={vi?'Tìm kiếm toàn ứng dụng':'Search workspace'}/><kbd>ESC</kbd></div><div className="ft-command-list">{navKeys.filter(key=>labels[key].toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(key=><button key={key} onClick={()=>{navigate(key);setSearchOpen(false);}}><Command size={17}/><span>{labels[key]}</span><ArrowRight size={16}/></button>)}{search.trim()&&<button onClick={()=>{setTransactionSearch(search.trim());navigate('transactions');setSearchOpen(false);}}><Search size={17}/><span>{vi?'Tìm giao dịch:':'Find transactions:'} “{search}”</span><ArrowRight size={16}/></button>}</div><div className="ft-command-footer"><Plus size={15}/><button onClick={()=>{setSearchOpen(false);setAddOpen(true);}}>{vi?'Ghi lại giao dịch mới':'Record a new transaction'}</button><kbd>Ctrl K</kbd></div></Dialog>}
  </div>;
}
function HelpPage({currentLang,onNavigate,onAdd}:{currentLang:Language;onNavigate:(tab:NavItemKey)=>void;onAdd:()=>void}) {
  const vi=currentLang==='vi';
  const steps=[{icon:Wallet,title:vi?'Tạo không gian cho tiền':'Give your money a home',text:vi?'Thêm ví tiền mặt hoặc tài khoản ngân hàng với số dư ban đầu.':'Add a cash wallet or bank account with its opening balance.',action:()=>onNavigate('accounts')},{icon:ChartNoAxesCombined,title:vi?'Hiểu từng khoản thu chi':'Understand every transaction',text:vi?'Ghi lại thu nhập, chi tiêu và chuyển khoản. Phân loại để thấy xu hướng.':'Record income, expenses, and transfers. Categorize them to see patterns.',action:onAdd},{icon:Target,title:vi?'Biến dự định thành mục tiêu':'Turn a dream into a goal',text:vi?'Đặt số tiền cần đạt và đóng góp từng bước vào mục tiêu của bạn.':'Set a target amount and build toward it one contribution at a time.',action:()=>onNavigate('goals')}];
  const faqs=vi?[
    ['Fintrack có tự kết nối với ngân hàng không?','Hiện tại bạn tạo tài khoản và ghi giao dịch thủ công. Số dư được tính từ số dư ban đầu cộng thu nhập, trừ chi tiêu và điều chỉnh theo chuyển khoản.'],
    ['Dữ liệu trên biểu đồ được tính như thế nào?','Biểu đồ lấy giao dịch đã ghi nhận trong khoảng ngày được chọn. Chuyển khoản nội bộ không được tính là thu nhập hoặc chi tiêu.'],
    ['Tôi có thể dùng nhiều loại tiền tệ không?','Mỗi tài khoản có một loại tiền riêng. Fintrack không quy đổi tỷ giá; bảng điều khiển và báo cáo có bộ chọn loại tiền để mọi tổng số chỉ tính các tài khoản cùng loại tiền.'],
    ['Làm sao để xuất giao dịch?','Mở trang Giao dịch, chọn khoảng ngày hoặc loại giao dịch nếu cần, rồi chọn Xuất CSV. Tệp có thể mở bằng phần mềm bảng tính.'],
    ['Góc nhìn tài chính có phải trợ lý AI không?','Các nhận xét được tính từ thu nhập, chi tiêu, ngân sách và mục tiêu của bạn bằng quy tắc rõ ràng. Hiện chưa có trợ lý AI trò chuyện.']
  ]:[['Does Fintrack connect to my bank?','Accounts and transactions are currently entered manually. Balances reflect opening balances, income, expenses, and transfers.'],['How are charts calculated?','Charts use your recorded transactions within the selected date range. Internal transfers are excluded from income and expenses.'],['Can I use multiple currencies?','Each account keeps its own currency. Fintrack does not convert exchange rates; the dashboard and reports include a currency switcher so every total uses only accounts in that currency.'],['How do I export transactions?','Open Transactions, select any dates or transaction type, and choose Export CSV. Open the file in your spreadsheet app.'],['Are Money insights generated by AI?','Insights use clear rules based on your income, expenses, budgets, and goals. An AI chat assistant is not connected.']];
  return <div className="ft-page"><div className="ft-page-heading"><div><div className="ft-eyebrow">{vi?'BẮT ĐẦU THẬT DỄ DÀNG':'A LITTLE GUIDANCE GOES A LONG WAY'}</div><h1>{vi?'Làm chủ Fintrack.':'Make yourself at home.'}</h1><p>{vi?'Mọi điều bạn cần để bắt đầu tự tin hơn với tài chính.':'Everything you need to feel more at home with your finances.'}</p></div></div><div className="ft-help-steps">{steps.map((s,i)=><button className="ft-card" key={s.title} onClick={s.action}><span className="ft-help-number">0{i+1}</span><s.icon size={28} strokeWidth={1.4}/><h2>{s.title}</h2><p>{s.text}</p><span className="ft-text-button">{vi?'Bắt đầu':'Get started'}<ArrowRight size={16}/></span></button>)}</div><section className="ft-card ft-faq"><h2>{vi?'Một vài điều hữu ích':'Good things to know'}</h2>{faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section></div>;
}
