import {
  AtSign,
  BookOpen,
  Bug,
  Camera,
  Globe,
  Headset,
  MessageCircle,
  MessageSquareText,
  Sparkles,
  Users,
} from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, Text } from '@/components/ui';

import { SettingsExpandableRow, SettingsRow } from '../components/SettingsRow';
import { SettingsSection } from '../components/SettingsSection';

// TODO(support links): rows are UI only until the party supplies its channels and support contact.
export function SupportScreen() {
  return (
    <PageScreen title="Help & Support">
      <SettingsSection title="Is the app helping?">
        <SettingsExpandableRow icon={Sparkles} label="Tell us how it’s going">
          <View className="gap-4">
            <Text variant="bodyMuted">
              Your feedback shapes what we improve next. It takes less than a minute.
            </Text>
            <Button label="Share feedback" variant="outline" fullWidth />
          </View>
        </SettingsExpandableRow>
      </SettingsSection>

      <SettingsSection title="Get help">
        <SettingsRow icon={BookOpen} label="Help centre" />
        <SettingsRow icon={Headset} label="Contact support" />
        <SettingsRow icon={Bug} label="Report a problem" />
      </SettingsSection>

      <SettingsSection title="Follow us">
        <SettingsRow icon={Globe} label="Website" />
        <SettingsRow icon={Users} label="Facebook" />
        <SettingsRow icon={AtSign} label="X" />
        <SettingsRow icon={Camera} label="Instagram" />
        <SettingsRow icon={MessageCircle} label="WhatsApp Channel" />
      </SettingsSection>

      <SettingsSection title="Feedback">
        <SettingsRow icon={MessageSquareText} label="Send feedback" />
      </SettingsSection>
    </PageScreen>
  );
}
