// eslint.config.js
//
// WHY THIS EXISTS. On 2026-08-04 every property page on oqupa.com showed
// "Algo salió mal" for about eighteen hours. A `const` had been replaced by a
// `useState` in the same position — which sits below the page's early returns.
// Legal for a variable, illegal for a hook: React counted a different number of
// hooks on the second render and threw #310 into the error boundary.
//
// 323 tests passed. The build passed. TypeScript cannot see hook order, and the
// project had no linter at all, so nothing in the pipeline could have caught it.
// `react-hooks/rules-of-hooks` catches it in under a second, which is the whole
// reason this file exists.
//
// SCOPE IS DELIBERATE. This is a guard, not a style overhaul. The hook rules are
// errors because they catch real crashes. Everything else that would force a
// sweep through working code is a warning — a lint step that floods the console
// on day one gets ignored, and an ignored guard is the same as no guard.
// Tighten later, on purpose, not by accident.

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'dev-dist/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // TypeScript already proves every identifier exists, and the rule
      // misfires on type-only names. Leaving it on would bury the hook errors
      // under noise, which is how a guard becomes wallpaper.
      'no-undef': 'off',

      // ---- The reason this file exists. Never downgrade these. ----
      // A violation is not a style opinion; it is a page that crashes for
      // every visitor the moment its loading state resolves.
      'react-hooks/rules-of-hooks': 'error',

      // A stale closure reading last render's value is a real bug, but the
      // existing code predates the rule, so it reports rather than blocks.
      // Worth clearing deliberately later.
      'react-hooks/exhaustive-deps': 'warn',

      // ---- Kept as warnings so the guard above can ship today ----
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-empty-object-type': 'warn',
    },
  },
  {
    // Tests legitimately do things application code should not: mock modules
    // before import, assert on `any`, and stub globals.
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Node scripts (access sync, seeding) run outside the browser.
    files: ['scripts/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-console': 'off',
    },
  },
  {
    // One-off Node campaign senders. CommonJS on purpose (see the NODE_PATH
    // trick in the email pipeline notes) — not application code, and not
    // something to modernise for the sake of a linter.
    files: ['**/*.cjs', 'email/**'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
    },
  },
)
