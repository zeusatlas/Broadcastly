import { useEffect, type PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface FloatingProps extends PropsWithChildren {
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}

// Gentle idle bob for illustration pieces. Skipped when the user asks for reduced motion.
export function Floating({ delay = 0, distance = 6, style, children }: FloatingProps) {
  const isReducedMotion = useReducedMotion();
  const offset = useSharedValue(0);

  useEffect(() => {
    if (isReducedMotion) return;

    offset.set(
      withDelay(
        delay,
        withRepeat(
          withTiming(-distance, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      ),
    );

    return () => cancelAnimation(offset);
  }, [delay, distance, isReducedMotion, offset]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
