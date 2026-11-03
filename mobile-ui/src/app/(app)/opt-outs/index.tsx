import { BellOff } from 'lucide-react-native';

import { Placeholder } from '@/components/ui';

export default function OptOutsScreen() {
  return (
    <Placeholder
      title="Opt-outs"
      description="Numbers excluded from broadcasts where the suppression applies (FR-MEM-11)."
      icon={BellOff}
    />
  );
}
