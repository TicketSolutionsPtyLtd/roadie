import { readFile, stat } from 'fs/promises'
import { extname, join } from 'path'
import type { BrowserContext } from 'playwright'

export const ORIGIN = 'http://docs.test'

/** The docs' `basePath`, as the build that made `out` set it. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const OUT_DIR = join(import.meta.dirname, '../out')

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.txt': 'text/x-component',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
}

async function fileFor(pathname: string) {
  const local = pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length)
    : pathname
  const path = join(OUT_DIR, decodeURIComponent(local))
  const isFile = await stat(path).then(
    (entry) => entry.isFile(),
    () => false
  )
  return isFile ? path : join(path, 'index.html')
}

/** Serves `docs/out` to the context without opening a port. */
export async function serveExport(context: BrowserContext) {
  await stat(join(OUT_DIR, 'index.html')).catch(() => {
    throw new Error('Run `pnpm --filter docs build` before the e2e tests')
  })
  await context.route(`${ORIGIN}/**`, async (route) => {
    const path = await fileFor(new URL(route.request().url()).pathname)
    try {
      await route.fulfill({
        body: await readFile(path),
        contentType: TYPES[extname(path)] ?? 'application/octet-stream'
      })
    } catch {
      await route.fulfill({ status: 404, body: 'Not found' })
    }
  })
}
