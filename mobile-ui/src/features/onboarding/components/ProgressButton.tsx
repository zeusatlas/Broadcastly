import { ArrowRight, Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks/use_theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING = 84;
const STROKE = 3;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ProgressButtonProps {
  progress: SharedValue<number>;
  count: number;
  isLast: boolean;
  onPress: () => void;
}

// The ring fills one step per slide as the user swipes, so progress needs no separate indicator.
export function ProgressButton({ progress, count, isLast, onPress }: ProgressButtonProps) {
  const theme = useTheme();
  const Icon = isLast ? Check : ArrowRight;

  const ringProps = useAnimatedProps(() => {
    const filled = interpolate(progress.get(), [0, count - 1], [1 / count, 1], Extrapolation.CLAMP);

    return { strokeDashoffset: CIRCUMFERENCE * (1 - filled) };
  });

  return (
    <View className="items-center justify-center" style={{ width: RING, height: RING }}>
      <Svg
        width={RING}
        height={RING}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={RADIUS}
          stroke={theme.border}
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={RING / 2}
          cy={RING / 2}
          r={RADIUS}
          stroke={theme.accent}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          fill="none"
          animatedProps={ringProps}
        />
      </Svg>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isLast ? 'Continue to sign in' : 'Next'}
        onPress={onPress}
        hitSlop={8}
        className="h-16 w-16 items-center justify-center rounded-full bg-primary"
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
      >
        <Icon size={24} color={theme.primaryForeground} />
      </Pressable>
    </View>
  );
}
