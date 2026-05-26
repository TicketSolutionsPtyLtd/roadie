import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'tsdown'

export default defineConfig(({ watch }) => ({
  entry: ['src/core/index.ts', 'src/react/index.ts', 'src/vue/index.ts'],
  format: ['esm'],
  platform: 'neutral',
  // @vitejs/plugin-vue compiles the src/vue/*.vue SFC templates + scripts.
  // tsdown 0.21.7's CSS pipeline (@tsdown/css) is incompatible with this Node
  // version, so SFCs carry NO `<style>` blocks — the Vue skin's styles are
  // hand-authored in src/vue/style.css and copied verbatim to dist/vue/style.css
  // (the package.json `./vue/style.css` export points there). Consumers import
  // it explicitly: `import '@oztix/roadie-cart/vue/style.css'`.
  plugins: [vue()],
  copy: [{ from: 'src/vue/style.css', to: 'dist/vue' }],
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
      'react-focus-lock',
      'focus-trap',
      '@oztix/roadie-core',
      '@oztix/roadie-components'
    ]
  }
}))
