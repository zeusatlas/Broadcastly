import { Check, MapPin, User, X } from 'lucide-react-native';
import { Modal, Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';

import type { MemberRowData } from './MemberRow';

interface MemberDetailSheetProps {
  member: MemberRowData | null;
  onClose: () => void;
}

export function MemberDetailSheet({ member, onClose }: MemberDetailSheetProps) {
  const theme = useTheme();

  if (!member) return null;

  const isActive = member.status === 'active';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-backdrop/60">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close member details"
          onPress={onClose}
          className="absolute inset-0"
        />
        <View className="rounded-t-2xl border border-b-0 border-border bg-card px-5 pb-8 pt-4">
          <View className="mb-5 flex-row items-center justify-between">
            <View className="h-1 w-10 rounded-full bg-muted-foreground" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close member details"
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-xl bg-muted"
            >
              <X size={20} color={theme.foreground} />
            </Pressable>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <User size={25} color={theme.primary} />
            </View>
            <View className="flex-1 gap-1">
              <Text variant="heading">{member.name}</Text>
              <Text variant="caption">Member record</Text>
            </View>
            <View className="flex-row items-center gap-1 rounded-full bg-success/10 px-3 py-1.5">
              <Check size={14} color={theme.success} />
              <Text variant="caption" className="text-success">
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View className="mt-6 border-t border-border pt-2">
            <View className="flex-row items-center gap-3 border-b border-border py-4">
              <MapPin size={19} color={theme.mutedForeground} />
              <View className="flex-1 gap-1">
                <Text variant="caption">Organisation unit</Text>
                <Text variant="label">{member.unit}</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3 py-4">
              <User size={19} color={theme.mutedForeground} />
              <View className="flex-1 gap-1">
                <Text variant="caption">Member ID</Text>
                <Text variant="label">{member.id}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
