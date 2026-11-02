import { Colors, type ThemeName } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use_color_scheme';

export function useThemeName(): ThemeName {
  const { colorScheme } = useColorScheme();

  return colorScheme === 'dark' ? 'dark' : 'light';
}

// For imperative APIs only (navigation options, SVG props, ActivityIndicator). Prefer className.
export function useTheme() {
  return Colors[useThemeName()];
}
