import js from '@eslint/js'
import globals from 'globals'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettierConfig from 'eslint-config-prettier'

export default [
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
  },
  js.configs.recommended,
  {
    files: ['{src,test}/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      // Lazy require() is intentional for optional deps (Google Vision, Tesseract).
      '@typescript-eslint/no-require-imports': 'off',
      'no-case-declarations': 'off',
      // TypeScript already handles undefined variable checks; no-undef is for JS.
      'no-undef': 'off',
      // Regex strings in DTOs use character-class escapes that are harmless.
      'no-useless-escape': 'off',
      'prefer-const': 'warn',
    },
  },
  {
    files: ['test/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
  },
  prettierConfig,
]