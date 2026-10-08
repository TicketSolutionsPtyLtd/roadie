import { readFileSync } from 'node:fs'
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

export type BuildOptions = {
  packageDir: string
  workspaceRoot: string
  docsUrl?: string
  tokens?: TokenEntry[]
}

function importPath(packageName: string, subpath: string) {
  return subpath === '.' ? packageName : `${packageName}/${subpath.slice(2)}`
}

function withDocs(
  part: ManifestPart,
  parts: ManifestPart[],
  meta: { import: string; match?: PageMatch; docsUrl: string }
): ManifestComponent {
  const page = meta.match?.page
  const own = meta.match?.own ? page : undefined
  return {
    name: part.name,
    import: meta.import,
    ...(page && { docs: new URL(page.route.slice(1), meta.docsUrl).href }),
    ...(own?.status && { status: own.status }),
    ...(own?.description && { summary: own.description }),
    ...(part.description && { description: part.description }),
    ...(part.deprecated !== undefined && { deprecated: part.deprecated }),
    ...(own?.example && { example: own.example }),
    props: part.props,
    ...(parts.length > 0 && { parts })
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
  tokens
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
  const pages = readDocsPages(path.join(workspaceRoot, 'docs/src/app'))

  const exports: ManifestExport[] = []
  const components: ManifestComponent[] = []
  const deprecations: ManifestDeprecation[] = []
  const rootDeprecations: ManifestDeprecation[] = []
  const onSubpaths = new Set<string>()
  let rootValues = new Map<string, string>()

  const addComponents = (
    importName: string,
    componentDir: string,
    docs: ManifestPart[]
  ) => {
    for (const { root, parts } of groupCompounds(docs)) {
      components.push(
        withDocs(root, parts, {
          import: importName,
          match: pageForComponent(pages, root.name, componentDir),
          docsUrl
        })
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
      values: api.values,
      types: api.types
    })
    if (entry.subpath === '.') {
      rootValues = api.sources
      rootDeprecations.push(
        ...api.deprecated.map((d) => ({ import: importName, ...d }))
      )
      continue
    }
    for (const name of api.values) onSubpaths.add(name)
    for (const { export: name, reason } of api.deprecated) {
      deprecations.push({ import: importName, export: name, reason })
    }

    if (!entry.source.endsWith('.tsx')) continue

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
    const componentDir = path
      .relative(workspaceRoot, path.dirname(entry.source))
      .split(path.sep)
      .join('/')
    addComponents(importName, componentDir, docs)
  }

  const rootOnly = [...rootValues].filter(
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
