import { API_BASE_URL, getToken } from './api';

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  autoAnalyze: boolean;
}

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'fintrack_ai_config';

export const defaultAiConfig = (): AiConfig => ({
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  autoAnalyze: true,
});

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAiConfig();
    const parsed = JSON.parse(raw) as Partial<AiConfig>;
    return {
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : defaultAiConfig().baseUrl,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model: typeof parsed.model === 'string' ? parsed.model : defaultAiConfig().model,
      autoAnalyze: parsed.autoAnalyze !== false,
    };
  } catch {
    return defaultAiConfig();
  }
}

export function saveAiConfig(config: AiConfig): AiConfig {
  const cleaned: AiConfig = {
    baseUrl: config.baseUrl.trim().replace(/\/+$/, ''),
    apiKey: config.apiKey.trim(),
    model: config.model.trim(),
    autoAnalyze: config.autoAnalyze,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  return cleaned;
}

export function aiConfigured(config: AiConfig): boolean {
  const base = config.baseUrl.trim();
  if (!base || !config.model.trim()) return false;
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(base);
  return !!config.apiKey.trim() || local;
}

export async function chatCompletion(
  config: AiConfig,
  messages: AiChatMessage[],
  signal: AbortSignal,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      signal,
      body: JSON.stringify({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model,
        messages,
      }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('Không thể kết nối tới FinTrack AI. Kiểm tra backend đang chạy. / Could not reach FinTrack AI. Check that the backend is running.');
  }
  if (!response.ok) {
    let detail = '';
    try {
      const payload = await response.json();
      detail = payload?.message || payload?.error?.message || '';
    } catch {
      /* body is not JSON */
    }
    throw new Error(detail || `FinTrack AI trả về HTTP ${response.status}.`);
  }
  const payload = await response.json();
  const content = payload?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('FinTrack AI không trả về nội dung. Kiểm tra lại model đã chọn.');
  }
  return content.trim();
}

export async function testAiConnection(config: AiConfig, signal: AbortSignal): Promise<string> {
  return chatCompletion(
    config,
    [
      { role: 'system', content: 'You are a connectivity probe. Reply with exactly: OK' },
      { role: 'user', content: 'Connection test' },
    ],
    signal,
  );
}
