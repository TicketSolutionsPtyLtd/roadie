import { defineConfig } from '@pandacss/dev'

import { roadie } from './src/presets'

export default defineConfig({
  presets: [roadie],
  lightningcss: true,
  // Where to look for your css declarations
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  // The framework to use for jsx
  jsxFramework: 'react',
  // Whether to use css reset
  preflight: true,
  // The output directory for your css system
  outdir: 'dist',
  outExtension: 'js',
  // Whether to clean the output directory before building
  clean: true
})
