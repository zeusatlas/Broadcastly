import { Moon, Sun } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  IconButton,
  ScrollScreen,
  Text,
  type BadgeTone,
  type ButtonVariant,
} from '@/components/ui';
import { Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use_color_scheme';
import { cn } from '@/utils/helpers';

// Developer reference. Remove this route and its tab entry before release.

interface SurfaceSwatch {
  token: string;
  container: string;
  label: string;
}

const SURFACES: SurfaceSwatch[] = [
  {
    token: 'background',
    container: 'bg-background border border-border',
    label: 'text-foreground',
  },
  { token: 'card', container: 'bg-card border border-border', label: 'text-card-foreground' },
  { token: 'muted', container: 'bg-muted', label: 'text-muted-foreground' },
  { token: 'primary', container: 'bg-primary', label: 'text-primary-foreground' },
  { token: 'secondary', container: 'bg-secondary', label: 'text-secondary-foreground' },
  { token: 'accent', container: 'bg-accent', label: 'text-accent-foreground' },
  { token: 'critical', container: 'bg-critical', label: 'text-critical-foreground' },
  { token: 'success', container: 'bg-success', label: 'text-success-foreground' },
  { token: 'warning', container: 'bg-warning', label: 'text-warning-foreground' },
  { token: 'destructive', container: 'bg-destructive', label: 'text-destructive-foreground' },
];

const BUTTON_VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'accent',
  'critical',
  'destructive',
  'outline',
  'ghost',
];

const BADGE_TONES: BadgeTone[] = [
  'neutral',
  'primary',
  'accent',
  'success',
  'warning',
  'destructive',
  'critical',
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text variant="heading">{title}</Text>
      {children}
    </View>
  );
}

export default function DesignSystemScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ScrollScreen className="gap-8 pt-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-1">
          <Text variant="display">Design system</Text>
          <Text variant="bodyMuted">Semantic tokens for the active theme.</Text>
        </View>
        <IconButton
          icon={isDark ? Sun : Moon}
          label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          variant="outline"
          onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
        />
      </View>

      <Section title="Brand palette">
        <View className="flex-row flex-wrap gap-2">
          {Object.entries(Brand).map(([name, hex]) => (
            <View key={name} className="w-[31%] gap-1">
              <View
                className="h-14 w-full rounded-md border border-border"
                style={{ backgroundColor: hex }}
              />
              <Text variant="code" className="text-[10px]">
                {hex}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Semantic surfaces">
        <View className="gap-2">
          {SURFACES.map(({ token, container, label }) => (
            <View
              key={token}
              className={cn('flex-row items-center justify-between rounded-md p-3', container)}
            >
              <Text className={cn('font-sans-semibold text-sm', label)}>{token}</Text>
              <Text className={cn('text-xs', label)}>{token}-foreground</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Typography">
        <Card className="gap-2">
          <Text variant="display">Display</Text>
          <Text variant="title">Title</Text>
          <Text variant="heading">Heading</Text>
          <Text variant="body">Body</Text>
          <Text variant="bodyMuted">Body muted</Text>
          <Text variant="label">Label</Text>
          <Text variant="caption">Caption</Text>
          <Text variant="code">code</Text>
        </Card>
      </Section>

      <Section title="Buttons">
        <View className="gap-2">
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} label={variant} variant={variant} fullWidth />
          ))}
          <Button label="Loading" isLoading fullWidth />
          <Button label="Disabled" disabled fullWidth />
        </View>
      </Section>

      <Section title="Badges">
        <View className="gap-3">
          <View className="flex-row flex-wrap gap-2">
            {BADGE_TONES.map((tone) => (
              <Badge key={tone} label={tone} tone={tone} />
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {BADGE_TONES.map((tone) => (
              <Badge key={`${tone}-subtle`} label={tone} tone={tone} variant="subtle" />
            ))}
          </View>
        </View>
      </Section>

      <Section title="Gold on the page">
        <Card className="gap-2">
          <Text className="text-accent">text-accent — 2.66:1. Fills only.</Text>
          <Text className="text-accent-emphasis">text-accent-emphasis — 4.64:1. Standalone.</Text>
          <View className="h-px w-full bg-accent-emphasis" />
        </Card>
      </Section>
    </ScrollScreen>
  );
}
