import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { cn } from '@/utils/helpers';

import { Text } from './Text';

interface PageSectionProps {
  title: string;
  className?: string;
}

// A titled block of a page: small gold caps label, then plain content (no card around it).
export function PageSection({ title, className, children }: PropsWithChildren<PageSectionProps>) {
  return (
    <View className={cn('mt-8 gap-3', className)}>
      <Text accessibilityRole="header" variant="overline">
        {title}
      </Text>
      {children}
    </View>
  );
}
