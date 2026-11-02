import { Children, isValidElement, cloneElement, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';

interface SettingsSectionProps {
  title?: string;
  children: ReactNode;
}

// Rows draw their own divider; the section switches it off on the last one.
export function SettingsSection({ title, children }: SettingsSectionProps) {
  const rows = Children.toArray(children).filter(isValidElement) as ReactElement<{
    isLast?: boolean;
  }>[];

  return (
    <View className="mt-8">
      {title ? (
        <Text
          accessibilityRole="header"
          className="mb-1 font-sans-bold text-xs uppercase tracking-widest text-accent-emphasis"
        >
          {title}
        </Text>
      ) : null}
      {rows.map((row, index) => cloneElement(row, { isLast: index === rows.length - 1 }))}
    </View>
  );
}
