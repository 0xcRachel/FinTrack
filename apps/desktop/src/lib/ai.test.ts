/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { aiConfigured, defaultAiConfig, loadAiConfig, saveAiConfig } from './ai';

describe('AI provider configuration', () => {
  beforeEach(() => localStorage.clear());

  it('requires an API key for remote OpenAI-compatible endpoints', () => {
    expect(aiConfigured({ ...defaultAiConfig(), apiKey: '' })).toBe(false);
    expect(aiConfigured({ ...defaultAiConfig(), apiKey: 'sk-test' })).toBe(true);
  });

  it('allows a local Ollama endpoint without an API key', () => {
    expect(aiConfigured({
      baseUrl: 'http://127.0.0.1:11434/v1',
      apiKey: '',
      model: 'llama3.1',
      autoAnalyze: true,
    })).toBe(true);
  });

  it('persists and reloads the provider settings', () => {
    const saved = saveAiConfig({
      baseUrl: ' https://api.groq.com/openai/v1/ ',
      apiKey: ' gsk-test ',
      model: 'llama-3.3-70b-versatile',
      autoAnalyze: false,
    });
    expect(saved.baseUrl).toBe('https://api.groq.com/openai/v1');
    expect(saved.apiKey).toBe('gsk-test');
    expect(loadAiConfig()).toEqual(saved);
  });
});
