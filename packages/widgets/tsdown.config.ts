import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'tsdown'

export default defineConfig(({ watch }) => ({
  // Object entries so each widget keeps its own dist/<widget>/<skin> tree —
  // the key becomes the output path. Without this, tsdown would collapse to
  // the entries' common ancestor (src/cart-drawer) and drop the widget layer.
  entry: {
    'cart-drawer/core/index': 'src/cart-drawer/core/index.ts',
    'cart-drawer/react/index': 'src/cart-drawer/react/index.ts',
    'cart-drawer/vue/index': 'src/cart-drawer/vue/index.ts'
  },
  format: ['esm'],
  platform: 'neutral',
  // @vitejs/plugin-vue compiles the cart-drawer/vue/*.vue SFC templates +
  // scripts. The Vue skin emits raw Roadie/Tailwind utility classes that the
  // host app's Tailwind v4 + @oztix/roadie-core build compiles (the host
  // `@source`-scans dist/cart-drawer/vue) — so SFCs carry NO `<style>` blocks.
  // The only widget-owned CSS is the bespoke cart keyframes in
  // src/cart-drawer/vue/motion.css, copied verbatim to
  // dist/cart-drawer/vue/motion.css (the package.json
  // `./cart-drawer/vue/motion.css` export points there). Consumers import it
  // explicitly: `import '@oztix/roadie-widgets/cart-drawer/vue/motion.css'`.
  plugins: [vue()],
  copy: [
    { from: 'src/cart-drawer/vue/motion.css', to: 'dist/cart-drawer/vue' }
  ],
  dts: {
    resolve: true,
    // Generate .vue component .d.ts via vue-tsc (rolldown-plugin-dts support).
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
