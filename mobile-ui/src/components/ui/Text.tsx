import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '@/utils/helpers';

export type TextVariant =
  'display' | 'title' | 'heading' | 'body' | 'bodyMuted' | 'caption' | 'label' | 'code';

const VARIANT_CLASS: Record<TextVariant, string> = {
  display: 'font-sans-extrabold text-3xl leading-tight text-foreground',
  title: 'font-sans-bold text-2xl text-foreground',
  heading: 'font-sans-semibold text-lg text-foreground',
  body: 'font-sans text-base text-foreground',
  bodyMuted: 'font-sans text-base text-muted-foreground',
  caption: 'font-sans text-xs text-muted-foreground',
  label: 'font-sans-medium text-sm text-foreground',
  code: 'font-mono text-xs text-muted-foreground',
};

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  className?: string;
};

export function Text({ variant = 'body', className, ...props }: TextProps) {
  return <RNText className={cn(VARIANT_CLASS[variant], className)} {...props} />;
}
