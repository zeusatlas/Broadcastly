import { View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use_theme';

interface PaginationDotsProps {
  progress: SharedValue<number>;
  count: number;
}

export function PaginationDots({ progress, count }: PaginationDotsProps) {
  return (
    <View
      className="flex-row items-center gap-2"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }, (_, index) => (
        <Dot key={index} index={index} progress={progress} />
      ))}
    </View>
  );
}

function Dot({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const theme = useTheme();

  const style = useAnimatedStyle(() => {
    const distance = Math.abs(progress.get() - index);

    return {
      width: interpolate(distance, [0, 1], [24, 8], Extrapolation.CLAMP),
      opacity: interpolate(distance, [0, 1], [1, 0.3], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View
      style={[{ height: 8, borderRadius: 4, backgroundColor: theme.primary }, style]}
    />
  );
}
