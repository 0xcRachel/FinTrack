/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiRequestError, apiGet, apiPost } from '../../lib/api';
import { ToastProvider } from '../ui/ToastProvider';
import { ConfirmProvider } from '../ui/ConfirmProvider';
import { AccountsPage, BudgetPage, GoalsPage } from './PlanningPages';

vi.mock('../../lib/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return { ...actual, apiGet: vi.fn(), apiPost: vi.fn() };
});

const clients: QueryClient[] = [];
const get = vi.mocked(apiGet);
const post = vi.mocked(apiPost);
function mount(content: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ConfirmProvider>{content}</ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  get.mockReset();
  post.mockReset().mockResolvedValue({});
  // jsdom does not implement the native modal dialog methods.
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});

afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
});

describe('Financial workspace API contracts', () => {
  it('creates a budget using the backend amount, dates, category and period contract', async () => {
    get.mockImplementation(async path => path.startsWith('/categories')
      ? { content: [{ categoryId: 4, name: 'Dining', categoryType: 'EXPENSE' }], totalPages: 1 }
      : []);
    mount(<BudgetPage currentLang="en" currency="USD" />);
    fireEvent.click(screen.getByRole('button', { name: 'New budget' }));
    const dialog = within(screen.getByRole('dialog'));
    await dialog.findByRole('option', { name: 'Dining' });
    fireEvent.change(dialog.getByLabelText('Budget name'), { target: { value: 'Eating well' } });
    fireEvent.change(dialog.getByLabelText('Expense category'), { target: { value: '4' } });
    fireEvent.change(dialog.getByLabelText('Spending limit'), { target: { value: '450' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Create budget' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/budgets', expect.objectContaining({
      name: 'Eating well',
      categoryId: 4,
      amount: '450',
      currencyCode: 'USD',
      periodType: 'MONTHLY',
      startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      endDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      warningThresholdPercent: 80,
    })));
    expect(post.mock.calls[0][1]).not.toHaveProperty('limitAmount');
  });

  it('records a goal contribution in its independent ledger with date and contribution type', async () => {
    get.mockResolvedValue([{
      goalId: 31, name: 'My freedom fund', targetAmount: '1000', savedAmount: '100',
      progressPercent: 10, currencyCode: 'USD', status: 'ACTIVE',
    }]);
    mount(<GoalsPage currentLang="en" currency="USD" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add savings' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText(/Your account balance will not change/)).toBeInTheDocument();
    fireEvent.change(dialog.getByLabelText('Contribution amount (USD)'), { target: { value: '75' } });
    fireEvent.change(dialog.getByLabelText('Note (optional)'), { target: { value: 'Weekly savings' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Record contribution' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/savings-goals/31/contributions', {
      amount: '75', contributionDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      contributionType: 'CONTRIBUTION', description: 'Weekly savings',
    }));
  });

  it('creates an account with a zero opening balance and switches to its chosen currency', async () => {
    get.mockResolvedValue({ content: [], totalPages: 0 });
    mount(<AccountsPage currentLang="en" currency="VND" />);
    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Account name'), { target: { value: 'Travel account' } });
    fireEvent.change(dialog.getByLabelText('Currency'), { target: { value: 'USD' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/accounts', {
      name: 'Travel account', accountType: 'BANK', openingBalance: '0', currencyCode: 'USD', description: '',
    }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Filter by currency' })).toHaveValue('USD'));
  });

  it('keeps account currencies separate and loads every backend page', async () => {
    get.mockImplementation(async path => path.includes('page=1')
      ? { content: [{ accountId: 2, name: 'Dong savings', accountType: 'SAVINGS', currencyCode: 'VND', currentBalance: '4000000', openingBalance: '4000000' }], totalPages: 2 }
      : { content: [{ accountId: 1, name: 'Dollar savings', accountType: 'SAVINGS', currencyCode: 'USD', currentBalance: '100', openingBalance: '100' }], totalPages: 2 });
    mount(<AccountsPage currentLang="en" currency="USD" />);
    expect(await screen.findByText('Dollar savings')).toBeInTheDocument();
    expect(screen.queryByText('Dong savings')).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/accounts?size=100&page=1', expect.any(AbortSignal));
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by currency' }), { target: { value: 'VND' } });
    expect(screen.getByText('Dong savings')).toBeInTheDocument();
    expect(screen.queryByText('Dollar savings')).not.toBeInTheDocument();
  });

  it('shows connection failure instead of reporting unavailable balances as zero', async () => {
    get.mockRejectedValue(new ApiRequestError('Offline', 0));
    mount(<AccountsPage currentLang="en" currency="USD" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not connect');
    expect(screen.queryByText('YOUR TOTAL BALANCE')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
