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
  // scripts. tsdown 0.21.7's CSS pipeline (@tsdown/css) is incompatible with
  // this Node version, so SFCs carry NO `<style>` blocks — the Vue skin's
  // styles are hand-authored in src/cart-drawer/vue/style.css and copied
  // verbatim to dist/cart-drawer/vue/style.css (the package.json
  // `./cart-drawer/vue/style.css` export points there). Consumers import it
  // explicitly: `import '@oztix/roadie-widgets/cart-drawer/vue/style.css'`.
  plugins: [vue()],
  copy: [{ from: 'src/cart-drawer/vue/style.css', to: 'dist/cart-drawer/vue' }],
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
