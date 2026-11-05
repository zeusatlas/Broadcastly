import { Info, MapPin } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { Chip, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';

import type { AudienceLevel } from '../types';
import type { UnitResponse } from '@/features/organisation';
import { ComposeRow } from './ComposeSection';

const LEVELS: { level: AudienceLevel; label: string; pickLabel: string }[] = [
  { level: 'constituency', label: 'Whole constituency', pickLabel: '' },
  { level: 'electoral_area', label: 'Electoral areas', pickLabel: 'Choose electoral areas' },
  { level: 'branch', label: 'Branches', pickLabel: 'Choose branches' },
  { level: 'polling_station', label: 'Polling stations', pickLabel: 'Choose polling stations' },
];

interface RecipientPickerProps {
  level: AudienceLevel;
  onChangeLevel: (level: AudienceLevel) => void;
  scopeName: string;
  recipients: number | null;
  units: UnitResponse[];
  selectedUnitIds: string[];
  isLoadingUnits?: boolean;
  onToggleUnit: (unitId: string) => void;
  // Organisation-wide is offered only to organisation-wide executives (FR-SMS-03).
  canReachWhole?: boolean;
}

// Only scopes the executive may reach are ever offered; the server enforces it (FR-SMS-03).
export function RecipientPicker({
  level,
  onChangeLevel,
  scopeName,
  recipients,
  units,
  selectedUnitIds,
  isLoadingUnits = false,
  onToggleUnit,
  canReachWhole = true,
}: RecipientPickerProps) {
  const theme = useTheme();
  const current = LEVELS.find((l) => l.level === level) ?? LEVELS[0];

  return (
    <View className="gap-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {LEVELS.filter((item) => canReachWhole || item.level !== 'constituency').map((item) => (
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
        <View className="gap-3">
          <ComposeRow
            icon={MapPin}
            label={current.pickLabel}
            value={`${selectedUnitIds.length} selected`}
          />
          {isLoadingUnits ? (
            <Text variant="caption">Loading units in your reach…</Text>
          ) : units.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {units.map((unit) => (
                  <Chip
                    key={unit.id}
                    label={unit.name}
                    isSelected={selectedUnitIds.includes(unit.id)}
                    onPress={() => onToggleUnit(unit.id)}
                  />
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text variant="caption">No units are available in your assigned reach.</Text>
          )}
        </View>
      )}

      <View className="flex-row items-start gap-2 px-1">
        <Info size={14} color={theme.mutedForeground} style={{ marginTop: 2 }} />
        <Text variant="caption" className="flex-1">
          {recipients === null
            ? 'Recipient count will be calculated after you select specific recipients.'
            : `About ${recipients.toLocaleString()} recipients. Duplicate and invalid numbers are removed automatically.`}
        </Text>
      </View>
      {level !== 'constituency' ? (
        <Text variant="caption" className="text-destructive">
          Choose specific units before saving a draft for this audience.
        </Text>
      ) : null}
    </View>
  );
}
