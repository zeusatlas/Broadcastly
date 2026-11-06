import { Users } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  BottomSheet,
  Button,
  Chip,
  FigureRow,
  LoadingState,
  PageSection,
  QueryState,
  Text,
} from '@/components/ui';
import { notify } from '@/lib/notify';
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
  const [status, setStatus] = useState<DeliveryStatus | 'all'>('all');
  const deliveries = useDeliveryPages(report.id, status);
  const exportReport = useExportReportMutation();
  const title = report.title ?? 'Untitled broadcast';
  const unknown = Math.max(0, report.submittedCount - report.deliveredCount - report.failedCount);
  const fileName = `${title.replace(/[^\w-]+/g, '-')}-delivery-report.csv`;
  // The first page decides what the sheet shows; until then one loading state, so nothing jumps.
  const isFirstLoad = status === 'all' && deliveries.isLoading;

  const exportAndClose = async () => {
    const uri = await exportReport.mutate({ broadcastId: report.id, fileName });
    if (!uri) return;
    onClose();
    notify.success('Report exported', fileName);
  };

  return (
    <BottomSheet
      isVisible
      onClose={onClose}
      title={title}
      description={`${report.audienceSummary ?? 'Audience not set'} · ${formatDateTime(report.completedAt ?? report.submittedAt ?? report.createdAt)}`}
      closeLabel="Close report"
      size="tall"
      footer={
        isFirstLoad ? undefined : (
          <>
            <Button
              label="Export report"
              variant="outline"
              size="lg"
              fullWidth
              isLoading={exportReport.isPending}
              loadingLabel="Preparing file…"
              onPress={exportAndClose}
            />
            {exportReport.error ? (
              <Text className="text-center font-sans-medium text-sm text-destructive">
                {exportReport.error.message}
              </Text>
            ) : null}
          </>
        )
      }
    >
      {isFirstLoad ? (
        <LoadingState label="Loading report" className="flex-1" />
      ) : (
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
              emptyText="No recipients here"
              emptyDescription="No one in this broadcast has this delivery status."
              emptyIcon={Users}
              onRetry={deliveries.reload}
            />
            {deliveries.isLoading ? null : (
              <View>
                {deliveries.items.map((item, index) => (
                  <DeliveryRow
                    key={item.id}
                    delivery={item}
                    isLast={index === deliveries.items.length - 1}
                  />
                ))}
              </View>
            )}
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
      )}
    </BottomSheet>
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
