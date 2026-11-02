import { CalendarClock, FileText, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, Text } from '@/components/ui';
import { useCurrentUser, useHasPermission } from '@/features/auth';
import { cn } from '@/utils/helpers';

import { BroadcastComposer } from '../components/BroadcastComposer';
import { ComposeRow, ComposeSection } from '../components/ComposeSection';
import { CostEstimate } from '../components/CostEstimate';
import { RecipientPicker } from '../components/RecipientPicker';
import type { AudienceLevel, DeliveryMode } from '../types';
import { estimateSegments } from '../utils/sms_segments';

const PLACEHOLDER_RECIPIENTS = 8412;
const PLACEHOLDER_BALANCE = 24850;

const DELIVERY: { mode: DeliveryMode; label: string }[] = [
  { mode: 'now', label: 'Send now' },
  { mode: 'scheduled', label: 'Schedule' },
];

// UI only: compose → recipients → delivery → estimate (FR-SMS-01..10).
// TODO(broadcasts API): PLACEHOLDER_* values go once the estimate endpoint exists.
export function NewBroadcastScreen() {
  const user = useCurrentUser();
  // Without send rights the broadcast goes for approval instead (FR-SMS-11).
  const canSend = useHasPermission('broadcast.send');
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState<AudienceLevel>('constituency');
  const [delivery, setDelivery] = useState<DeliveryMode>('now');
  const estimate = useMemo(() => estimateSegments(message), [message]);

  const scopeName = user?.appointments[0]?.unitName ?? 'Your constituency';
  const primaryLabel = canSend
    ? delivery === 'now'
      ? 'Review & send'
      : 'Review & schedule'
    : 'Submit for approval';

  return (
    <PageScreen title="New broadcast" backIcon={X} backLabel="Close new broadcast">
      <ComposeSection step={1} title="Message">
        <ComposeRow
          // TODO(templates): opens the template list (FR-SMS-04).
          icon={FileText}
          label="Use a template"
          value="Notices, meetings, reminders"
        />
        <BroadcastComposer message={message} onChangeMessage={setMessage} estimate={estimate} />
      </ComposeSection>

      <ComposeSection step={2} title="Recipients">
        <RecipientPicker
          level={level}
          onChangeLevel={setLevel}
          scopeName={scopeName}
          recipients={PLACEHOLDER_RECIPIENTS}
        />
      </ComposeSection>

      <ComposeSection step={3} title="Delivery">
        <View accessibilityRole="radiogroup" className="flex-row rounded-full bg-muted p-1">
          {DELIVERY.map((option) => {
            const isSelected = option.mode === delivery;
            return (
              <Pressable
                key={option.mode}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={option.label}
                onPress={() => setDelivery(option.mode)}
                className={cn(
                  'h-11 flex-1 items-center justify-center rounded-full',
                  isSelected && 'bg-card',
                )}
              >
                <Text
                  className={cn(
                    'text-sm',
                    isSelected
                      ? 'font-sans-bold text-foreground'
                      : 'font-sans-medium text-muted-foreground',
                  )}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {delivery === 'scheduled' ? (
          // TODO(schedule): date and time picker.
          <ComposeRow icon={CalendarClock} label="Date and time" value="Not set" />
        ) : null}
      </ComposeSection>

      <View className="mt-8 gap-3">
        <Text accessibilityRole="header" className="font-sans-bold text-lg text-foreground">
          Estimate
        </Text>
        <CostEstimate
          recipients={PLACEHOLDER_RECIPIENTS}
          segments={Math.max(estimate.segments, 1)}
          balance={PLACEHOLDER_BALANCE}
        />
      </View>

      <View className="mt-auto gap-2 pt-10">
        <Button
          // TODO(dispatch): opens DispatchConfirmation with an idempotency key (FR-SMS-07, FR-SMS-14).
          label={primaryLabel}
          variant="accent"
          size="lg"
          fullWidth
          disabled={message.trim().length === 0}
        />
        <Button label="Save draft" variant="ghost" size="lg" fullWidth />
      </View>
    </PageScreen>
  );
}
