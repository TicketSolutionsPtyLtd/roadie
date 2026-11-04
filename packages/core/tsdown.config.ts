import { defineConfig } from 'tsdown'

import { skipUnchangedWrites } from '../../scripts/tsdown-watch.mjs'

export default defineConfig(({ watch }) => ({
  entry: {
    index: './src/index.ts',
    'colors/index': './src/colors/index.ts',
    'theme/index': './src/theme/index.ts',
    'utils/index': './src/utils/index.ts',
    'image/index': './src/image/index.ts',
    'datetime/index': './src/datetime/index.ts',
    'number/index': './src/number/index.ts',
    'dataviz/index': './src/dataviz/index.ts',
    'navigator/index': './src/navigator/index.ts',
    'dashboard/index': './src/dashboard/index.ts',
    'dashboard-layout/index': './src/dashboard-layout/index.ts',
    'records/index': './src/records/index.ts',
    'records/meilisearch/index': './src/records/meilisearch/index.ts',
    'records/elasticsearch/index': './src/records/elasticsearch/index.ts',
    'records/json-schema/index': './src/records/json-schema/index.ts'
  },
  format: ['esm'],
  minify: !watch,
  // The docs dev server reads only JS, so watch skips the declarations.
  dts: !watch && {
    compilerOptions: {
      composite: false,
      incremental: false
    }
  },
  clean: !watch,
  plugins: watch ? [skipUnchangedWrites()] : [],
  outExtensions: () => ({ js: '.js' })
}))
