import { Users } from 'lucide-react-native';

import { Placeholder } from '@/components/ui';

export default function MembersScreen() {
  return (
    <Placeholder
      title="Members"
      description="Member directory, spreadsheet imports and organisational units."
      icon={Users}
    />
  );
}
