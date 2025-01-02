import { defineConfig } from '@pandacss/dev'

import { roadie } from '@oztix/roadie-core/presets'

export default defineConfig({
  presets: [roadie],
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  importMap: '@oztix/roadie-core',
  outdir: 'roadie-core',
  jsxFramework: 'react',
  outExtension: 'js'
})
