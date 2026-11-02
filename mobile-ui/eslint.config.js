// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  // Architecture guardrails. See AGENTS.md §6 and §9.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/lib/api/**',
      'src/lib/notify.ts',
      'src/components/shared/AppToaster.tsx',
      'src/utils/storage/**',
      'src/utils/crypto/**',
      'src/utils/haptics/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: 'Use `http` from @/lib/api.' },
            { name: 'expo-secure-store', message: 'Use `secureStorage` from @/utils/storage.' },
            { name: 'expo-crypto', message: 'Use helpers from @/utils/crypto.' },
            { name: 'expo-haptics', message: 'Use `haptics` from @/utils/haptics.' },
            { name: 'sonner-native', message: 'Use `notify` from @/lib/notify.' },
            {
              name: '@react-native-async-storage/async-storage',
              message: 'Unencrypted. Tokens and member data use `secureStorage` from @/utils/storage.',
            },
          ],
          patterns: [
            {
              group: ['@/features/*/*'],
              message: "Import from the feature's public API (@/features/<name>), not its internals.",
            },
            {
              group: ['**/api/*_api'],
              message: "Call endpoints through `api` from '@/lib/api/apiSlice', e.g. api.members.list().",
            },
          ],
        },
      ],
      'no-console': 'error',
      // Every request/response/props shape is an interface (AGENTS.md §4).
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    },
  },
  {
    files: ['src/lib/logger.ts'],
    rules: { 'no-console': 'off' },
  },
]);
