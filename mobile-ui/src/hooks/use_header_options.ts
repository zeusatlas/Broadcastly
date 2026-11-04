import { useMemo } from 'react';

import { Colors, Fonts } from '@/constants/theme';
import { useThemeName } from '@/hooks/use_theme';

// Shared look of every native header (stack and tabs): plain background, centred Manrope title.
export function useHeaderOptions() {
  const palette = Colors[useThemeName()];

  return useMemo(
    () => ({
      headerTitleAlign: 'center' as const,
      headerShadowVisible: false,
      headerStyle: { backgroundColor: palette.background },
      headerTintColor: palette.foreground,
      headerTitleStyle: { fontFamily: Fonts.bold, fontSize: 17, color: palette.foreground },
    }),
    [palette],
  );
}

// Every stack (root pages and each tab's TabStack). The big title that hands over to the bar title
// on scroll is useCollapsingTitle in components/shared/CollapsingTitle.tsx.
export function useStackHeaderOptions() {
  const palette = Colors[useThemeName()];
  const base = useHeaderOptions();

  return useMemo(
    () => ({
      ...base,
      title: '',
      headerBackButtonDisplayMode: 'minimal' as const,
      // iOS 26 blurs content under the bar while scrolling, which keeps re-tinting the glass buttons.
      scrollEdgeEffects: { top: 'hidden' as const },
      contentStyle: { backgroundColor: palette.background },
    }),
    [base, palette],
  );
}
