import { View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';

import type { OnboardingSlide as Slide } from '../types';
import { SlideIllustration } from './SlideIllustration';

interface OnboardingSlideProps {
  slide: Slide;
  index: number;
  progress: SharedValue<number>;
  width: number;
  illustrationSize: number;
  panelHeight: number;
  topInset: number;
}

// progress is the fractional slide position, so every animation follows the finger.
export function OnboardingSlide({
  slide,
  index,
  progress,
  width,
  illustrationSize,
  panelHeight,
  topInset,
}: OnboardingSlideProps) {
  const illustrationStyle = useAnimatedStyle(() => {
    const offset = progress.get() - index;

    return {
      opacity: interpolate(Math.abs(offset), [0, 0.8], [1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(offset, [-1, 0, 1], [-width * 0.35, 0, width * 0.35]) },
        { scale: interpolate(Math.abs(offset), [0, 1], [1, 0.7], Extrapolation.CLAMP) },
      ],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const offset = Math.abs(progress.get() - index);

    return {
      opacity: interpolate(offset, [0, 0.5], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(offset, [0, 1], [0, 24], Extrapolation.CLAMP) }],
    };
  });

  return (
    <View style={{ width }} className="flex-1 items-center px-8">
      <View
        style={{ height: panelHeight, paddingTop: topInset }}
        className="items-center justify-center"
      >
        <Animated.View style={illustrationStyle}>
          <SlideIllustration scene={slide.scene} size={illustrationSize} />
        </Animated.View>
      </View>
      <Animated.View style={textStyle}>
        <View className="mt-12 items-center">
          <Text
            variant="display"
            className="text-center"
            accessibilityRole="header"
            textBreakStrategy="balanced"
            lineBreakStrategyIOS="standard"
          >
            {slide.title}
          </Text>
          <Text variant="bodyMuted" className="mt-3 max-w-sm text-center leading-6">
            {slide.description}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
