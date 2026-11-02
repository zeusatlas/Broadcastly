import { Landmark } from 'lucide-react-native';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { waveRegionFromTop } from '@/utils/helpers';

const BRAND_HEIGHT = 240;
const BAND = 34;
const DEPTH = 92;

// Brand header and two softer bands, all on the onboarding wave. Each band dips a little deeper,
// as the onboarding bottom edge does, so the layers fan out instead of running parallel.
export function AuthHeader() {
  const theme = useTheme();
  const { width: w } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const brandBottom = insets.top + BRAND_HEIGHT;
  const height = brandBottom + BAND * 2;

  // Each edge's lowest point (left) sits at `bottom`; its highest (right) sits `depth` above it.
  const layer = (bottom: number, depth: number) =>
    waveRegionFromTop(w, (d) => bottom - depth + d * depth);

  return (
    <View style={{ height }}>
      <Svg width={w} height={height} style={{ position: 'absolute' }}>
        <Path d={layer(brandBottom + BAND * 2, DEPTH * 1.4)} fill={theme.background} />
        <Path d={layer(brandBottom + BAND, DEPTH * 1.2)} fill={theme.muted} />
        <Path d={layer(brandBottom, DEPTH)} fill={theme.primary} />
      </Svg>

      <View
        style={{ paddingTop: insets.top, height: brandBottom - DEPTH }}
        className="items-center justify-center gap-2"
      >
        <Landmark size={36} color={theme.primaryForeground} />
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
          className="px-6 font-sans-extrabold text-3xl text-primary-foreground"
        >
          Broadcastly
        </Text>
      </View>
    </View>
  );
}
