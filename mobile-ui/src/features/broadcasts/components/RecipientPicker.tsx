import { Info, MapPin } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { Chip, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';

import type { AudienceLevel } from '../types';
import { ComposeRow } from './ComposeSection';

const LEVELS: { level: AudienceLevel; label: string; pickLabel: string }[] = [
  { level: 'constituency', label: 'Whole constituency', pickLabel: '' },
  { level: 'electoral_area', label: 'Electoral areas', pickLabel: 'Choose electoral areas' },
  { level: 'branch', label: 'Branches', pickLabel: 'Choose branches' },
  { level: 'polling_station', label: 'Polling stations', pickLabel: 'Choose polling stations' },
  { level: 'executive_group', label: 'Executives', pickLabel: 'Choose executive groups' },
];

interface RecipientPickerProps {
  level: AudienceLevel;
  onChangeLevel: (level: AudienceLevel) => void;
  scopeName: string;
  recipients: number;
}

// Only scopes the executive may reach are ever offered; the server enforces it (FR-SMS-03).
export function RecipientPicker({
  level,
  onChangeLevel,
  scopeName,
  recipients,
}: RecipientPickerProps) {
  const theme = useTheme();
  const current = LEVELS.find((l) => l.level === level) ?? LEVELS[0];

  return (
    <View className="gap-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {LEVELS.map((item) => (
            <Chip
              key={item.level}
              label={item.label}
              isSelected={item.level === level}
              onPress={() => onChangeLevel(item.level)}
            />
          ))}
        </View>
      </ScrollView>

      {level === 'constituency' ? (
        <ComposeRow icon={MapPin} label={scopeName} value="Everyone in your scope" />
      ) : (
        // TODO(recipient picker): opens a searchable list of units within scope.
        <ComposeRow icon={MapPin} label={current.pickLabel} value="None selected" />
      )}

      <View className="flex-row items-start gap-2 px-1">
        <Info size={14} color={theme.mutedForeground} style={{ marginTop: 2 }} />
        <Text variant="caption" className="flex-1">
          About {recipients.toLocaleString()} recipients. Duplicate, invalid and opted-out numbers
          are removed automatically.
        </Text>
      </View>
    </View>
  );
}
