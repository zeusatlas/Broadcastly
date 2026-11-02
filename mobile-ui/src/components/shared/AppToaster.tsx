import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';
import { Toaster } from 'sonner-native';

import { Fonts } from '@/constants/theme';
import { useTheme, useThemeName } from '@/hooks/use_theme';

const ICON_SIZE = 22;

// The app's single toast host, styled with our tokens and the chunky card look (AGENTS §7).
// Show toasts through `notify` from @/lib/notify, never by importing sonner-native directly.
export function AppToaster() {
  const theme = useTheme();
  const scheme = useThemeName();

  return (
    <Toaster
      theme={scheme}
      position="top-center"
      duration={4000}
      visibleToasts={3}
      swipeToDismissDirection="up"
      icons={{
        success: <CircleCheck size={ICON_SIZE} color={theme.success} />,
        error: <CircleX size={ICON_SIZE} color={theme.destructive} />,
        warning: <TriangleAlert size={ICON_SIZE} color={theme.accentEmphasis} />,
        info: <Info size={ICON_SIZE} color={theme.primary} />,
        loading: <ActivityIndicator size="small" color={theme.mutedForeground} />,
      }}
      toastOptions={{
        style: {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth: 2,
          borderBottomWidth: 4,
          borderRadius: 16,
        },
        titleStyle: { color: theme.foreground, fontFamily: Fonts.bold, fontSize: 15 },
        descriptionStyle: { color: theme.mutedForeground, fontFamily: Fonts.regular, fontSize: 14 },
        success: { borderColor: theme.success },
        error: { borderColor: theme.destructive },
        warning: { borderColor: theme.accent },
      }}
    />
  );
}
