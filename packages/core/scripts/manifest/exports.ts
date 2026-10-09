import { existsSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

import { unwrap } from './text.ts'

export type ExportTarget = string | { [condition: string]: string }

export type Entry = {
  subpath: string
  target: string
  kind: 'js' | 'css' | 'json'
  source?: string
}

export type Deprecation = { export: string; reason: string }

export type ModuleExports = {
  values: string[]
  components: Map<string, string>
  types: string[]
  deprecated: Deprecation[]
}

const SOURCE_EXTENSIONS = ['.tsx', '.ts']

function targetOf(value: ExportTarget) {
  if (typeof value === 'string') return value
  return (
    value.import ?? value.default ?? value.style ?? Object.values(value)[0]!
  )
}

export function sourceFor(target: string, packageDir: string) {
  const stem = target.replace(/^\.\/dist\//, 'src/').replace(/\.js$/, '')
  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = path.join(packageDir, stem + extension)
    if (existsSync(candidate)) return candidate
  }
  throw new Error(`No source for export target ${target} in ${packageDir}`)
}

export function exportEntries(
  exports: Record<string, ExportTarget>,
  packageDir: string
): Entry[] {
  return Object.entries(exports).map(([subpath, value]) => {
    const target = targetOf(value)
    if (target.endsWith('.css')) return { subpath, target, kind: 'css' }
    if (target.endsWith('.json')) return { subpath, target, kind: 'json' }
    return {
      subpath,
      target,
      kind: 'js',
      source: sourceFor(target, packageDir)
    }
  })
}

export function createProgram(files: string[], tsconfigPath: string) {
  const config = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
  const { options } = ts.parseJsonConfigFileContent(
    { ...config.config, include: [], files: [] },
    ts.sys,
    path.dirname(tsconfigPath)
  )
  return ts.createProgram(files, { ...options, noEmit: true })
}

// Each component gets its own checker over the shared parsed files, so a
// literal union keeps the order its own file declares, not the order an
// earlier component's file first created those literals in.
export function programFor(shared: ts.Program, files: string[]) {
  const options = shared.getCompilerOptions()
  const host = ts.createCompilerHost(options)
  const readSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (fileName, ...rest) =>
    shared.getSourceFile(fileName) ?? readSourceFile(fileName, ...rest)
  return ts.createProgram(files, options, host)
}

function deprecationOf(symbol: ts.Symbol, checker: ts.TypeChecker) {
  const tag = symbol
    .getJsDocTags(checker)
    .find((candidate) => candidate.name === 'deprecated')
  return tag ? unwrap(ts.displayPartsToString(tag.text)) : undefined
}

function deprecationOfNode(node: ts.Node) {
  const tag = ts
    .getJSDocTags(node)
    .find((candidate) => candidate.tagName.text === 'deprecated')
  return tag && unwrap(ts.getTextOfJSDocComment(tag.comment) ?? '')
}

function reExportDeprecation(symbol: ts.Symbol) {
  const specifier = symbol.declarations?.find(ts.isExportSpecifier)
  return specifier && deprecationOfNode(specifier.parent.parent)
}

function declaredIn(symbol: ts.Symbol, sourceFile: ts.SourceFile) {
  return symbol.declarations?.some(
    (declaration) => declaration.getSourceFile() === sourceFile
  )
}

function starExportDeprecations(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
) {
  const reasons = new Map<string, string>()
  for (const statement of sourceFile.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      statement.exportClause ||
      !statement.moduleSpecifier
    )
      continue
    const reason = deprecationOfNode(statement)
    const target = checker.getSymbolAtLocation(statement.moduleSpecifier)
    if (reason === undefined || !target) continue
    for (const symbol of checker.getExportsOfModule(target)) {
      reasons.set(symbol.getName(), reason)
    }
  }
  return reasons
}

function isComponent(
  name: string,
  declaration: ts.Declaration,
  checker: ts.TypeChecker
) {
  return (
    /^[A-Z]/.test(name) &&
    checker.getTypeAtLocation(declaration).getCallSignatures().length > 0
  )
}

export function moduleExports(
  program: ts.Program,
  file: string
): ModuleExports {
  const checker = program.getTypeChecker()
  const sourceFile = program.getSourceFile(file)
  const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile)
  if (!moduleSymbol) throw new Error(`Cannot read the exports of ${file}`)

  const result: ModuleExports = {
    values: [],
    components: new Map(),
    types: [],
    deprecated: []
  }
  const starDeprecations = starExportDeprecations(sourceFile, checker)
  for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
    const resolved =
      symbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(symbol)
        : symbol
    const name = symbol.getName()
    if (resolved.flags & ts.SymbolFlags.Value) {
      result.values.push(name)
      const declaration =
        resolved.valueDeclaration ?? resolved.declarations?.[0]
      if (declaration && isComponent(name, declaration, checker)) {
        result.components.set(name, declaration.getSourceFile().fileName)
      }
    } else result.types.push(name)
    const reason =
      deprecationOf(symbol, checker) ??
      reExportDeprecation(symbol) ??
      (declaredIn(symbol, sourceFile)
        ? undefined
        : starDeprecations.get(name)) ??
      deprecationOf(resolved, checker)
    if (reason !== undefined) result.deprecated.push({ export: name, reason })
  }
  result.values.sort()
  result.types.sort()
  result.deprecated.sort((a, b) =>
    a.export < b.export ? -1 : a.export > b.export ? 1 : 0
  )
  return result
}
