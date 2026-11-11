import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUp, Bot, CircleAlert, LoaderCircle, RefreshCw, Settings2, Sparkles, Trash2 } from 'lucide-react';
import { analysisRequest, buildFinancialSnapshot, buildSystemPrompt, type FinancialSnapshot } from '../../lib/aiContext';
import { aiConfigured, chatCompletion, loadAiConfig, type AiChatMessage } from '../../lib/ai';
import { money } from '../../lib/format';
import type { Language } from '../../lib/i18n';
import type { NavItemKey } from '../Sidebar';
import { useToast } from '../ui/ToastProvider';
import '../../css/ai.css';

const THREAD_KEY = 'fintrack_ai_thread';

function loadThread(): AiChatMessage[] {
  try {
    const raw = sessionStorage.getItem(THREAD_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(item => item && (item.role === 'user' || item.role === 'assistant')) : [];
  } catch {
    return [];
  }
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    return <span key={index}>{part}</span>;
  });
}

function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const items = list.items.map((item, index) => <li key={index}>{inline(item)}</li>);
    blocks.push(list.ordered ? <ol key={`l${blocks.length}`}>{items}</ol> : <ul key={`l${blocks.length}`}>{items}</ul>);
    list = null;
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (/^---+$/.test(line)) { flush(); blocks.push(<hr key={`h${blocks.length}`} />); continue; }
    if (/^#{1,6}\s+/.test(line)) {
      flush();
      blocks.push(<h4 key={`h${blocks.length}`}>{inline(line.replace(/^#{1,6}\s+/, ''))}</h4>);
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      const item = line.replace(/^[-*•]\s+/, '');
      if (!list || list.ordered) { flush(); list = { ordered: false, items: [] }; }
      list.items.push(item);
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const item = line.replace(/^\d+[.)]\s+/, '');
      if (!list || !list.ordered) { flush(); list = { ordered: true, items: [] }; }
      list.items.push(item);
      continue;
    }
    flush();
    blocks.push(<p key={`p${blocks.length}`}>{inline(line)}</p>);
  }
  flush();
  return <div className="ai-rich">{blocks}</div>;
}

export function AiAdvisorPage({ currentLang, currency, onNavigate }: {
  currentLang: Language;
  currency: string;
  onNavigate: (tab: NavItemKey) => void;
}) {
  const vi = currentLang === 'vi';
  const notify = useToast();
  const [config] = useState(loadAiConfig);
  const [thread, setThread] = useState<AiChatMessage[]>(loadThread);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const autoStarted = useRef(false);
  const configured = aiConfigured(config);

  useEffect(() => {
    sessionStorage.setItem(THREAD_KEY, JSON.stringify(thread.slice(-12)));
  }, [thread]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const request = useCallback(async (text: string, reset: boolean) => {
    if (!configured) {
      notify.error(vi ? 'Hãy cấu hình AI trong Cài đặt trước.' : 'Configure the AI in Settings first.');
      return;
    }
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setBusy(true);
    try {
      const data = await buildFinancialSnapshot(currency, controller.signal);
      setSnapshot(data);
      const system = buildSystemPrompt(currentLang, data);
      const history = reset ? [] : thread;
      const next: AiChatMessage[] = [...history, { role: 'user', content: text }];
      setThread(next);
      const reply = await chatCompletion(config, [{ role: 'system', content: system }, ...next], controller.signal);
      setThread([...next, { role: 'assistant', content: reply }]);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      notify.error(error instanceof Error ? error.message : (vi ? 'Không thể phân tích lúc này.' : 'Could not analyze right now.'));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setBusy(false);
      }
    }
  }, [config, configured, currency, currentLang, notify, thread, vi]);

  useEffect(() => {
    if (!config.autoAnalyze || !configured || thread.length > 0) return;
    if (autoStarted.current) return;
    autoStarted.current = true;
    void request(analysisRequest(currentLang), true);
    return () => { autoStarted.current = false; };
  }, [config.autoAnalyze, configured, currentLang, request, thread.length]);

  const send = () => {
    const value = input.trim();
    if (!value || busy) return;
    setInput('');
    void request(value, false);
  };

  const clear = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    autoStarted.current = true;
    setBusy(false);
    setThread([]);
    setSnapshot(null);
    sessionStorage.removeItem(THREAD_KEY);
  };

  const host = (() => {
    try { return new URL(config.baseUrl).host; } catch { return config.baseUrl; }
  })();
  const periodLabel = snapshot
    ? `${snapshot.period.startDate} → ${snapshot.period.endDate}`
    : (vi ? 'Tháng này' : 'This month');

  return <div className="ai-page">
    <header className="ai-heading">
      <div>
        <p className="ai-eyebrow"><Sparkles size={13} />{vi ? 'TRỢ LÝ TÀI CHÍNH' : 'FINANCIAL COPILOT'}</p>
        <h1>{vi ? 'Hiểu tiền. Hỏi AI.' : 'Know your money. Ask AI.'}</h1>
        <p>{vi ? 'AI đọc báo cáo, ngân sách và mục tiêu của bạn rồi đề xuất cách tiết kiệm cụ thể.' : 'AI reads your reports, budgets, and goals, then suggests concrete ways to save.'}</p>
      </div>
      <div className="ai-heading-actions">
        <button type="button" className="ft-btn ft-btn-secondary" onClick={() => onNavigate('settings')}><Settings2 size={16} />{vi ? 'Cài đặt AI' : 'AI settings'}</button>
        <button type="button" className="ft-btn ft-btn-primary" onClick={() => void request(analysisRequest(currentLang), true)} disabled={!configured || busy}>
          {busy ? <LoaderCircle size={16} className="ft-spin" /> : <RefreshCw size={16} />}
          {busy ? (vi ? 'Đang phân tích…' : 'Analyzing…') : (vi ? 'Phân tích báo cáo' : 'Analyze report')}
        </button>
      </div>
    </header>

    {!configured ? <section className="ai-setup">
      <span className="ai-setup-icon"><Bot size={26} /></span>
      <h2>{vi ? 'Kết nối trợ lý AI của bạn' : 'Connect your AI advisor'}</h2>
      <p>{vi ? 'FinTrack dùng API chuẩn OpenAI. Nhập Base URL, API key và model trong Cài đặt — hỗ trợ OpenAI, Groq, OpenRouter hoặc Ollama chạy trên máy bạn.' : 'FinTrack uses the OpenAI-compatible API. Add a base URL, API key, and model in Settings — works with OpenAI, Groq, OpenRouter, or a local Ollama.'}</p>
      <button type="button" className="ft-btn ft-btn-primary" onClick={() => onNavigate('settings')}>{vi ? 'Mở cài đặt AI' : 'Open AI settings'}<ArrowUp size={15} /></button>
    </section> : <>
      <div className="ai-context">
        <span className="ai-context-item"><i />{host} · {config.model}</span>
        <span className="ai-context-item">{currency} · {periodLabel}</span>
        {thread.length > 0 && <button type="button" className="ai-clear" onClick={clear}><Trash2 size={14} />{vi ? 'Cuộc trò chuyện mới' : 'New conversation'}</button>}
      </div>

      {snapshot && <div className="ai-metrics">
        <div><span>{vi ? 'Thu nhập tháng này' : 'Income this month'}</span><strong>{money(snapshot.cashFlow.totalIncome, currentLang, currency)}</strong></div>
        <div><span>{vi ? 'Chi tiêu tháng này' : 'Spending this month'}</span><strong>{money(snapshot.cashFlow.totalExpense, currentLang, currency)}</strong></div>
        <div><span>{vi ? 'Tỷ lệ tiết kiệm' : 'Savings rate'}</span><strong>{snapshot.cashFlow.savingsRate != null ? `${snapshot.cashFlow.savingsRate}%` : '—'}</strong></div>
      </div>}

      <section className="ai-chat" aria-live="polite">
        {thread.length === 0 && !busy && <div className="ai-empty">
          <span><Sparkles size={26} /></span>
          <h3>{vi ? 'Sẵn sàng đọc báo cáo của bạn.' : 'Ready to read your reports.'}</h3>
          <p>{vi ? 'Bấm “Phân tích báo cáo” để AI xem thu chi, ngân sách và mục tiêu, rồi lên kế hoạch tiết kiệm 30 ngày cho bạn.' : 'Choose “Analyze report” and AI will review your cash flow, budgets, and goals, then build a 30-day savings plan.'}</p>
          <button type="button" className="ft-btn ft-btn-primary" onClick={() => void request(analysisRequest(currentLang), true)} disabled={busy}><Sparkles size={16} />{vi ? 'Phân tích ngay' : 'Analyze now'}</button>
        </div>}
        {thread.map((message, index) => message.role === 'user'
          ? <div className="ai-msg user" key={index}><div className="ai-bubble">{message.content}</div></div>
          : <div className="ai-msg assistant" key={index}><span className="ai-avatar"><Sparkles size={15} /></span><div className="ai-bubble"><RichText text={message.content} /></div></div>)}
        {busy && <div className="ai-msg assistant"><span className="ai-avatar"><Sparkles size={15} /></span><div className="ai-bubble ai-thinking"><i /><i /><i /><span>{vi ? 'Đang đọc báo cáo và tính toán…' : 'Reading your reports and calculating…'}</span></div></div>}
      </section>

      <div className="ai-composer">
        <textarea rows={1} value={input} maxLength={800} placeholder={vi ? 'Hỏi AI về chi tiêu, ngân sách, mục tiêu…' : 'Ask AI about spending, budgets, goals…'} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} disabled={busy} aria-label={vi ? 'Câu hỏi cho trợ lý AI' : 'Question for the AI advisor'} />
        <button type="button" className="ai-send" onClick={send} disabled={busy || !input.trim()} aria-label={vi ? 'Gửi câu hỏi' : 'Send question'}><ArrowUp size={18} /></button>
      </div>
      <div className="ai-suggestions">
        {[
          vi ? 'Tôi đang chi quá nhiều ở đâu?' : 'Where am I overspending?',
          vi ? 'Lập kế hoạch tiết kiệm 30 ngày' : 'Build a 30-day savings plan',
          vi ? 'Làm sao đạt mục tiêu nhanh hơn?' : 'How can I reach my goals faster?',
          vi ? 'Ngân sách nào cần điều chỉnh?' : 'Which budgets need adjusting?',
        ].map(question => <button key={question} type="button" className="ai-chip" disabled={busy} onClick={() => void request(question, false)}>{question}</button>)}
      </div>
      <p className="ai-disclaimer"><CircleAlert size={13} />{vi ? 'Dữ liệu tài chính của bạn được gửi tới nhà cung cấp AI bạn đã cấu hình. AI có thể sai sót; đây là gợi ý, không phải tư vấn đầu tư chuyên nghiệp.' : 'Your financial data is sent to the AI provider you configured. AI can make mistakes; this is guidance, not professional investment advice.'}</p>
    </>}
  </div>;
}
