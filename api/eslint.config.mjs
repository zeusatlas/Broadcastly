import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      // Every request/response/entity shape is an interface (AGENTS.md §4).
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/modules/*/*', '!**/modules/*/index'],
              message: "Import another module only through its index.ts (e.g. '../auth').",
            },
          ],
        },
      ],
    },
  },
  {
    // Command-line helpers run in plain Node and talk to the terminal on purpose.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
    rules: { 'no-console': 'off' },
  },
  {
    // Inside a module, its own files import each other freely; unit tests may reach internals.
    files: ['src/modules/**/*.ts', 'tests/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
);
