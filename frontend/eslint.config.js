import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'node_modules',
      '.npm-cache',
      'playwright-report',
      'playwright-report-live',
      'test-results',
      'e2e',
      'e2e-live',
    ],
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      prettier,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        HTMLElement: 'readonly',
        KeyboardEvent: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        TextEncoder: 'readonly',
        history: 'readonly',
      },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Các export không phải component là chủ đích dùng chung (variants, factory).
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true, allowExportNames: ['buttonVariants', 'createQueryClient'] },
      ],
      // Các form trong dialog/drawer cần reset state khi mở lại; đây là chủ đích,
      // không phải đồng bộ với hệ thống ngoài.
      'react-hooks/set-state-in-effect': 'warn',
      // Dialog và trang đăng nhập chủ động đưa focus vào trường đầu tiên;
      // focus được đặt sau khi hộp thoại mở nên không cướp focus của người dùng.
      'jsx-a11y/no-autofocus': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/tests/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
)
