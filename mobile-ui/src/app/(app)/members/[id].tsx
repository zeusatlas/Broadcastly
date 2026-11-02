import { User } from 'lucide-react-native';

import { Placeholder } from '@/components/ui';

export default function MemberDetailScreen() {
  return (
    <Placeholder
      title="Member"
      description="View and update one member record within scope (FR-MEM-01)."
      icon={User}
    />
  );
}
