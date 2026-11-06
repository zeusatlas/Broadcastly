import { X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use_theme';

import { Text } from './Text';

export interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  title: string;
  description?: ReactNode;
  closeLabel?: string;
  // auto: hugs its content and scrolls when it is long. tall: a fixed 85% sheet for pickers whose
  // child is its own list (FlatList), which needs a bounded height to scroll.
  size?: 'auto' | 'tall';
  // Action buttons, pinned right under the content, never pushed away by empty space.
  footer?: ReactNode;
  children: ReactNode;
}

const OPEN_SPRING = { damping: 26, stiffness: 170, mass: 1 };
const FADE_MS = 300;
const CLOSE_MS = 260;

// The one bottom sheet: same corners, header, padding and motion everywhere. Motion is driven here,
// not by Modal or entering animations (which Android often skips): the backdrop fades while the
// panel springs up, and every way of closing slides it back down before the modal goes away.
export function BottomSheet({
  isVisible,
  onClose,
  onDismiss,
  title,
  description,
  closeLabel = 'Close',
  size = 'auto',
  footer,
  children,
}: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [isMounted, setIsMounted] = useState(isVisible);
  const backdrop = useSharedValue(0);
  const offset = useSharedValue(screenHeight);
  const isTall = size === 'tall';
  const panelRef = useRef<ComponentRef<typeof View>>(null);
  const [keyboardLift, setKeyboardLift] = useState(0);

  // Android: lift the panel by exactly what the keyboard covers (0 if the window already resized).
  useEffect(() => {
    if (Platform.OS !== 'android' || !isMounted) return;
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      panelRef.current?.measureInWindow((_x, y, _width, height) => {
        const overlap = y + height - event.endCoordinates.screenY;
        setKeyboardLift((current) => Math.max(0, current + overlap));
      });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardLift(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [isMounted]);

  // Mount as soon as the sheet is asked for; it unmounts only after its closing animation.
  if (isVisible && !isMounted) setIsMounted(true);

  const animateOut = useCallback(
    (done: () => void) => {
      backdrop.set(withTiming(0, { duration: CLOSE_MS }));
      offset.set(
        withTiming(
          screenHeight,
          { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(done)();
          },
        ),
      );
    },
    [backdrop, offset, screenHeight],
  );

  useEffect(() => {
    if (isVisible) {
      offset.set(screenHeight);
      backdrop.set(withTiming(1, { duration: FADE_MS }));
      offset.set(withSpring(0, OPEN_SPRING));
    } else {
      animateOut(() => setIsMounted(false));
    }
  }, [isVisible, animateOut, backdrop, offset, screenHeight]);

  const requestClose = () =>
    animateOut(() => {
      setIsMounted(false);
      onClose();
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }));
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={requestClose}
      onDismiss={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end">
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0 bg-backdrop/60"
            style={backdropStyle}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={requestClose}
            className="absolute inset-0"
          />
          <View
            ref={panelRef}
            style={{
              marginBottom: keyboardLift,
              ...(isTall ? { height: '85%' } : { maxHeight: '88%' }),
            }}
          >
            <Animated.View
              className="rounded-t-3xl bg-background px-5 pt-5"
              style={[
                {
                  ...(isTall ? { flex: 1 } : { maxHeight: '100%' }),
                  paddingBottom: insets.bottom + 12,
                },
                panelStyle,
              ]}
            >
              <View className="mb-4 flex-row items-start justify-between gap-4">
                <View className="flex-1 gap-0.5">
                  <Text variant="heading">{title}</Text>
                  {typeof description === 'string' ? (
                    <Text variant="caption">{description}</Text>
                  ) : (
                    description
                  )}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={closeLabel}
                  onPress={requestClose}
                  className="h-11 w-11 items-center justify-center rounded-full bg-muted active:opacity-70"
                >
                  <X size={20} color={theme.foreground} />
                </Pressable>
              </View>
              {isTall ? (
                <View className="flex-1">{children}</View>
              ) : (
                <ScrollView
                  style={{ flexGrow: 0 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {children}
                </ScrollView>
              )}
              {footer ? <View className="mt-4 gap-2">{footer}</View> : null}
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
