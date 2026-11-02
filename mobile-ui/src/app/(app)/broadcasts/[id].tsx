import { FileText } from 'lucide-react-native';

import { Placeholder } from '@/components/ui';

export default function BroadcastDetailScreen() {
  return (
    <Placeholder
      title="Broadcast"
      description="Status, approval history and delivery summary for one broadcast (FR-SMS-12, FR-REP-04)."
      icon={FileText}
    />
  );
}
