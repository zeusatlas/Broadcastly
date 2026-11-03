import type { LucideIcon } from 'lucide-react-native';
import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, Text } from '@/components/ui';

import { ListControls, type ListControlsProps } from './ListControls';

interface AdminListLayoutProps<F extends string> extends ListControlsProps<F> {
  title: string;
  action?: { label: string; icon: LucideIcon; onPress?: () => void };
  // e.g. "Showing 50 of 120" when there are more pages.
  footnote?: string;
}

// Shared shell of the admin list tabs: header, primary action, search, filter chips, rows.
export function AdminListLayout<F extends string>({
  title,
  action,
  footnote,
  children,
  ...controls
}: PropsWithChildren<AdminListLayoutProps<F>>) {
  return (
    <PageScreen title={title} isTabRoot contentClassName="gap-4">
      {action ? (
        <Button label={action.label} icon={action.icon} variant="accent" onPress={action.onPress} />
      ) : null}
      <ListControls {...controls} />
      <View>{children}</View>
      {footnote ? (
        <Text variant="caption" className="text-center">
          {footnote}
        </Text>
      ) : null}
    </PageScreen>
  );
}
