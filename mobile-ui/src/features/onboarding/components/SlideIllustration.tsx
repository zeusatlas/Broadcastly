import {
  BadgeCheck,
  ChartColumn,
  CircleCheck,
  Coins,
  Landmark,
  MessageSquareText,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import type { ComponentType, ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import type { OnboardingScene } from '../types';
import { Floating } from './Floating';

// Scenes are drawn on a fixed 260pt canvas, then scaled to fit the screen.
const CANVAS = 260;

interface SlideIllustrationProps {
  scene: OnboardingScene;
  size: number;
}

export function SlideIllustration({ scene, size }: SlideIllustrationProps) {
  const Scene = SCENES[scene];

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={{
          width: CANVAS,
          height: CANVAS,
          position: 'absolute',
          left: (size - CANVAS) / 2,
          top: (size - CANVAS) / 2,
          transform: [{ scale: size / CANVAS }],
        }}
      >
        <Scene />
      </View>
    </View>
  );
}

function Bar({ width, className }: { width: number; className?: string }) {
  return <View className={cn('h-1.5 rounded-full bg-muted', className)} style={{ width }} />;
}

function IconDisc({
  size,
  className,
  children,
}: {
  size: number;
  className: string;
  children: ReactNode;
}) {
  return (
    <View
      className={cn('items-center justify-center rounded-full', className)}
      style={{ width: size, height: size }}
    >
      {children}
    </View>
  );
}

function StructureScene() {
  const theme = useTheme();
  const children = [42, 100, 158];

  return (
    <>
      <View
        className="absolute rounded-3xl border border-border bg-card"
        style={{ left: 30, top: 44, width: 200, height: 172 }}
      >
        <Svg width={200} height={172} style={{ position: 'absolute' }}>
          <Path
            d="M100 54 V80 M42 80 H158 M42 80 V100 M100 80 V100 M158 80 V100"
            stroke={theme.border}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
        <View className="absolute" style={{ left: 75, top: 6 }}>
          <IconDisc size={50} className="bg-primary">
            <Landmark size={24} color={theme.primaryForeground} />
          </IconDisc>
        </View>
        {children.map((x) => (
          <View key={x} className="absolute items-center" style={{ left: x - 22, top: 100 }}>
            <IconDisc size={44} className="bg-accent">
              <Users size={20} color={theme.accentForeground} />
            </IconDisc>
            <Bar width={34} className="mt-2" />
            <Bar width={22} className="mt-1" />
          </View>
        ))}
      </View>
      <Floating delay={300} style={{ position: 'absolute', left: 198, top: 14 }}>
        <IconDisc size={40} className="bg-success">
          <BadgeCheck size={20} color={theme.successForeground} />
        </IconDisc>
      </Floating>
    </>
  );
}

function MembersScene() {
  const theme = useTheme();

  return (
    <>
      <View
        className="absolute items-center rounded-[28px] border-2 border-border bg-card px-3"
        style={{ left: 66, top: 12, width: 132, height: 236 }}
      >
        <Bar width={40} className="mt-2.5 h-1" />
        <View className="mt-5 w-full gap-3">
          <View className="w-24 gap-1.5 rounded-2xl rounded-tl-sm bg-muted p-2.5">
            <Bar width={64} className="bg-border" />
            <Bar width={44} className="bg-border" />
          </View>
          <View className="w-28 gap-1.5 self-end rounded-2xl rounded-tr-sm bg-primary p-2.5">
            <Bar width={72} className="bg-primary-foreground/70" />
            <Bar width={56} className="bg-primary-foreground/70" />
            <Bar width={38} className="bg-primary-foreground/70" />
          </View>
          <View className="w-20 gap-1.5 rounded-2xl rounded-tl-sm bg-muted p-2.5">
            <Bar width={50} className="bg-border" />
          </View>
          <View className="w-24 gap-1.5 self-end rounded-2xl rounded-tr-sm bg-primary p-2.5">
            <Bar width={58} className="bg-primary-foreground/70" />
            <Bar width={40} className="bg-primary-foreground/70" />
          </View>
        </View>
      </View>
      <Floating style={{ position: 'absolute', left: 14, top: 62 }}>
        <IconDisc size={52} className="bg-accent">
          <Users size={24} color={theme.accentForeground} />
        </IconDisc>
      </Floating>
      <Floating delay={500} distance={5} style={{ position: 'absolute', left: 24, top: 170 }}>
        <IconDisc size={40} className="border border-border bg-card">
          <MessageSquareText size={18} color={theme.accentEmphasis} />
        </IconDisc>
      </Floating>
      <Floating delay={900} style={{ position: 'absolute', left: 190, top: 168 }}>
        <IconDisc size={48} className="bg-primary">
          <Send size={22} color={theme.primaryForeground} />
        </IconDisc>
      </Floating>
    </>
  );
}

function ApprovalsScene() {
  const theme = useTheme();
  const rows = [70, 54, 64];

  return (
    <>
      <View
        className="absolute rounded-3xl border border-border bg-card p-4"
        style={{ left: 40, top: 32, width: 176, height: 190 }}
      >
        <Bar width={90} className="h-2" />
        <Bar width={56} className="mt-2" />
        <View className="mt-5 gap-4">
          {rows.map((width) => (
            <View key={width} className="flex-row items-center gap-2.5">
              <CircleCheck size={20} color={theme.success} />
              <View className="gap-1.5">
                <Bar width={width} />
                <Bar width={width - 24} />
              </View>
            </View>
          ))}
        </View>
      </View>
      <Floating style={{ position: 'absolute', left: 188, top: 10 }}>
        <IconDisc size={54} className="bg-primary">
          <ShieldCheck size={26} color={theme.primaryForeground} />
        </IconDisc>
      </Floating>
      <Floating delay={400} distance={5} style={{ position: 'absolute', left: 8, top: 186 }}>
        <View className="flex-row items-center gap-2 rounded-2xl bg-accent px-3 py-2.5">
          <Coins size={20} color={theme.accentForeground} />
          <View className="gap-1.5">
            <Bar width={44} className="bg-accent-foreground/40" />
            <Bar width={28} className="bg-accent-foreground/40" />
          </View>
        </View>
      </Floating>
      <Floating delay={800} style={{ position: 'absolute', left: 200, top: 150 }}>
        <IconDisc size={52} className="rounded-2xl border border-border bg-card">
          <ChartColumn size={24} color={theme.accentEmphasis} />
        </IconDisc>
      </Floating>
    </>
  );
}

const SCENES: Record<OnboardingScene, ComponentType> = {
  structure: StructureScene,
  members: MembersScene,
  approvals: ApprovalsScene,
};
