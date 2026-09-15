import { writeFileSync } from 'node:fs'
import { registerHooks } from 'node:module'

// Node strips types but needs full specifiers; the source imports extensionless.
registerHooks({
  resolve: (specifier, context, next) =>
    specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)
      ? next(`${specifier}.ts`, context)
      : next(specifier, context)
})

const { renderPaneColumnsCss } =
  await import('../src/components/Pane/paneColumns.ts')

const target = new URL('../src/css/pane-columns.css', import.meta.url)
writeFileSync(target, renderPaneColumnsCss())
console.log(`wrote ${target.pathname}`)
