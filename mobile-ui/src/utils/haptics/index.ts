import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const { AndroidHaptics, ImpactFeedbackStyle, NotificationFeedbackType } = Haptics;

// Feedback is a nicety: never let a missing motor or unsupported platform (web) throw.
const fire = (ios: () => Promise<void>, android: Haptics.AndroidHaptics) => {
  if (Platform.OS === 'web') return;
  const run = Platform.OS === 'android' ? () => Haptics.performAndroidHapticsAsync(android) : ios;
  run().catch(() => {});
};

// Android uses the system haptic constants: expo's waveform fallback plays at 30–70/255 amplitude,
// which many phones barely render. They follow the phone's "Touch feedback" setting.
export const haptics = {
  tick: () => fire(() => Haptics.selectionAsync(), AndroidHaptics.Clock_Tick),
  tap: () => fire(() => Haptics.impactAsync(ImpactFeedbackStyle.Light), AndroidHaptics.Virtual_Key),
  // Tab presses: a click you can feel. Android's Virtual_Key is too faint on many phones.
  press: () =>
    fire(() => Haptics.impactAsync(ImpactFeedbackStyle.Medium), AndroidHaptics.Long_Press),
  step: () => fire(() => Haptics.impactAsync(ImpactFeedbackStyle.Heavy), AndroidHaptics.Long_Press),
  success: () =>
    fire(() => Haptics.notificationAsync(NotificationFeedbackType.Success), AndroidHaptics.Confirm),
  error: () =>
    fire(() => Haptics.notificationAsync(NotificationFeedbackType.Error), AndroidHaptics.Reject),
};
