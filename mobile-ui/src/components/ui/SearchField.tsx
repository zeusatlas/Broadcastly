import { Search } from 'lucide-react-native';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import { GlassSurface } from './GlassSurface';

export interface SearchFieldProps extends TextInputProps {
  className?: string;
}

// A search box for lists, on Liquid Glass with no outline. Forms use TextField, which shows a label.
export function SearchField({ className, placeholder = 'Search', ...props }: SearchFieldProps) {
  const theme = useTheme();

  return (
    <View className={cn('h-12 overflow-hidden rounded-full', className)}>
      <GlassSurface style={{ position: 'absolute', inset: 0, borderWidth: 0, borderRadius: 999 }} />
      <View className="flex-1 flex-row items-center gap-2 px-4">
        <Search size={18} color={theme.mutedForeground} />
        <TextInput
          accessibilityLabel={placeholder}
          placeholder={placeholder}
          placeholderTextColor={theme.mutedForeground}
          returnKeyType="search"
          autoCorrect={false}
          className="flex-1 font-sans text-base text-foreground"
          {...props}
        />
      </View>
    </View>
  );
}
