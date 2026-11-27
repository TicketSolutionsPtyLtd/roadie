import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import {
  type ComponentDoc,
  Parser,
  type PropItem,
  withCompilerOptions
} from 'react-docgen-typescript'
import ts from 'typescript'

import { isShipped } from '../package-exports.mjs'
import { programFor } from './exports.ts'
import { unwrap } from './text.ts'

export type ManifestProp = {
  name: string
  type: string
  required?: true
  default?: string
  description?: string
  deprecated?: string
  from?: string
}

export type ManifestPart = {
  name: string
  description?: string
  deprecated?: string
  props: ManifestProp[]
}

export const SKIPPED_PROPS = new Set([
  'ref',
  'key',
  'style',
  'dangerouslySetInnerHTML'
])
const OUR_SOURCES =
  /(^|\/)(core|components|widgets|charts|editor|blocks|illustrations)\//

export function isOurs(fileName: string | undefined) {
  return (
    !!fileName &&
    !fileName.includes('node_modules') &&
    OUR_SOURCES.test(fileName)
  )
}

export function isOursOrBaseUi(fileName: string | undefined) {
  return isOurs(fileName) || !!fileName?.includes('@base-ui/react')
}

function keepProp(prop: PropItem) {
  if (SKIPPED_PROPS.has(prop.name)) return false
  if (prop.name === 'className') return true
  if (!prop.declarations?.length) return true
  return (
    prop.declarations.some((d) => isOurs(d.fileName)) ||
    isOursOrBaseUi(prop.parent?.fileName)
  )
}

// react-docgen-typescript names these exports after their file.
const FILE_NAMED_EXPORTS = new Set([
  'default',
  '__function',
  'Stateless',
  'StatelessComponent',
  'StyledComponentClass',
  'StyledComponent',
  'IStyledComponent',
  'FunctionComponent',
  'ForwardRefExoticComponent',
  'MemoExoticComponent'
])

function assignedDisplayName(source: ts.SourceFile, name: string) {
  for (const statement of source.statements) {
    if (!ts.isExpressionStatement(statement)) continue
    const { expression } = statement
    if (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(expression.left) &&
      ts.isIdentifier(expression.left.expression) &&
      expression.left.expression.text === name &&
      expression.left.name.text === 'displayName' &&
      ts.isStringLiteralLike(expression.right)
    ) {
      return expression.right.text
    }
  }
  return undefined
}

// The parser's own lookup hands a file's one `displayName` to every export in it.
export function exportDisplayName(symbol: ts.Symbol) {
  const name = symbol.getName()
  if (FILE_NAMED_EXPORTS.has(name)) return undefined
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0]
  const source = declaration?.getSourceFile()
  return (source && assignedDisplayName(source, name)) ?? name
}

// The parser caches a dependency's prop by file and name, so one component gets another's copy.
const noPropCache = {
  has: () => false,
  get: () => undefined,
  set: () => noPropCache
}
Object.defineProperty(Parser.prototype, 'propertiesOfPropsCache', {
  configurable: true,
  get: () => noPropCache,
  set: () => {}
})

// TypeScript joins every declaration's docs, so a prop only dependencies declare repeats itself.
const findDocComment = Parser.prototype.findDocComment
Parser.prototype.findDocComment = function (symbol) {
  const declarations = symbol.declarations ?? []
  if (
    declarations.length > 1 &&
    !declarations.some((d) => isOurs(d.getSourceFile().fileName))
  ) {
    const { checker } = this as unknown as { checker: ts.TypeChecker }
    for (const declaration of declarations) {
      const name = ts.getNameOfDeclaration(declaration)
      const own = name && checker.getSymbolAtLocation(name)
      if (!own || own === symbol) continue
      const doc = findDocComment.call(this, own)
      if (doc.fullComment || doc.tags.default) return doc
    }
  }
  return findDocComment.call(this, symbol)
}

export function createDocgenParser(program: ts.Program) {
  return withCompilerOptions(program.getCompilerOptions(), {
    savePropValueAsString: true,
    shouldExtractLiteralValuesFromEnum: true,
    shouldRemoveUndefinedFromOptional: true,
    skipChildrenPropWithoutDoc: true,
    propFilter: keepProp,
    componentNameResolver: exportDisplayName
  })
}

export function formatType(type: PropItem['type']) {
  if (type.value && Array.isArray(type.value)) {
    return (type.value as { value: string }[])
      .map((v) => v.value.replace(/^(['"])(.*)\1$/, '"$2"'))
      .join(' | ')
  }
  if (type.name.includes('|')) {
    return type.name
      .split('|')
      .map((value) => value.trim())
      .filter((value) => value !== 'undefined')
      .join(' | ')
  }
  return type.name
}

// A block tag opens its line; `@deprecated` mid-sentence is prose.
const DEPRECATED_TAG = /^[ \t]*@deprecated\b/m

export function splitDeprecation(
  description: string,
  tags: Record<string, string> | undefined
): { description: string; deprecated?: string } {
  const tag = DEPRECATED_TAG.exec(description)
  if (!tag) {
    return tags && 'deprecated' in tags
      ? {
          description: unwrap(description),
          deprecated: unwrap(tags.deprecated ?? '')
        }
      : { description: unwrap(description) }
  }
  const after = description.slice(tag.index + tag[0].length)
  const end = after.indexOf('\n\n')
  return {
    deprecated: unwrap(end === -1 ? after : after.slice(0, end)),
    description: unwrap(
      description.slice(0, tag.index) + (end === -1 ? '' : after.slice(end))
    )
  }
}

function toProp(prop: PropItem, componentName: string): ManifestProp | null {
  const isForwardedClassName =
    prop.name === 'className' &&
    !!prop.parent?.fileName.includes('@types/react') &&
    prop.type.name === 'string' &&
    !prop.description
  if (isForwardedClassName) return null

  const { description, deprecated } = splitDeprecation(
    prop.description ?? '',
    (prop as PropItem & { tags?: Record<string, string> }).tags
  )
  // A prop we redeclare comes from our declaration, unnamed in a type literal.
  const own = prop.declarations?.find((d) => isOurs(d.fileName))
  const parent = own
    ? own.name === 'TypeLiteral'
      ? undefined
      : own.name
    : prop.parent?.name
  return {
    name: prop.name,
    type: formatType(prop.type),
    ...(prop.required && { required: true as const }),
    ...(prop.defaultValue?.value !== undefined && {
      default: String(prop.defaultValue.value)
    }),
    ...(description && { description }),
    ...(deprecated !== undefined && { deprecated }),
    ...(parent && !parent.startsWith(componentName) && { from: parent })
  }
}

function publicPartsOf(indexFile: string, compound: string) {
  const assignment = new RegExp(`^${compound}\\.([A-Z]\\w*)\\s*=`, 'gm')
  return new Set(
    Array.from(
      readFileSync(indexFile, 'utf8').matchAll(assignment),
      (match) => match[1]!
    )
  )
}

export function componentFiles(entryFile: string) {
  const dir = path.dirname(entryFile)
  return readdirSync(dir)
    .filter((name) => name.endsWith('.tsx') && isShipped(name))
    .sort()
    .map((name) => path.join(dir, name))
}

export function namedDocs(
  docs: ComponentDoc[],
  compound: string,
  exportedValues: Set<string>,
  publicParts: Set<string>
) {
  const prefix = `${compound}.`
  const renamed = docs
    .filter((doc) => /^[A-Z]/.test(doc.displayName))
    .flatMap((doc) => {
      const name = doc.displayName
      if (name === compound || name.includes('.')) return [doc]
      if (!name.startsWith(compound)) return [doc]
      const suffix = name.slice(compound.length)
      if (!/^[A-Z]/.test(suffix) || suffix === 'Root') return [doc]
      return [{ ...doc, displayName: `${prefix}${suffix}` }]
    })

  const byKey = new Map<string, ComponentDoc>()
  for (const doc of renamed) {
    const key = doc.displayName.replace(/\./g, '').toLowerCase()
    const existing = byKey.get(key)
    if (
      !existing ||
      (doc.displayName.includes('.') && !existing.displayName.includes('.'))
    ) {
      byKey.set(key, doc)
    }
  }

  const hasBareRoot = byKey.has(compound.toLowerCase())
  return Array.from(byKey.values()).filter((doc) => {
    const name = doc.displayName
    if (hasBareRoot && name === `${prefix}Root`) return false
    if (!name.includes('.')) return exportedValues.has(name)
    const [root, ...rest] = name.split('.')
    return (
      root === compound &&
      exportedValues.has(root) &&
      publicParts.has(rest.join('.'))
    )
  })
}

export function toPart(doc: ComponentDoc): ManifestPart {
  const { description, deprecated } = splitDeprecation(
    doc.description,
    doc.tags as Record<string, string> | undefined
  )
  return {
    name: doc.displayName,
    ...(description && { description }),
    ...(deprecated !== undefined && { deprecated }),
    props: Object.values(doc.props)
      .map((prop) => toProp(prop, doc.displayName))
      .filter((prop): prop is ManifestProp => prop !== null)
  }
}

function declaredProps(program: ts.Program, files: string[], typeName: string) {
  const checker = program.getTypeChecker()
  for (const file of files) {
    const source = program.getSourceFile(file)
    const module = source && checker.getSymbolAtLocation(source)
    if (!module) continue
    let symbol = checker
      .getExportsOfModule(module)
      .find((candidate) => candidate.getName() === typeName)
    if (!symbol) continue
    if (symbol.flags & ts.SymbolFlags.Alias) {
      symbol = checker.getAliasedSymbol(symbol)
    }
    return checker
      .getPropertiesOfType(checker.getDeclaredTypeOfSymbol(symbol))
      .filter(
        (prop) =>
          !SKIPPED_PROPS.has(prop.name) &&
          // Undocumented `children` and `className` never reach the manifest.
          (!['children', 'className'].includes(prop.name) ||
            prop.getDocumentationComment(checker).length > 0) &&
          !!prop.declarations?.some((d) => isOurs(d.getSourceFile().fileName))
      )
      .map((prop) => prop.name)
  }
  return []
}

// Fails when a part leaves out a prop its `<Part>Props` type declares in our sources.
export function checkPartProps(
  parts: ManifestPart[],
  program: ts.Program,
  files: string[]
) {
  for (const part of parts) {
    const typeName = `${part.name.replace(/\./g, '')}Props`
    const listed = new Set(part.props.map((prop) => prop.name))
    const missing = declaredProps(program, files, typeName).filter(
      (name) => !listed.has(name)
    )
    if (missing.length > 0) {
      throw new Error(
        `${part.name} leaves out ${missing.join(', ')}, which ${typeName} declares. ` +
          'react-docgen-typescript documented another export or prop in its place.'
      )
    }
  }
}

export function readComponents(
  parser: ReturnType<typeof createDocgenParser>,
  program: ts.Program,
  entryFile: string,
  exportedValues: Set<string>
): ManifestPart[] {
  const compound = path.basename(path.dirname(entryFile))
  const publicParts = publicPartsOf(entryFile, compound)
  const files = componentFiles(entryFile)
  const own = programFor(program, files)
  const parts = namedDocs(
    parser.parseWithProgramProvider(files, () => own),
    compound,
    exportedValues,
    publicParts
  ).map(toPart)
  checkPartProps(parts, own, files)

  const documented = new Set(parts.map((part) => part.name))
  const missing = [...publicParts].filter(
    (part) => part !== 'Root' && !documented.has(`${compound}.${part}`)
  )
  if (exportedValues.has(compound) && missing.length > 0) {
    throw new Error(
      `react-docgen-typescript found no docs for ${missing
        .map((part) => `${compound}.${part}`)
        .join(', ')}. Declare ${compound} as a function and assign its parts.`
    )
  }
  return parts
}

export function readFileComponents(
  parser: ReturnType<typeof createDocgenParser>,
  program: ts.Program,
  files: string[],
  names: Set<string>
): ManifestPart[] {
  const own = programFor(program, files)
  const parts = parser
    .parseWithProgramProvider(files, () => own)
    .filter((doc) => names.has(doc.displayName))
    .map(toPart)
  checkPartProps(parts, own, files)
  return parts
}
