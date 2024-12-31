import { roadie } from '@oztix/roadie-core/presets'
import { defineConfig } from '@pandacss/dev'

export default defineConfig({
  presets: [roadie],
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  importMap: '@oztix/roadie-core',
  outdir: 'roadie-core'
})
