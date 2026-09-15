import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const { parseTokenManifest, sheetOrder } =
  await import('../src/tokens/manifest.ts')

const css = new URL('../src/css/', import.meta.url)
const read = (file) => readFileSync(new URL(file, css), 'utf8')
const sheets = sheetOrder(read('roadie.css')).map((file) => [file, read(file)])
const tailwindTheme = readFileSync(
  createRequire(import.meta.url).resolve('tailwindcss/theme.css'),
  'utf8'
)

const target = new URL('../src/tokens/tokens.json', import.meta.url)
const manifest = parseTokenManifest(sheets, tailwindTheme)
writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`wrote ${manifest.tokens.length} tokens to ${target.pathname}`)
