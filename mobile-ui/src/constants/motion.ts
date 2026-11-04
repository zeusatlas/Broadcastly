import { Easing, FadeInDown } from 'react-native-reanimated';

// The one place for motion timing: change these and every page follows.
export const ENTER_DURATION = 420;
export const ROW_STAGGER = 40;
// Only the first rows animate, so long lists never queue up animations while scrolling.
const ANIMATED_ROWS = 12;

// Page content arrives with a short fade while rising 12pt. Reanimated honours Reduce Motion.
export const enterContent = (delay = 0) =>
  FadeInDown.delay(delay)
    .duration(ENTER_DURATION)
    .easing(Easing.out(Easing.cubic))
    .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });

export const enterRow = (index: number) =>
  index < ANIMATED_ROWS ? enterContent(80 + index * ROW_STAGGER) : undefined;
