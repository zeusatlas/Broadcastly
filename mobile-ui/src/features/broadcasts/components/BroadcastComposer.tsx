import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Chip, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import type { SegmentEstimate } from '../types';

// Approved personalisation fields (FR-SMS-05); the server fills them per recipient.
const FIELDS = [
  { label: 'First name', token: '{first_name}' },
  { label: 'Meeting date', token: '{meeting_date}' },
  { label: 'Meeting location', token: '{meeting_location}' },
];

interface BroadcastComposerProps {
  message: string;
  onChangeMessage: (message: string) => void;
  estimate: SegmentEstimate;
}

export function BroadcastComposer({ message, onChangeMessage, estimate }: BroadcastComposerProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const insert = (token: string) =>
    onChangeMessage(message && !message.endsWith(' ') ? `${message} ${token}` : message + token);

  return (
    <View className="gap-3">
      <View
        className={cn(
          'rounded-2xl border-2 bg-muted/40 px-4 pb-3 pt-3',
          isFocused ? 'border-ring' : 'border-input',
        )}
      >
        <TextInput
          accessibilityLabel="Message"
          value={message}
          onChangeText={onChangeMessage}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Write your message…"
          placeholderTextColor={theme.mutedForeground}
          multiline
          textAlignVertical="top"
          className="min-h-36 font-sans text-base leading-6 text-foreground"
        />
        <View className="mt-2 flex-row items-center justify-between border-t border-border pt-2">
          <Text variant="caption">
            {estimate.encoding} · {estimate.characters} chars
          </Text>
          <Text className="font-sans-semibold text-xs text-foreground">
            {estimate.segments} {estimate.segments === 1 ? 'segment' : 'segments'} ·{' '}
            {estimate.remaining} left
          </Text>
        </View>
      </View>

      {estimate.encoding === 'Unicode' ? (
        <Text variant="caption" className="text-accent-emphasis">
          Emoji or special characters shorten each SMS to 70 characters.
        </Text>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {FIELDS.map((field) => (
            <Chip
              key={field.token}
              label={field.label}
              icon={Plus}
              onPress={() => insert(field.token)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
