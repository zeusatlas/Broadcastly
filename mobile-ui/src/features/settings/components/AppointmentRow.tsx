import { View } from 'react-native';

import { Text } from '@/components/ui';
import type { Appointment } from '@/types/models';
import { cn } from '@/utils/helpers';

import { formatShortDate } from '../utils/format';

interface AppointmentRowProps {
  appointment: Appointment;
  isLast?: boolean;
}

export function AppointmentRow({ appointment, isLast = false }: AppointmentRowProps) {
  const since = formatShortDate(appointment.effectiveFrom);
  const place = appointment.unitName ?? appointment.organisationName;

  return (
    <View
      accessible
      accessibilityLabel={`${appointment.positionTitle}, ${place}, since ${since}`}
      className={cn('flex-row items-center gap-3 py-4', !isLast && 'border-b border-border')}
    >
      <View className="h-2.5 w-2.5 rounded-full bg-accent" />
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-bold text-base text-foreground" numberOfLines={1}>
          {appointment.positionTitle}
        </Text>
        <Text variant="caption" className="text-sm" numberOfLines={1}>
          {place} · since {since}
        </Text>
      </View>
    </View>
  );
}
