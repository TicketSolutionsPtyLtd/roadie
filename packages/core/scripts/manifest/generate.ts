import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import type { TokenManifest } from '../../src/tokens/manifest.ts'
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
const alongside =
  alongsideIndex === -1
    ? undefined
    : runCommand(process.argv.slice(alongsideIndex + 1).join(' '))

function runCommand(command: string) {
  const child = spawn(command, { shell: true, stdio: 'inherit' })
  return new Promise<number>((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)))
  })
}

const started = performance.now()
let manifest
try {
  manifest = buildManifest({
    packageDir,
    workspaceRoot,
    documentedElsewhere: DOCUMENTED_ELSEWHERE,
    documentedSubpaths: DOCUMENTED_SUBPATHS,
    tokens: tokensFile
      ? (JSON.parse(readFileSync(tokensFile, 'utf8')) as TokenManifest).tokens
      : undefined
  })
} catch (error) {
  await alongside
  throw error
}
const elapsed = performance.now() - started

const exitCode = (await alongside) ?? 0
if (exitCode !== 0) process.exit(exitCode)

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
