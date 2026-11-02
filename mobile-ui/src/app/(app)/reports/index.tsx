import { ChartColumn } from 'lucide-react-native';

import { Placeholder } from '@/components/ui';

export default function ReportsScreen() {
  return (
    <Placeholder
      title="Reports"
      description="Broadcast history and delivery reports within scope (FR-REP-04, FR-REP-05)."
      icon={ChartColumn}
    />
  );
}
