import { Wallet } from 'lucide-react-native';

import { Placeholder } from '@/components/ui';

export default function CreditsScreen() {
  return (
    <Placeholder
      title="Credits"
      description="Balance, allocations and the transaction ledger."
      icon={Wallet}
    />
  );
}
