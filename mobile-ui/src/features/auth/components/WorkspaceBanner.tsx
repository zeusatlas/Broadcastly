import { router } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';

import { useAuthStore } from '../store/auth_store';

// Shown while a platform admin works inside an organisation, so they always know where they are.
export function WorkspaceBanner() {
  const workspace = useAuthStore((state) => state.workspace);
  const organisation = useAuthStore((state) => state.user?.organisation);
  const exit = useAuthStore((state) => state.exitOrganisation);
  if (!workspace || !organisation) return null;

  const leave = () => {
    exit();
    router.replace({
      pathname: '/admin/organisations/[id]',
      params: { id: workspace.organisationId },
    });
  };

  return (
    <View className="flex-row items-center gap-3 rounded-xl bg-accent/15 px-4 py-3">
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-bold text-sm text-foreground" numberOfLines={1}>
          Working inside {organisation.name}
        </Text>
        <Text variant="caption" numberOfLines={2}>
          As a Broadcastly admin, with everything its head can do. Your actions are logged.
        </Text>
      </View>
      <Button label="Exit" icon={LogOut} variant="outline" size="sm" shape="pill" onPress={leave} />
    </View>
  );
}
