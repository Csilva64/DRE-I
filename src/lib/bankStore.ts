import type { Transaction } from './csvParser';

const KEY = 'bank_transactions_v2';

export function saveTransactions(txs: Transaction[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(txs));
  } catch {
    // storage full — ignore
  }
}

export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((t: any) => ({ ...t, date: new Date(t.date) }));
  } catch {
    return [];
  }
}

export function clearTransactions(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem('bank_dashboard_v1');
}
