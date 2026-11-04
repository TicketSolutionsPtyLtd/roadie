import { readFile, stat } from 'fs/promises'
import { extname, join } from 'path'
import type { BrowserContext } from 'playwright'

export const ORIGIN = 'http://docs.test'

/** The docs' `basePath`, as the build that made `out` set it. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const OUT_DIR = join(import.meta.dirname, '../out')

const CORE_FONTS = join(import.meta.dirname, '../../packages/core/src/fonts')

/** The fonts `fonts.css` fetches from CDNs, by URL, as files on disk. */
const FONTS: Record<string, string> = {
  'https://assets.oztix.com.au/file/fbf8b8c2-3b29-4733-8ac4-43b079e3b8f0=Intermission.woff':
    join(CORE_FONTS, 'Intermission.woff2'),
  'https://assets.oztix.com.au/file/e5459e51-373b-4bbf-ad6f-07fbc6133409=Intermission-Italic.woff':
    join(CORE_FONTS, 'Intermission-Italic.woff2'),
  'https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-mono@latest/latin-400-normal.woff2':
    join(import.meta.dirname, 'fonts/ibm-plex-mono-latin-400-normal.woff2')
}

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

/** Stands in for every example image the docs load from a CDN. */
const STAND_IN_IMAGE = join(OUT_DIR, 'cart-demo-event.svg')

/**
 * Serves `docs/out` to the context without opening a port, with its CDN fonts
 * from disk and a local stand-in for CDN images. Nothing else reaches the
 * network: a request still in flight holds the load event, so one slow CDN
 * response timed out `page.goto`.
 */
export async function serveExport(context: BrowserContext) {
  await stat(join(OUT_DIR, 'index.html')).catch(() => {
    throw new Error('Run `pnpm --filter docs build` before the e2e tests')
  })
  await context.route(
    (url) => url.origin !== ORIGIN,
    async (route) => {
      const request = route.request()
      const font = FONTS[request.url()]
      if (font)
        return route.fulfill({
          body: await readFile(font),
          contentType: 'font/woff2'
        })
      if (request.resourceType() === 'image')
        return route.fulfill({ path: STAND_IN_IMAGE })
      return route.abort('blockedbyclient')
    }
  )
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
