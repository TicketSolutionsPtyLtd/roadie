import { defineConfig } from '@pandacss/dev'

import { roadie } from '@oztix/roadie-core/presets'

export default defineConfig({
  presets: [roadie],
  importMap: '@oztix/roadie-core',
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  exclude: [],
  emitPackage: false
})
