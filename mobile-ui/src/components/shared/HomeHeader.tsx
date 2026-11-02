import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';

import { HEADER_BUTTON_SIZE } from './PageScreen';

interface HomeHeaderProps {
  avatarName: string;
  eyebrow?: string;
  // Without a title the avatar moves to the left and `trailing` sits alone on the right.
  title?: string;
  // Header-sized controls on the right, e.g. the notifications bell.
  trailing?: ReactNode;
}

// Top of every tab's home: the avatar that opens the profile, an optional title, and actions.
export function HomeHeader({ avatarName, eyebrow, title, trailing }: HomeHeaderProps) {
  const avatar = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open your profile"
      onPress={() => router.push('/profile')}
      hitSlop={6}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <Avatar
        name={avatarName}
        size="sm"
        style={{ width: HEADER_BUTTON_SIZE, height: HEADER_BUTTON_SIZE }}
      />
    </Pressable>
  );

  if (!title) {
    return (
      <View className="flex-row items-center justify-between gap-3">
        {avatar}
        {trailing}
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1 gap-0.5">
        {eyebrow ? (
          <Text className="font-sans-semibold text-xs uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="title" numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {trailing}
      {avatar}
    </View>
  );
}
