import { useReadCreditBalancesQuery } from './use_credits_api';

// The credits this person's own broadcasts are paid from: what they bought or were given. Home shows it.
export function useSpendingWallet() {
  const balances = useReadCreditBalancesQuery();
  const mine = balances.data?.mine;

  return {
    title: 'Your credits',
    explanation: 'Your broadcasts are paid from here.',
    available: mine?.available,
    reserved: mine?.reserved ?? 0,
    query: balances,
  };
}
