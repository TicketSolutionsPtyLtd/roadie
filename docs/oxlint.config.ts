import { type OxlintOverride, defineConfig } from 'oxlint'

import recommended from '@oztix/roadie-lint-plugin/oxlint/recommended.json' with { type: 'json' }
import testing from '@oztix/roadie-lint-plugin/oxlint/testing.json' with { type: 'json' }

// MDX and its live fences lint with ESLint (eslint.config.js).
export default defineConfig({
  plugins: ['nextjs', 'react', 'import', 'jsx-a11y'],
  jsPlugins: [{ name: 'roadie', specifier: '../eslint/roadie-plugin.js' }],
  categories: { correctness: 'off' },
  env: { builtin: true },
  // Options are root-only, and this config is nested when oxlint runs from the
  // repo root, so the lint script sets the unused-directive severity instead.
  settings: {
    'react-hooks': { additionalEffectHooks: '^useIsomorphicLayoutEffect$' }
  },
  ignorePatterns: ['**/roadie-core/**', '.next/**', 'out/**', 'next-env.d.ts'],
  rules: {
    'nextjs/google-font-display': 'warn',
    'nextjs/google-font-preconnect': 'warn',
    'nextjs/inline-script-id': 'error',
    'nextjs/next-script-for-ga': 'warn',
    'nextjs/no-assign-module-variable': 'error',
    'nextjs/no-async-client-component': 'warn',
    'nextjs/no-before-interactive-script-outside-document': 'warn',
    'nextjs/no-css-tags': 'warn',
    'nextjs/no-document-import-in-page': 'error',
    'nextjs/no-duplicate-head': 'error',
    'nextjs/no-head-element': 'warn',
    'nextjs/no-head-import-in-document': 'error',
    'nextjs/no-html-link-for-pages': 'error',
    'nextjs/no-img-element': 'warn',
    'nextjs/no-page-custom-font': 'warn',
    'nextjs/no-script-component-in-head': 'error',
    'nextjs/no-styled-jsx-in-document': 'warn',
    'nextjs/no-sync-scripts': 'error',
    'nextjs/no-title-in-document-head': 'warn',
    'nextjs/no-typos': 'warn',
    'nextjs/no-unwanted-polyfillio': 'warn',
    'import/no-anonymous-default-export': 'warn',
    'jsx-a11y/alt-text': ['warn', { elements: ['img'], img: ['Image'] }],
    'jsx-a11y/aria-props': 'warn',
    'jsx-a11y/aria-proptypes': 'warn',
    'jsx-a11y/aria-unsupported-elements': 'warn',
    'jsx-a11y/role-has-required-aria-props': 'warn',
    'jsx-a11y/role-supports-aria-props': 'warn',
    'react/display-name': 'error',
    'react/jsx-key': 'error',
    'react/jsx-no-comment-textnodes': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-undef': 'error',
    'react/no-children-prop': 'error',
    'react/no-danger-with-children': 'error',
    'react/no-direct-mutation-state': 'error',
    'react/no-find-dom-node': 'error',
    'react/no-is-mounted': 'error',
    'react/no-render-return-value': 'error',
    'react/no-string-refs': 'error',
    'react/no-unescaped-entities': 'error',
    'react/require-render-return': 'error',
    'react/rules-of-hooks': 'error',
    'react/exhaustive-deps': [
      'warn',
      { additionalHooks: '^useIsomorphicLayoutEffect$' }
    ],
    'react/static-components': 'error',
    'react/use-memo': 'error',
    'react/void-use-memo': 'error',
    'react/preserve-manual-memoization': 'error',
    'react/incompatible-library': 'warn',
    'react/immutability': 'error',
    'react/globals': 'error',
    'react/refs': 'error',
    'react/set-state-in-effect': 'error',
    'react/error-boundaries': 'error',
    'react/purity': 'error',
    'react/set-state-in-render': 'error',
    'react/unsupported-syntax': 'warn'
  },
  overrides: [
    {
      // The docs app is a Roadie consumer whose code readers copy.
      files: ['src/**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
      rules: recommended.rules as OxlintOverride['rules']
    },
    ...(testing.overrides as OxlintOverride[])
  ]
})
