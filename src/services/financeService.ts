import { loadState } from '@/services/organizerStore';

const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));

export async function getFinance() {
  await delay();
  return loadState().finance;
}
