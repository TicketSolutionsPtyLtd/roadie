import { writeFileSync } from 'node:fs'

import { renderPaneColumnsCss } from '../src/components/Pane/paneColumns.ts'

const target = new URL('../src/css/pane-columns.css', import.meta.url)
writeFileSync(target, renderPaneColumnsCss())
console.log(`wrote ${target.pathname}`)
