import { useRef, useState } from 'react';
import {
  Pressable,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from '@/components/ui';
import { haptics } from '@/utils/haptics';

import { OnboardingBackground } from '../components/OnboardingBackground';
import { OnboardingSlide } from '../components/OnboardingSlide';
import { PaginationDots } from '../components/PaginationDots';
import { ProgressButton } from '../components/ProgressButton';
import { ONBOARDING_SLIDES } from '../constants';
import { useOnboardingStore } from '../store/onboarding_store';

const LAST_INDEX = ONBOARDING_SLIDES.length - 1;
const TICKS_PER_STEP = 6;

export function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const complete = useOnboardingStore((s) => s.complete);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const progress = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const isLast = index === LAST_INDEX;

  const insets = useSafeAreaInsets();

  // Leaves room for the text and controls on short phones.
  const illustrationSize = Math.min(width - 64, height * 0.36, 320);
  const panelHeight = insets.top + illustrationSize + 56;

  const landedStep = useSharedValue(0);
  const lastTick = useSharedValue(0);

  // Ticks while the ring fills (a ratchet feel), then a firmer buzz when the step completes.
  // Driven by scroll position, so it works the same for a swipe and for the next button.
  const onScroll = useAnimatedScrollHandler((event) => {
    const position = event.contentOffset.x / width;
    progress.set(position);

    const tick = Math.round(position * TICKS_PER_STEP);
    if (tick !== lastTick.get()) {
      lastTick.set(tick);
      if (tick % TICKS_PER_STEP !== 0) scheduleOnRN(haptics.tick);
    }

    const step = Math.round(position);
    if (Math.abs(position - step) < 0.02 && step !== landedStep.get()) {
      landedStep.set(step);
      scheduleOnRN(haptics.step);
    }
  });

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  // Finishing flips the guard in (auth)/_layout.tsx, which moves the user on to sign-in.
  const finish = () => {
    haptics.success();
    void complete();
  };

  const skip = () => {
    haptics.tap();
    void complete();
  };

  const next = () => {
    if (isLast) return finish();

    haptics.tap();
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    setIndex(index + 1);
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-background">
      <OnboardingBackground width={width} height={height} panelHeight={panelHeight} />
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={{ flex: 1 }}
      >
        {ONBOARDING_SLIDES.map((slide, slideIndex) => (
          <OnboardingSlide
            key={slide.key}
            slide={slide}
            index={slideIndex}
            progress={progress}
            width={width}
            illustrationSize={illustrationSize}
            panelHeight={panelHeight}
            topInset={insets.top}
          />
        ))}
      </Animated.ScrollView>

      <View className="items-center gap-6 pb-4 pt-2">
        <PaginationDots progress={progress} count={ONBOARDING_SLIDES.length} />
        <ProgressButton
          progress={progress}
          count={ONBOARDING_SLIDES.length}
          isLast={isLast}
          onPress={next}
        />
        {isLast ? (
          <Animated.View key="hint" entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)}>
            <View className="h-11 items-center justify-center px-8">
              <Text variant="bodyMuted" className="text-center text-sm">
                You’re all set. Tap the tick to sign in.
              </Text>
            </View>
          </Animated.View>
        ) : (
          <Animated.View key="skip" entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip introduction"
              onPress={skip}
              className="h-11 min-w-24 items-center justify-center px-4"
            >
              <Text className="font-sans-semibold text-accent-emphasis">Skip</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}
