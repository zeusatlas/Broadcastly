import { Wallet } from 'lucide-react-native';

import { Placeholder } from '@/components/ui';

export default function AllocateCreditsScreen() {
  return (
    <Placeholder
      title="Allocate credits"
      description="Allocate credits to executives or units within limits (FR-CR-03, FR-CR-04)."
      icon={Wallet}
    />
  );
}
