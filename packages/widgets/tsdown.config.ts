import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'tsdown'

export default defineConfig(({ watch }) => ({
  // Object entries (not array) so the key becomes the output path; otherwise
  // tsdown collapses to the common ancestor and drops the widget layer.
  entry: {
    'cart-drawer/core/index': 'src/cart-drawer/core/index.ts',
    'cart-drawer/react/index': 'src/cart-drawer/react/index.ts',
    'cart-drawer/vue/index': 'src/cart-drawer/vue/index.ts'
  },
  format: ['esm'],
  platform: 'neutral',
  plugins: [vue()],
  copy: [
    { from: 'src/cart-drawer/vue/motion.css', to: 'dist/cart-drawer/vue' }
  ],
  dts: {
    resolve: true,
    vue: true,
    compilerOptions: { composite: false, incremental: false }
  },
  sourcemap: true,
  clean: !watch,
  target: 'es2022',
  minify: true,
  shims: true,
  outDir: 'dist',
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: [
      'react',
      'react-dom',
      'vue',
      'motion',
      '@number-flow/react',
      '@number-flow/vue',
      'react-focus-lock',
      'focus-trap',
      '@oztix/roadie-core',
      '@oztix/roadie-components'
    ]
  }
}))
