/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiGet } from './lib/api';
import { ToastProvider } from './components/ui/ToastProvider';
import { ConfirmProvider } from './components/ui/ConfirmProvider';
import App from './App';

vi.mock('./lib/api', async importOriginal => {
  const actual = await importOriginal<typeof import('./lib/api')>();
  return { ...actual, apiGet: vi.fn() };
});

const get = vi.mocked(apiGet);
const clients: QueryClient[] = [];

function mountApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false, gcTime: Infinity } },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '#/dashboard';
  get.mockReset().mockImplementation(async path => {
    if (path === '/settings') return { displayCurrency: 'VND', locale: 'vi' };
    if (path.startsWith('/dashboard/summary')) {
      return {
        startDate: '2026-10-01', endDate: '2026-10-31',
        totalIncome: '0', totalExpense: '0', netCashFlow: '0', totalBalance: '0',
        budgetUtilization: null, savingsProgress: null,
      };
    }
    if (path.startsWith('/dashboard/insights')) {
      return {
        savingsRate: null, budgetCount: 0, overBudgetCount: 0, nearLimitCount: 0,
        activeGoals: 0, completedGoals: 0,
      };
    }
    if (path.startsWith('/dashboard/cash-flow')) return { points: [] };
    if (path.startsWith('/dashboard/expense-breakdown')) return { categories: [], totalExpense: '0' };
    return { content: [], totalPages: 0 };
  });
});

afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
  vi.clearAllTimers();
});

describe('FinTrack desktop shell', () => {
  it('shows the sign-in experience when there is no session', () => {
    mountApp();

    expect(screen.getAllByText(/fintrack/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Mừng bạn trở lại.')).toBeInTheDocument();
    expect(screen.getByLabelText('Địa chỉ Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vào không gian của bạn/i })).toBeInTheDocument();
  });

  it('renders the premium workspace shell for an authenticated session', async () => {
    localStorage.setItem('fintrack_token', 'mock_jwt_token_for_testing');
    localStorage.setItem('fintrack_lang', 'vi');
    localStorage.setItem('fintrack_user', JSON.stringify({
      email: 'demo@fintrack.local', fullName: 'Người Dùng Demo', userId: 1,
    }));

    mountApp();

    expect(await screen.findByText(/Chào/)).toBeInTheDocument();
    expect(screen.getAllByText('Tổng quan').length).toBeGreaterThan(0);
    expect(screen.getByText('Nhịp điệu dòng tiền')).toBeInTheDocument();
    expect(screen.getByText('Giao dịch gần đây')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Thêm giao dịch/i }).length).toBeGreaterThan(0);
  });
});
