import { CheckCheck } from 'lucide-react-native';

import { Placeholder } from '@/components/ui';

export default function ApprovalsScreen() {
  return (
    <Placeholder
      title="Approvals"
      description="Broadcasts awaiting your decision, with approve and reject with reason (FR-APR-03)."
      icon={CheckCheck}
    />
  );
}
