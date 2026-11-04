import {
  BookOpen,
  Bug,
  Headset,
  MessageSquareText,
  Sparkles,
} from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, Text } from '@/components/ui';
import { notify } from '@/lib/notify';

import { SettingsExpandableRow } from '../components/SettingsRow';
import { SettingsSection } from '../components/SettingsSection';

// TODO(support links): rows are UI only until the party supplies its channels and support contact.
export function SupportScreen() {
  return (
    <PageScreen title="Help & Support">
      <SettingsSection title="Is the app helping?" className="mt-0">
        <SettingsExpandableRow icon={Sparkles} label="Tell us how it’s going">
          <View className="gap-4">
            <Text variant="bodyMuted">
              Your feedback shapes what we improve next. It takes less than a minute.
            </Text>
            <Button
              label="Share feedback"
              variant="outline"
              fullWidth
              onPress={() => notify.info('Feedback form is coming soon')}
            />
          </View>
        </SettingsExpandableRow>
      </SettingsSection>

      <SettingsSection title="Get help">
        <SettingsExpandableRow icon={BookOpen} label="Help centre">
          <Text variant="bodyMuted">Use the dashboard for daily work, More for organisation tools, and Reports to review completed activity.</Text>
        </SettingsExpandableRow>
        <SettingsExpandableRow icon={Headset} label="Contact support">
          <View className="gap-3"><Text variant="bodyMuted">Describe the issue and include the screen where it happened.</Text><Button label="Start support request" variant="outline" fullWidth onPress={() => notify.info('Support request form is ready for support contact details')} /></View>
        </SettingsExpandableRow>
        <SettingsExpandableRow icon={Bug} label="Report a problem">
          <View className="gap-3"><Text variant="bodyMuted">Tell us what happened and what you expected to happen.</Text><Button label="Create problem report" variant="outline" fullWidth onPress={() => notify.info('Problem report form is ready for issue details')} /></View>
        </SettingsExpandableRow>
      </SettingsSection>

      <SettingsSection title="Feedback">
        <SettingsExpandableRow icon={MessageSquareText} label="Send feedback">
          <View className="gap-3"><Text variant="bodyMuted">Share an idea or tell us what would make your work easier.</Text><Button label="Share feedback" variant="outline" fullWidth onPress={() => notify.info('Feedback form is ready for your message')} /></View>
        </SettingsExpandableRow>
      </SettingsSection>
    </PageScreen>
  );
}
