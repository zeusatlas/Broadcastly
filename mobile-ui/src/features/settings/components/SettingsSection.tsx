import { Children, isValidElement, cloneElement, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { cn } from '@/utils/helpers';

interface SettingsSectionProps {
  title?: string;
  // 'mt-0' on a page's first section, so it sits the standard 16pt under the title.
  className?: string;
  children: ReactNode;
}

// Rows draw their own divider; the section switches it off on the last one.
export function SettingsSection({ title, className, children }: SettingsSectionProps) {
  const rows = Children.toArray(children).filter(isValidElement) as ReactElement<{
    isLast?: boolean;
  }>[];

  return (
    <View className={cn('mt-8', className)}>
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
