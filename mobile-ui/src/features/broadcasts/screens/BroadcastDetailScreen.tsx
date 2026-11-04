import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { FigureRow, PageSection, Text } from '@/components/ui';

import { BroadcastStatusBadge } from '../components/BroadcastStatusBadge';
import { DeliveryBar } from '../components/DeliveryBar';
import { getDemoBroadcast } from '../demo_data';

// Status, message and delivery summary for one broadcast (FR-SMS-12, FR-REP-04).
export function BroadcastDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const broadcast = getDemoBroadcast(id ?? '');
  const { recipients, delivered, failed, status } = broadcast;
  const unknown = Math.max(recipients - delivered - failed, 0);
  const hasOutcome = delivered + failed > 0;

  return (
    <PageScreen title={broadcast.title}>
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <BroadcastStatusBadge status={status} />
          <Text variant="caption">{broadcast.sentAt}</Text>
        </View>
        <Text variant="bodyMuted">
          {broadcast.audience} · {recipients.toLocaleString()} recipients
        </Text>
      </View>

      <PageSection title="Message">
        <View className="rounded-lg bg-muted/60 p-4">
          <Text className="leading-6">{broadcast.message}</Text>
        </View>
        <Text variant="caption">
          {broadcast.estimatedSegments} SMS segments each ·{' '}
          {broadcast.estimatedCost.toLocaleString()} credits
        </Text>
      </PageSection>

      {hasOutcome ? (
        <PageSection title="Delivery">
          <FigureRow
            figures={[
              { label: 'Delivered', value: delivered },
              { label: 'Failed', value: failed },
              { label: 'Unknown', value: unknown },
            ]}
          />
          <DeliveryBar delivered={delivered} total={recipients} status={status} />
          <Text variant="caption">
            Delivered means the network reached the phone, not that the message was read.
          </Text>
        </PageSection>
      ) : null}
    </PageScreen>
  );
}
