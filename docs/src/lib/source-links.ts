import { readdirSync, statSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'

import {
  CHANGELOG_ROUTE,
  type ManifestJson,
  RELEASED_PACKAGES,
  SITE_PREFIX,
  readManifests
} from './releases'

export type PageComponent = {
  name: string
  packageName: string
  importPath: string
}

export type SourceContext = {
  /** Route → the repo path of its `page.mdx` or `page.tsx`. */
  pageFiles: Map<string, string>
  /** Route → the components whose docs are the page itself, not an anchor on it. */
  components: Map<string, PageComponent[]>
  /** Whether a repo path is a folder (`tree`), a file (`blob`), or missing. */
  kindOf: (path: string) => 'tree' | 'blob' | undefined
}

export function pageComponents(
  manifests: ManifestJson[]
): Map<string, PageComponent[]> {
  const components = new Map<string, PageComponent[]>()
  for (const manifest of manifests) {
    for (const { name, docs, import: importPath } of manifest.components ??
      []) {
      if (!manifest.package || !docs || !SITE_PREFIX.test(docs)) continue
      const page = docs.replace(SITE_PREFIX, '')
      if (page.includes('#')) continue
      const route = page.replace(/\/$/, '') || '/'
      components.set(route, [
        ...(components.get(route) ?? []),
        { name, packageName: manifest.package, importPath }
      ])
    }
  }
  return components
}

const pascal = (kebab: string) =>
  kebab.replace(/(?:^|-)(\w)/g, (_, letter: string) => letter.toUpperCase())

function folderCandidates({ name, packageName, importPath }: PageComponent) {
  const subpath = importPath.slice(packageName.length + 1).split('/')[0]
  const names = subpath ? [name, pascal(subpath), subpath] : [name]
  return names.flatMap((folder) => [
    `src/components/${folder}`,
    `src/${folder}`,
    `src/providers/${folder}.tsx`
  ])
}

function componentSource(components: PageComponent[], context: SourceContext) {
  for (const component of components) {
    const dir = RELEASED_PACKAGES.find(
      ({ name }) => name === component.packageName
    )?.dir
    if (!dir) continue
    for (const candidate of folderCandidates(component)) {
      const path = `packages/${dir}/${candidate}`
      const kind = context.kindOf(path)
      if (kind) return `${kind}/main/${path}`
    }
  }
  const dir = RELEASED_PACKAGES.find(
    ({ name }) => name === components[0]?.packageName
  )?.dir
  return dir ? `tree/main/packages/${dir}/src` : undefined
}

/** A page's sources on GitHub, relative to the repo URL: its own file, and the code it documents. */
export type SourceLink = { page?: string; code?: string }

export function sourcePath(
  route: string,
  context: SourceContext
): SourceLink | undefined {
  const components = context.components.get(route)
  const code = components?.length
    ? componentSource(components, context)
    : undefined
  const file = context.pageFiles.get(
    route.startsWith(`${CHANGELOG_ROUTE}/`)
      ? `${CHANGELOG_ROUTE}/[release]`
      : route
  )
  const page = file ? `blob/main/${file}` : undefined
  if (!page && !code) return undefined
  return { ...(page && { page }), ...(code && { code }) }
}

const ROOT = join(process.cwd(), '..')
const APP_DIR = join(process.cwd(), 'src/app')

function readPageFiles() {
  const files = new Map<string, string>()
  for (const file of readdirSync(APP_DIR, {
    recursive: true,
    encoding: 'utf8'
  })) {
    const path = file.split(sep).join('/')
    if (!/(^|\/)page\.(mdx|tsx)$/.test(path)) continue
    const dir = dirname(path)
    files.set(dir === '.' ? '/' : `/${dir}`, `docs/src/app/${path}`)
  }
  return files
}

function kindOf(path: string) {
  try {
    return statSync(join(ROOT, path)).isDirectory() ? 'tree' : 'blob'
  } catch {
    return undefined
  }
}

/** Route → its sources on GitHub, for every page and each release's page. */
export function getSourceLinks(
  releaseRoutes: string[]
): Record<string, SourceLink> {
  const pageFiles = readPageFiles()
  const context: SourceContext = {
    pageFiles,
    components: pageComponents(readManifests()),
    kindOf
  }
  const routes = [...pageFiles.keys()].filter(
    (route) => !/^\/(debug|examples)\/|\[/.test(route)
  )
  return Object.fromEntries(
    [...routes, ...releaseRoutes].flatMap((route) => {
      const path = sourcePath(route, context)
      return path ? [[route, path]] : []
    })
  )
}
