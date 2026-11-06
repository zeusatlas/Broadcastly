import { Image, View, type StyleProp, type ViewStyle } from 'react-native';

import { deviceUrl } from '@/config/env';

import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/helpers';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<AvatarSize, { box: string; text: string }> = {
  sm: { box: 'h-11 w-11', text: 'text-sm' },
  md: { box: 'h-14 w-14', text: 'text-lg' },
  lg: { box: 'h-24 w-24', text: 'text-3xl' },
  xl: { box: 'h-28 w-28', text: 'text-4xl' },
};

export interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: AvatarSize;
  className?: string;
  // For an exact size, e.g. to line up with header buttons.
  style?: StyleProp<ViewStyle>;
}

// 'Ama Serwaa Mensah' → 'AM' (first and last name).
export const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => part[0]?.toUpperCase() ?? '').join('');
};

export function Avatar({ name, imageUrl, size = 'md', className, style }: AvatarProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // No ring or fill behind a picture: only initials sit on a coloured disc.
      className={cn(
        'items-center justify-center overflow-hidden rounded-full',
        imageUrl ? 'bg-transparent' : 'bg-secondary',
        SIZE[size].box,
        className,
      )}
      style={style}
    >
      {imageUrl ? (
        <Image
          source={{ uri: deviceUrl(imageUrl) ?? undefined }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: 999 }}
        />
      ) : (
        <Text className={cn('font-sans-extrabold text-secondary-foreground', SIZE[size].text)}>
          {initialsOf(name)}
        </Text>
      )}
    </View>
  );
}
