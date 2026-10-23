import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { workerData } from 'node:worker_threads'

const { port, signal } = workerData
const designSystems = new Map()

function resolveFrom(dirs, candidates, accept = () => true) {
  for (const dir of dirs) {
    const require = createRequire(join(dir, 'noop.js'))
    for (const candidate of candidates) {
      try {
        const path = require.resolve(candidate)
        if (accept(path)) return path
      } catch {
        // The next candidate or folder may resolve.
      }
    }
  }
  throw new Error(`Can't resolve ${candidates[0]}`)
}

// require skips the style condition, so tailwindcss resolves to its JS entry.
const cssPath = (id, base, app) =>
  id.startsWith('.')
    ? join(base, id)
    : resolveFrom([base, app], [id, `${id}/index.css`, `${id}.css`], (path) =>
        path.endsWith('.css')
      )

// An app's pnpm store hides tailwindcss from Roadie's own folder, so each
// import resolves from the importing sheet, then from the app.
async function loadDesignSystem(stylesheet, app) {
  const require = createRequire(join(app, 'noop.js'))
  const tailwind = require(
    resolveFrom([app, dirname(stylesheet)], ['tailwindcss'])
  )
  const designSystem = await tailwind.__unstable__loadDesignSystem(
    readFileSync(stylesheet, 'utf8'),
    {
      base: dirname(stylesheet),
      async loadStylesheet(id, base) {
        const path = cssPath(id, base, app)
        return {
          path,
          base: dirname(path),
          content: readFileSync(path, 'utf8')
        }
      },
      async loadModule() {
        return { base: app, module: () => {} }
      }
    }
  )
  // Tailwind added canonical classes in 4.1.15.
  return designSystem.canonicalizeCandidates ? designSystem : null
}

async function canonical({ stylesheet, app, classes }) {
  if (!designSystems.has(stylesheet)) {
    designSystems.set(stylesheet, loadDesignSystem(stylesheet, app))
  }
  const designSystem = await designSystems.get(stylesheet)
  if (!designSystem) return null
  // One at a time: a batch comes back deduplicated, so it can't be zipped.
  return classes.map(
    (name) => designSystem.canonicalizeCandidates([name], { rem: 16 })[0]
  )
}

port.on('message', async (request) => {
  let reply
  try {
    reply = { result: await canonical(request) }
  } catch (error) {
    designSystems.delete(request.stylesheet)
    reply = { error: error.message }
  }
  port.postMessage(reply)
  Atomics.store(signal, 0, 1)
  Atomics.notify(signal, 0)
})
