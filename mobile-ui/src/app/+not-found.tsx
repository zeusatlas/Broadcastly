import { SearchX } from 'lucide-react-native';

import { Placeholder } from '@/components/ui';

export default function NotFoundScreen() {
  return (
    <Placeholder
      title="Page not found"
      description="This screen does not exist or you do not have access to it."
      icon={SearchX}
    />
  );
}
