import { Search } from 'lucide-react-native';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

export interface SearchFieldProps extends TextInputProps {
  className?: string;
}

// A search box for lists. Forms use TextField, which always shows a label.
export function SearchField({ className, placeholder = 'Search', ...props }: SearchFieldProps) {
  const theme = useTheme();

  return (
    <View
      className={cn(
        'h-12 flex-row items-center gap-2 rounded-full border border-input bg-card px-4',
        className,
      )}
    >
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
  );
}
