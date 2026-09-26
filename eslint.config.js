/**
 * ESLint flat config.
 *
 * Layered by what each part can actually verify:
 *  - `@eslint/js` recommended — general correctness, applies everywhere.
 *  - `typescript-eslint` strict + stylistic — non-type-aware rules, apply to
 *    every `.ts`/`.tsx` file.
 *  - `typescript-eslint` strictTypeChecked — the type-aware rules
 *    (`no-floating-promises`, `no-unsafe-*`, `no-misused-promises`). These need
 *    a `tsconfig` program, so they are scoped to the files that are members of
 *    one. Applying them to untyped JS makes the whole run fail.
 *  - `react-hooks` + `jsx-a11y` — hook dependency correctness and the
 *    accessibility contract this app is graded on.
 *
 * The type-aware rules are the ones that would have caught the original app's
 * defects: `fetchMovies()` was called without `await` or `.catch`, producing an
 * unhandled rejection and a permanently blank page.
 */

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

/** Files covered by `tsconfig.app.json` (application *and* tests). */
const APP_SOURCES = ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'];

/** Files covered by `tsconfig.node.json`. */
const NODE_SOURCES = ['vite.config.ts', 'vitest.config.ts'];

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'public/**'],
  },

  js.configs.recommended,

  // Non-type-aware rules: safe to apply to every TypeScript file.
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,

      // The brief is explicit: no `any` anywhere.
      '@typescript-eslint/no-explicit-any': 'error',

      // Consistent `import type` keeps type-only imports out of the bundle.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
    },
  },

  // Type-aware rules, scoped to files that belong to a tsconfig program.
  {
    files: [...APP_SOURCES, ...NODE_SOURCES],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Floating promises are exactly the bug class the original app shipped.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      // Numbers in template literals are idiomatic and unambiguous
      // (`/t/p/w${342}${path}`); demanding String() everywhere is noise.
      // Booleans and nullish values stay flagged — those are the cases that
      // actually leak "undefined" into the output.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: false, allowNullish: false },
      ],

      // `onClick={() => doThing()}` is the normal React idiom; the rule still
      // catches the genuinely confusing case of returning a void expression
      // from a value position.
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreArrowShorthand: true },
      ],
    },
  },

  {
    // Test files: fixtures are intentionally loose, and `() => {}` is the
    // correct way to supply a required-but-irrelevant callback prop.
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  {
    // Plain JS tooling: no tsconfig program, so no type-aware rules.
    files: ['**/*.mjs', 'eslint.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
