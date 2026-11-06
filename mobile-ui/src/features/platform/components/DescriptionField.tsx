import { View } from 'react-native';

import { Text, TextField } from '@/components/ui';
import { cn } from '@/utils/helpers';

import { DESCRIPTION_MAX_WORDS, wordCount } from '../utils/organisation_types';

interface DescriptionFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
}

// A short "about" for the organisation, limited by words rather than characters.
export function DescriptionField({ value, onChangeText, error }: DescriptionFieldProps) {
  const words = wordCount(value);
  const isOver = words > DESCRIPTION_MAX_WORDS;

  return (
    <View className="gap-1.5">
      <TextField
        label="Description (optional)"
        value={value}
        onChangeText={onChangeText}
        placeholder="Who they are and who they message"
        multiline
        numberOfLines={5}
        maxLength={2000}
        textAlignVertical="top"
        autoCapitalize="sentences"
        error={
          error ?? (isOver ? `Keep it to ${DESCRIPTION_MAX_WORDS} words or fewer.` : undefined)
        }
      />
      <Text
        variant="caption"
        className={cn('text-right', isOver && 'text-destructive')}
        accessibilityLabel={`${words} of ${DESCRIPTION_MAX_WORDS} words`}
      >
        {words} / {DESCRIPTION_MAX_WORDS} words
      </Text>
    </View>
  );
}
