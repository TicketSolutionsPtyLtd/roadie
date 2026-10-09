import GithubSlugger from 'github-slugger'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import type { TokenEntry } from '../../src/tokens/manifest.ts'
import {
  type ManifestPart,
  componentFiles,
  createDocgenParser,
  readComponents,
  readFileComponents
} from './components.ts'
import { type PageMatch, pageForComponent, readDocsPages } from './docs.ts'
import {
  type ExportTarget,
  createProgram,
  exportEntries,
  moduleExports
} from './exports.ts'

export const MANIFEST_FILE = 'roadie.manifest.json'
export const DOCS_URL = 'https://ticketsolutionsptyltd.github.io/roadie/'
export const SCHEMA_VERSION = 1

export type ManifestExport = {
  subpath: string
  import: string
  kind: 'js' | 'css' | 'json'
  values?: string[]
  types?: string[]
}

export type ManifestComponent = ManifestPart & {
  import: string
  docs?: string
  status?: string
  summary?: string
  example?: string
  parts?: ManifestPart[]
}

export type ManifestDeprecation = {
  import: string
  export: string
  prop?: string
  reason: string
}

export type RoadieManifest = {
  schemaVersion: typeof SCHEMA_VERSION
  package: string
  version: string
  docs: string
  exports: ManifestExport[]
  components: ManifestComponent[]
  deprecations: ManifestDeprecation[]
  tokens?: TokenEntry[]
}

type PackageJson = {
  name: string
  version: string
  homepage: string
  exports: Record<string, ExportTarget>
}

/**
 * Docs routes for components no page claims through `componentPath`, keyed by
 * import path: one route for every such component on that import, or a route
 * per component name.
 */
export type DocumentedElsewhere = Record<
  string,
  string | Record<string, string>
>

export type BuildOptions = {
  packageDir: string
  workspaceRoot: string
  docsUrl?: string
  tokens?: TokenEntry[]
  documentedElsewhere?: DocumentedElsewhere
}

function importPath(packageName: string, subpath: string) {
  return subpath === '.' ? packageName : `${packageName}/${subpath.slice(2)}`
}

function withDocs(
  part: ManifestPart,
  parts: ManifestPart[],
  meta: { import: string; match?: PageMatch; route?: string; docsUrl: string }
): ManifestComponent {
  const page = meta.match?.page
  const own = meta.match?.own ? page : undefined
  const route = page?.route ?? meta.route
  return {
    name: part.name,
    import: meta.import,
    ...(route && { docs: new URL(route.slice(1), meta.docsUrl).href }),
    ...(own?.status && { status: own.status }),
    ...(own?.description && { summary: own.description }),
    ...(part.description && { description: part.description }),
    ...(part.deprecated !== undefined && { deprecated: part.deprecated }),
    ...(own?.example && { example: own.example }),
    props: part.props,
    ...(parts.length > 0 && { parts })
  }
}

const FENCE = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm
const HEADING = /^#{1,6}[ \t]+(.+?)[ \t]*$/gm
const LINK = /\[([^\]]*)\]\([^)]*\)/g

// rehype-slug's ids: github-slugger over each heading's text, in page order.
function headingSlugs(mdx: string) {
  const slugger = new GithubSlugger()
  return Array.from(mdx.replace(FENCE, '').matchAll(HEADING), ([, heading]) =>
    slugger.slug(heading!.replace(LINK, '$1'))
  )
}

function checkRoute(appDir: string, route: string) {
  const [pathname, anchor] = route.split('#')
  const dir = path.join(appDir, pathname!)
  const page = ['page.mdx', 'page.tsx']
    .map((file) => path.join(dir, file))
    .find((file) => existsSync(file))
  if (!page) throw new Error(`No docs page at ${pathname}`)
  if (anchor === undefined) return
  if (!headingSlugs(readFileSync(page, 'utf8')).includes(anchor)) {
    throw new Error(`No heading #${anchor} on ${pathname}`)
  }
}

function groupCompounds(docs: ManifestPart[]) {
  const roots = docs.filter((doc) => !doc.name.includes('.'))
  return roots.map((root) => ({
    root,
    parts: docs.filter((doc) => doc.name.startsWith(`${root.name}.`))
  }))
}

export function buildManifest({
  packageDir,
  workspaceRoot,
  docsUrl = DOCS_URL,
  tokens,
  documentedElsewhere = {}
}: BuildOptions): RoadieManifest {
  const pkg = JSON.parse(
    readFileSync(path.join(packageDir, 'package.json'), 'utf8')
  ) as PackageJson
  const entries = exportEntries(pkg.exports, packageDir)
  const sources = entries.flatMap((entry) => entry.source ?? [])
  const program = createProgram(
    [...new Set([...sources, ...sources.flatMap(componentFiles)])],
    path.join(workspaceRoot, 'tsconfig.react.json')
  )
  const parser = createDocgenParser(program)
  const appDir = path.join(workspaceRoot, 'docs/src/app')
  const pages = readDocsPages(appDir)
  const linksUsed = new Set<string>()

  const exports: ManifestExport[] = []
  const components: ManifestComponent[] = []
  const deprecations: ManifestDeprecation[] = []
  const rootDeprecations: ManifestDeprecation[] = []
  const onSubpaths = new Set<string>()
  let rootComponents = new Map<string, string>()

  const addComponents = (
    importName: string,
    componentDir: string,
    docs: ManifestPart[]
  ) => {
    for (const { root, parts } of groupCompounds(docs)) {
      const match = pageForComponent(pages, root.name, componentDir)
      const links = documentedElsewhere[importName]
      const route = match
        ? undefined
        : typeof links === 'string'
          ? links
          : links?.[root.name]
      if (route) {
        checkRoute(appDir, route)
        linksUsed.add(
          typeof links === 'string' ? importName : `${importName} ${root.name}`
        )
      }
      components.push(
        withDocs(root, parts, { import: importName, match, route, docsUrl })
      )
      for (const part of [root, ...parts]) {
        for (const prop of part.props) {
          if (prop.deprecated === undefined) continue
          deprecations.push({
            import: importName,
            export: part.name,
            prop: prop.name,
            reason: prop.deprecated
          })
        }
      }
    }
  }

  for (const entry of entries) {
    const importName = importPath(pkg.name, entry.subpath)
    if (!entry.source) {
      exports.push({
        subpath: entry.subpath,
        import: importName,
        kind: entry.kind
      })
      continue
    }

    const api = moduleExports(program, entry.source)
    exports.push({
      subpath: entry.subpath,
      import: importName,
      kind: entry.kind,
      ...(api.values.length > 0 && { values: api.values }),
      ...(api.types.length > 0 && { types: api.types })
    })
    if (entry.subpath === '.') {
      rootComponents = api.components
      rootDeprecations.push(
        ...api.deprecated.map((d) => ({ import: importName, ...d }))
      )
      continue
    }
    for (const name of api.values) onSubpaths.add(name)
    for (const { export: name, reason } of api.deprecated) {
      deprecations.push({ import: importName, export: name, reason })
    }

    const componentDir = path
      .relative(workspaceRoot, path.dirname(entry.source))
      .split(path.sep)
      .join('/')
    if (entry.source.endsWith('.tsx')) {
      const docs = readComponents(
        parser,
        program,
        entry.source,
        new Set(api.values)
      )
      if (docs.length === 0) {
        throw new Error(
          `${importName} is a .tsx entry but react-docgen-typescript found no exported components in it`
        )
      }
      addComponents(importName, componentDir, docs)
      continue
    }

    const reExported = [...api.components].filter(([, file]) =>
      file.endsWith('.tsx')
    )
    if (reExported.length > 0) {
      addComponents(
        importName,
        componentDir,
        readFileComponents(
          parser,
          program,
          [...new Set(reExported.map(([, file]) => file))],
          new Set(reExported.map(([name]) => name))
        )
      )
    }
  }

  const rootOnly = [...rootComponents].filter(
    ([name, file]) => !onSubpaths.has(name) && file.endsWith('.tsx')
  )
  if (rootOnly.length > 0) {
    addComponents(
      pkg.name,
      '',
      readFileComponents(
        parser,
        program,
        [...new Set(rootOnly.map(([, file]) => file))],
        new Set(rootOnly.map(([name]) => name))
      )
    )
  }

  const undocumented = components
    .filter((component) => !component.docs)
    .map((component) => `${component.import} ${component.name}`)
  if (undocumented.length > 0) {
    throw new Error(
      `No docs page for ${undocumented.join(', ')}. Give it a page, or link where it's documented in scripts/manifest/elsewhere.ts.`
    )
  }
  const unused = Object.entries(documentedElsewhere)
    .filter(
      ([importName]) =>
        importName === pkg.name || importName.startsWith(`${pkg.name}/`)
    )
    .flatMap(([importName, links]) =>
      typeof links === 'string'
        ? [importName]
        : Object.keys(links).map((name) => `${importName} ${name}`)
    )
    .filter((link) => !linksUsed.has(link))
  if (unused.length > 0) {
    throw new Error(
      `documentedElsewhere: ${unused.join(', ')} links no component without a page of its own`
    )
  }

  deprecations.unshift(
    ...rootDeprecations.filter((d) => !onSubpaths.has(d.export))
  )

  return {
    schemaVersion: SCHEMA_VERSION,
    package: pkg.name,
    version: pkg.version,
    docs: pkg.homepage,
    exports,
    components,
    deprecations,
    ...(tokens && { tokens })
  }
}
