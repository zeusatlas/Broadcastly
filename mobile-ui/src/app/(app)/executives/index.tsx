import { UsersRound } from 'lucide-react-native';

import { Placeholder } from '@/components/ui';

export default function ExecutivesScreen() {
  return (
    <Placeholder
      title="Executives"
      description="Appoint, transfer, replace or revoke executives, manage their app access and see appointment history (FR-ORG-03..07, FR-AUTH-03)."
      icon={UsersRound}
    />
  );
}
