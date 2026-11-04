// Plugins only `tsdown --watch` uses, so a save rebuilds and rewrites only what
// it changed. A build never loads them, so they can't change what ships.
// It lives outside packages/core because Tailwind reads every word in that
// package as a possible class.

/**
 * Reuses a plugin's last result for each file until the file's code changes.
 * It wraps the handler in place, since a plugin may set its filter on that
 * object after this runs.
 *
 * @param {import('rolldown').Plugin | Promise<import('rolldown').Plugin>} pending
 */
export async function cacheTransforms(pending) {
  const plugin = await pending
  const hook = plugin.transform
  if (!hook || typeof hook === 'function') return plugin
  const { handler } = hook
  const cache = new Map()
  hook.handler = async function (code, id, meta) {
    const hit = cache.get(id)
    if (hit?.code === code) return hit.result
    const result = await handler.call(this, code, id, meta)
    cache.set(id, { code, result })
    return result
  }
  return plugin
}

/**
 * Leaves an output on disk when a rebuild emits it unchanged, so the docs dev
 * server only reloads the modules a save touched.
 *
 * @returns {import('rolldown').Plugin}
 */
export function skipUnchangedWrites() {
  const written = new Map()
  return {
    name: 'roadie:skip-unchanged-writes',
    generateBundle(_options, bundle) {
      for (const [fileName, output] of Object.entries(bundle)) {
        const content =
          output.type === 'chunk'
            ? output.code + (output.map?.toString() ?? '')
            : typeof output.source === 'string'
              ? output.source
              : Buffer.from(output.source).toString('base64')
        if (written.get(fileName) === content) delete bundle[fileName]
        else written.set(fileName, content)
      }
    }
  }
}
