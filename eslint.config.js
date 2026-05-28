import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// Scoped to the published library (`src/`). The mcp/ package, the playground,
// dev-only generator scripts, and the generated font blob lint separately or
// not at all. `eslint-config-prettier` is last so formatting is owned by
// Prettier, not lint rules.
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'playground/**',
      'mcp/**',
      'scripts/**',
      'gallery/**',
      'nl-examples/**',
      'src/assets/fonts.ts',
      '**/*.snap',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettier],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // The library leans on `any` in a few deliberate spots (the AutoChart
      // component registry, intentional bad-input casts in tests). Surface them
      // as warnings rather than failing the build.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Honor the `_`-prefix convention for intentionally-unused bindings.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      // `interface X extends Required<Y> {}` is an intentional way to name a
      // resolved/composed type (ResolvedBrandLogo, etc.).
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
    },
  },
);
