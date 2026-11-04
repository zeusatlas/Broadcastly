import { FileText } from 'lucide-react-native';

import { Placeholder } from '@/components/ui';

export default function TemplatesScreen() {
  return (
    <Placeholder
      title="Templates"
      description="Reusable messages for official notices, meeting announcements and reminders (FR-SMS-04)."
      icon={FileText}
    />
  );
}
