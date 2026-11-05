import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, FigureRow, PageSection, QueryState, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn, formatDateTime } from '@/utils/helpers';

import { useDeliveryPages, useExportReportMutation } from '../hooks/use_reports';
import type { DeliveryResponse, DeliveryStatus, ReportBroadcastResponse } from '../types';

const DELIVERY_FILTERS: { key: DeliveryStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'failed', label: 'Failed' },
  { key: 'unknown', label: 'Unknown' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'pending', label: 'Pending' },
];

const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  delivered: 'Delivered',
  failed: 'Failed',
  unknown: 'Unknown',
};

interface ReportDetailSheetProps {
  report: ReportBroadcastResponse | null;
  onClose: () => void;
}

export function ReportDetailSheet({ report, onClose }: ReportDetailSheetProps) {
  if (!report) return null;
  return <ReportDetail key={report.id} report={report} onClose={onClose} />;
}

function ReportDetail({
  report,
  onClose,
}: {
  report: ReportBroadcastResponse;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [status, setStatus] = useState<DeliveryStatus | 'all'>('all');
  const deliveries = useDeliveryPages(report.id, status);
  const exportReport = useExportReportMutation();
  const title = report.title ?? 'Untitled broadcast';
  const unknown = Math.max(0, report.submittedCount - report.deliveredCount - report.failedCount);
  const fileName = `${title.replace(/[^\w-]+/g, '-')}-delivery-report.csv`;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-backdrop/60">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close report"
          onPress={onClose}
          className="flex-1"
        />
        <View
          className="rounded-t-3xl bg-background px-5 pt-5"
          style={{ maxHeight: '88%', paddingBottom: insets.bottom + 16 }}
        >
          <View className="mb-5 flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-0.5">
              <Text variant="heading">{title}</Text>
              <Text variant="caption">
                {report.audienceSummary ?? 'Audience not set'} ·{' '}
                {formatDateTime(report.completedAt ?? report.submittedAt ?? report.createdAt)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close report"
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full bg-muted"
            >
              <X size={20} color={theme.foreground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <PageSection title="Delivery summary" className="mt-0">
              <FigureRow
                figures={[
                  { label: 'Submitted', value: report.submittedCount },
                  { label: 'Delivered', value: report.deliveredCount },
                  { label: 'Failed', value: report.failedCount },
                  { label: 'Unknown', value: unknown },
                ]}
              />
              <Text variant="caption">
                Delivered means the network reached the phone, not that it was read.
              </Text>
            </PageSection>

            <PageSection title="Recipients">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {DELIVERY_FILTERS.map((item) => (
                    <Chip
                      key={item.key}
                      label={item.label}
                      isSelected={status === item.key}
                      onPress={() => setStatus(item.key)}
                    />
                  ))}
                </View>
              </ScrollView>
              <QueryState
                isLoading={deliveries.isLoading}
                error={deliveries.items.length === 0 ? deliveries.error : null}
                isEmpty={deliveries.items.length === 0}
                emptyText="No recipients with this status."
                onRetry={deliveries.reload}
              />
              <View>
                {deliveries.items.map((item, index) => (
                  <DeliveryRow
                    key={item.id}
                    delivery={item}
                    isLast={index === deliveries.items.length - 1}
                  />
                ))}
              </View>
              {deliveries.hasNextPage ? (
                <Button
                  label="Show more"
                  variant="outline"
                  isLoading={deliveries.isFetching}
                  loadingLabel="Loading…"
                  onPress={deliveries.loadMore}
                />
              ) : null}
            </PageSection>
          </ScrollView>

          <View className="gap-2 pt-4">
            <Button
              label="Export report"
              variant="outline"
              size="lg"
              fullWidth
              isLoading={exportReport.isPending}
              loadingLabel="Preparing file…"
              onPress={() => exportReport.mutate({ broadcastId: report.id, fileName })}
            />
            {exportReport.error ? (
              <Text className="text-center font-sans-medium text-sm text-destructive">
                {exportReport.error.message}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DeliveryRow({ delivery, isLast }: { delivery: DeliveryResponse; isLast: boolean }) {
  const at = delivery.statusAt ?? delivery.submittedAt;

  return (
    <View
      accessible
      accessibilityLabel={`${delivery.memberName ?? 'Member'}, ${DELIVERY_LABEL[delivery.status]}`}
      className={cn('flex-row items-center gap-3 py-3', !isLast && 'border-b border-border')}
    >
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-sm text-foreground" numberOfLines={1}>
          {delivery.memberName ?? 'Member'}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {delivery.phone}
          {delivery.error ? ` · ${delivery.error}` : ''}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text
          className={cn(
            'font-sans-semibold text-xs',
            delivery.status === 'delivered'
              ? 'text-success'
              : delivery.status === 'failed'
                ? 'text-destructive'
                : 'text-muted-foreground',
          )}
        >
          {DELIVERY_LABEL[delivery.status]}
        </Text>
        {at ? <Text variant="caption">{formatDateTime(at)}</Text> : null}
      </View>
    </View>
  );
}
