import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import type { TokenManifest } from '../../src/tokens/manifest.ts'
import { alongside } from './alongside.ts'
import { DOCUMENTED_ELSEWHERE, DOCUMENTED_SUBPATHS } from './elsewhere.ts'
import { MANIFEST_FILE, buildManifest } from './manifest.ts'

const workspaceRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const packageDir = process.cwd()
const tokensFile = process.argv.includes('--tokens')
  ? fileURLToPath(new URL('../../src/tokens/tokens.json', import.meta.url))
  : undefined

// `--alongside <command>` reads the source while the command builds dist, and
// writes the manifest once it exits, so the command's clean can't delete it.
const alongsideIndex = process.argv.indexOf('--alongside')
const command =
  alongsideIndex === -1
    ? undefined
    : process.argv.slice(alongsideIndex + 1).join(' ')

let elapsed = 0
const outcome = await alongside(command, () => {
  const started = performance.now()
  const built = buildManifest({
    packageDir,
    workspaceRoot,
    documentedElsewhere: DOCUMENTED_ELSEWHERE,
    documentedSubpaths: DOCUMENTED_SUBPATHS,
    tokens: tokensFile
      ? (JSON.parse(readFileSync(tokensFile, 'utf8')) as TokenManifest).tokens
      : undefined
  })
  elapsed = performance.now() - started
  return built
})
if (!('result' in outcome)) process.exit(outcome.exitCode)
const manifest = outcome.result

const target = path.join(packageDir, 'dist', MANIFEST_FILE)
mkdirSync(path.dirname(target), { recursive: true })
const json = JSON.stringify(manifest)
writeFileSync(target, `${json}\n`)
console.log(
  `wrote ${path.relative(workspaceRoot, target)}: ${manifest.exports.length} exports, ` +
    `${manifest.components.length} components, ${manifest.deprecations.length} deprecations, ` +
    `${manifest.tokens?.length ?? 0} tokens, ${Math.round(json.length / 1024)} KB ` +
    `in ${Math.round(elapsed)} ms`
)
