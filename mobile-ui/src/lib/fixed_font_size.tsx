import { forwardRef, type ComponentType } from 'react';

// Owner's rule: the app's own type sizes everywhere; the phone's text-size setting never applies.
// React Native has no global switch, so this swaps its Text and TextInput for versions that always
// pass allowFontScaling={false}. It runs once, first (see /index.ts), before any screen or library.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactNative = require('react-native') as Record<
  string,
  ComponentType<Record<string, unknown>>
>;

for (const name of ['Text', 'TextInput'] as const) {
  const Original = ReactNative[name];
  const Fixed = forwardRef<unknown, Record<string, unknown>>(function FixedFontSize(props, ref) {
    // JSX (not createElement) so NativeWind still turns className into styles.
    return <Original {...props} ref={ref} allowFontScaling={false} />;
  });
  // Keep static members libraries rely on (e.g. TextInput.State for the focused input).
  Object.assign(Fixed, Original, { displayName: name });
  Object.defineProperty(ReactNative, name, {
    configurable: true,
    enumerable: true,
    get: () => Fixed,
  });
}

export {};
