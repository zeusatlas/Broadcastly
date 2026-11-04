import { History } from 'lucide-react-native';

import { Placeholder } from '@/components/ui';

export default function ImportHistoryScreen() {
  return (
    <Placeholder
      title="Import history"
      description="Past member imports with their summary, source, importer and date (FR-MEM-08, FR-MEM-09)."
      icon={History}
    />
  );
}
