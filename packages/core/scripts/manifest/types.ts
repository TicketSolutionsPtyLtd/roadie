import ts from 'typescript'

import {
  type ManifestProp,
  SKIPPED_PROPS,
  formatType,
  isOursOrBaseUi
} from './components.ts'
import { unwrap } from './text.ts'

export type ManifestType = {
  name: string
  import: string
  description?: string
  deprecated?: string
  /** A generic type's parameters, which its fields' types may name. */
  typeParameters?: string[]
  fields: ManifestProp[]
}

export type TypeSource = { subpath: string; import: string; source: string }

const TYPE_NAMES = /\b[A-Z]\w*\b/g
const STRING_LITERALS = /"(?:[^"\\]|\\.)*"/g

function typeNames(type: string) {
  return type.replace(STRING_LITERALS, '').match(TYPE_NAMES) ?? []
}

function documentation(symbol: ts.Symbol, checker: ts.TypeChecker) {
  const description = unwrap(
    ts.displayPartsToString(symbol.getDocumentationComment(checker))
  )
  const tag = symbol
    .getJsDocTags(checker)
    .find((candidate) => candidate.name === 'deprecated')
  return {
    ...(description && { description }),
    ...(tag && { deprecated: unwrap(ts.displayPartsToString(tag.text)) })
  }
}

function quoted(node: ts.LiteralTypeNode) {
  return ts.isStringLiteral(node.literal)
    ? JSON.stringify(node.literal.text)
    : node.literal.getText()
}

// Literals in the order the source declares them, as the props list them, not
// the order the checker first created them in.
function declaredLiterals(
  node: ts.TypeNode | undefined,
  checker: ts.TypeChecker
): string[] | undefined {
  if (!node) return undefined
  if (ts.isParenthesizedTypeNode(node))
    return declaredLiterals(node.type, checker)
  if (ts.isUnionTypeNode(node)) {
    const members = node.types.filter(
      (member) =>
        member.kind !== ts.SyntaxKind.UndefinedKeyword &&
        !(
          ts.isLiteralTypeNode(member) &&
          member.literal.kind === ts.SyntaxKind.NullKeyword
        )
    )
    const literals = members.map((member) =>
      ts.isLiteralTypeNode(member)
        ? [quoted(member)]
        : declaredLiterals(member, checker)
    )
    return literals.every((values) => values !== undefined)
      ? literals.flat()
      : undefined
  }
  if (ts.isTypeReferenceNode(node)) {
    const symbol = checker.getSymbolAtLocation(node.typeName)
    const target =
      symbol && symbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(symbol)
        : symbol
    const alias = target?.declarations?.find(ts.isTypeAliasDeclaration)
    return alias && declaredLiterals(alias.type, checker)
  }
  return undefined
}

function isLiteral(type: ts.Type) {
  return type.isStringLiteral() || type.isNumberLiteral()
}

function fieldType(field: ts.Symbol, checker: ts.TypeChecker) {
  const declared = checker.getTypeOfSymbol(field)
  const type = checker.getNonNullableType(declared)
  if (type.isUnion() && type.types.every(isLiteral)) {
    const declaration = field.declarations?.find(ts.isPropertySignature)
    return (
      declaredLiterals(declaration?.type, checker) ??
      type.types.map((member) => checker.typeToString(member))
    ).join(' | ')
  }
  // Printing the declared type keeps an alias's name, such as `ReactNode`,
  // which a nullable alias loses once its `undefined` is stripped.
  return formatType({
    name: checker.typeToString(
      declared,
      undefined,
      ts.TypeFormatFlags.NoTruncation
    )
  })
}

// The same props a component's own list keeps: ours and Base UI's, not the DOM's or React's,
// plus those a type from another package declares itself.
function isOwnField(field: ts.Symbol, home: Set<string>) {
  if (SKIPPED_PROPS.has(field.getName())) return false
  // TypeScript names a symbol key `__@name@id`, which no reader can set.
  if (String(field.escapedName).startsWith('__@')) return false
  // A key with a leading space, such as Base UI's `' subscribe'`, is the library's own.
  if (/^\s/.test(field.getName())) return false
  const declarations = field.declarations ?? []
  return (
    declarations.length === 0 ||
    declarations.some((declaration) => {
      const fileName = declaration.getSourceFile().fileName
      return isOursOrBaseUi(fileName) || home.has(fileName)
    })
  )
}

function toField(field: ts.Symbol, checker: ts.TypeChecker): ManifestProp {
  return {
    name: field.getName(),
    type: fieldType(field, checker),
    ...(!(field.flags & ts.SymbolFlags.Optional) && {
      required: true as const
    }),
    ...documentation(field, checker)
  }
}

function exportedTypes(program: ts.Program, sources: TypeSource[]) {
  const checker = program.getTypeChecker()
  const byName = new Map<string, { symbol: ts.Symbol; import: string }>()
  // A subpath names a type more precisely than the package root re-exporting it.
  const ordered = [...sources].sort(
    (a, b) => Number(a.subpath === '.') - Number(b.subpath === '.')
  )
  for (const { import: importName, source } of ordered) {
    const sourceFile = program.getSourceFile(source)
    const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile)
    if (!moduleSymbol) continue
    for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
      const resolved =
        symbol.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(symbol)
          : symbol
      if (!(resolved.flags & ts.SymbolFlags.Type)) continue
      if (!byName.has(symbol.getName())) {
        byName.set(symbol.getName(), { symbol: resolved, import: importName })
      }
    }
  }
  return byName
}

/**
 * Describes each exported object type that the given prop types name, and the
 * exported types their fields name in turn, so a reader can follow a prop like
 * `readonly QuoteItem[]` to the fields of `QuoteItem`.
 */
export function readTypes(
  program: ts.Program,
  sources: TypeSource[],
  propTypes: string[]
): ManifestType[] {
  const checker = program.getTypeChecker()
  const exported = exportedTypes(program, sources)
  const described = new Map<string, ManifestType>()
  const queue = propTypes.flatMap(typeNames)

  for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
    if (described.has(name)) continue
    const entry = exported.get(name)
    if (!entry) continue
    const type = checker.getDeclaredTypeOfSymbol(entry.symbol)
    const isObject =
      !!(type.flags & ts.TypeFlags.Object) || type.isIntersection()
    if (!isObject || type.getCallSignatures().length > 0) continue

    const home = new Set(
      (entry.symbol.declarations ?? []).map(
        (declaration) => declaration.getSourceFile().fileName
      )
    )
    const typeParameters = (entry.symbol.declarations ?? []).flatMap(
      (declaration) =>
        ts.isTypeAliasDeclaration(declaration) ||
        ts.isInterfaceDeclaration(declaration)
          ? (declaration.typeParameters ?? []).map(
              (parameter) => parameter.name.text
            )
          : []
    )
    const fields = checker
      .getPropertiesOfType(type)
      .filter((field) => isOwnField(field, home))
      .map((field) => toField(field, checker))
    described.set(name, {
      name,
      import: entry.import,
      ...documentation(entry.symbol, checker),
      ...(typeParameters.length > 0 && { typeParameters }),
      fields
    })
    queue.push(
      ...fields
        .flatMap((field) => typeNames(field.type))
        .filter((typeName) => !typeParameters.includes(typeName))
    )
  }

  return [...described.values()].sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  )
}
