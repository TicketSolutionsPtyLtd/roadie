// One subpath per component folder, since Server Components dot into a
// compound only through its own module (docs/solutions/rsc-patterns/compound-export-namespace.md).
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

function toKebab(pascal) {
  return pascal
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

function sourceFolders(dir, capitalOnly) {
  const first = capitalOnly ? /^[A-Z]/ : /^[A-Za-z]/
  return readdirSync(dir)
    .filter((name) => {
      const entry = join(dir, name)
      if (!statSync(entry).isDirectory() || !first.test(name)) return false
      return ['index.tsx', 'index.ts'].some((file) =>
        existsSync(join(entry, file))
      )
    })
    .sort()
}

export function generateExports(
  packageDir,
  { source, capitalOnly = false, exclude = [], before = {}, after = {} },
  output = console
) {
  const root =
    packageDir instanceof URL ? fileURLToPath(packageDir) : packageDir
  const dist = source.replace(/^src\b/, 'dist')
  const exports = { ...before }
  for (const folder of sourceFolders(join(root, source), capitalOnly)) {
    if (exclude.includes(folder)) continue
    exports[`./${toKebab(folder)}`] = {
      types: `./${dist}/${folder}/index.d.ts`,
      import: `./${dist}/${folder}/index.js`
    }
  }
  Object.assign(exports, after)

  const packageJson = join(root, 'package.json')
  const pkg = JSON.parse(readFileSync(packageJson, 'utf8'))
  pkg.exports = exports
  writeFileSync(packageJson, `${JSON.stringify(pkg, null, 2)}\n`)

  const subpaths = Object.keys(exports).filter((key) => key !== '.')
  output.log(
    `Regenerated ${subpaths.length} subpath exports in package.json:\n  ${subpaths.join('\n  ')}`
  )
}
