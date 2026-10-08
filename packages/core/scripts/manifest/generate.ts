import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import type { TokenManifest } from '../../src/tokens/manifest.ts'
import { MANIFEST_FILE, buildManifest } from './manifest.ts'

const workspaceRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const packageDir = process.cwd()
const tokensFile = process.argv.includes('--tokens')
  ? fileURLToPath(new URL('../../src/tokens/tokens.json', import.meta.url))
  : undefined

const started = performance.now()
const manifest = buildManifest({
  packageDir,
  workspaceRoot,
  tokens: tokensFile
    ? (JSON.parse(readFileSync(tokensFile, 'utf8')) as TokenManifest).tokens
    : undefined
})

const target = path.join(packageDir, 'dist', MANIFEST_FILE)
mkdirSync(path.dirname(target), { recursive: true })
const json = JSON.stringify(manifest)
writeFileSync(target, `${json}\n`)
console.log(
  `wrote ${path.relative(workspaceRoot, target)}: ${manifest.exports.length} exports, ` +
    `${manifest.components.length} components, ${manifest.deprecations.length} deprecations, ` +
    `${manifest.tokens?.length ?? 0} tokens, ${Math.round(json.length / 1024)} KB ` +
    `in ${Math.round(performance.now() - started)} ms`
)
