/**
 * Colours are defined in src/global.css, not here. This file only maps them to
 * utility names. `<alpha-value>` is what makes `bg-primary/10` work.
 *
 * @type {import('tailwindcss').Config}
 */
const withAlpha = (token) => `hsl(var(--${token}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/features/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Each weight is a separate registered family — React Native cannot derive
      // a bold face from a regular one, so fontWeight utilities will not work.
      fontFamily: {
        sans: ['Manrope_400Regular'],
        'sans-medium': ['Manrope_500Medium'],
        'sans-semibold': ['Manrope_600SemiBold'],
        'sans-bold': ['Manrope_700Bold'],
        'sans-extrabold': ['Manrope_800ExtraBold'],
      },
      colors: {
        background: withAlpha('background'),
        foreground: withAlpha('foreground'),
        card: {
          DEFAULT: withAlpha('card'),
          foreground: withAlpha('card-foreground'),
        },
        popover: {
          DEFAULT: withAlpha('popover'),
          foreground: withAlpha('popover-foreground'),
        },
        muted: {
          DEFAULT: withAlpha('muted'),
          foreground: withAlpha('muted-foreground'),
        },
        primary: {
          DEFAULT: withAlpha('primary'),
          foreground: withAlpha('primary-foreground'),
        },
        secondary: {
          DEFAULT: withAlpha('secondary'),
          foreground: withAlpha('secondary-foreground'),
        },
        accent: {
          DEFAULT: withAlpha('accent'),
          foreground: withAlpha('accent-foreground'),
          emphasis: withAlpha('accent-emphasis'),
        },
        critical: {
          DEFAULT: withAlpha('critical'),
          foreground: withAlpha('critical-foreground'),
        },
        success: {
          DEFAULT: withAlpha('success'),
          foreground: withAlpha('success-foreground'),
        },
        warning: {
          DEFAULT: withAlpha('warning'),
          foreground: withAlpha('warning-foreground'),
        },
        destructive: {
          DEFAULT: withAlpha('destructive'),
          foreground: withAlpha('destructive-foreground'),
        },
        border: withAlpha('border'),
        input: withAlpha('input'),
        ring: withAlpha('ring'),
        backdrop: withAlpha('backdrop'),
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
      },
    },
  },
  plugins: [],
};
