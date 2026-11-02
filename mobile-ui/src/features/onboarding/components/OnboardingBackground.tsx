import { StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { useTheme } from '@/hooks/use_theme';
import { waveEdge, waveRegionFromTop } from '@/utils/helpers';

interface OnboardingBackgroundProps {
  width: number;
  height: number;
  panelHeight: number;
}

// Three flat tones: tinted top, card-coloured band, tinted bottom. Both edges slope up to the
// right and meet there, so the band tapers out. Each tint sits on its own opaque base: no overlap.
export function OnboardingBackground({
  width: w,
  height: h,
  panelHeight: p,
}: OnboardingBackgroundProps) {
  const theme = useTheme();
  // The gold edge sits well above the panel's end so the middle band dominates; the art may overlap it.
  const e = p - 80;
  const meetY = e - 72;

  const depth = 108;

  // The bottom edge is the same wave stretched downward from the meeting line, so it keeps the
  // bump, S-step and flat run, and joins the top on the right. -3 tucks it under to hide a seam.
  const stretch = (h * 0.32 + 72) / depth;
  const lower = waveEdge(w, (d) => meetY - 3 + d * depth * stretch);

  const top = waveRegionFromTop(w, (d) => meetY + d * depth);
  const bottom = `M0 ${h} V${lower.startY}${lower.curve} V${h} Z`;

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect width={w} height={h} fill={theme.card} />
      <Path d={bottom} fill={theme.background} />
      <Path d={bottom} fill={theme.primary} fillOpacity={0.08} />
      <Path d={top} fill={theme.background} />
      <Path d={top} fill={theme.accent} fillOpacity={0.24} />
    </Svg>
  );
}
