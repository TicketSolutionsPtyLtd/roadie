import ts from 'typescript'

import {
  type ManifestProp,
  SKIPPED_PROPS,
  formatType,
  isOursOrBaseUi
} from './components.ts'
import { deprecationOf } from './exports.ts'
import { compareText, unwrap } from './text.ts'

export type ManifestType = {
  /** The name the type prints as in props' and fields' `type`. */
  name: string
  import: string
  /** The name to import it by, when the package re-exports it under another. */
  export?: string
  description?: string
  deprecated?: string
  /** A generic type's parameters, which its fields' types may name. */
  typeParameters?: string[]
  fields: ManifestProp[]
}

/** One entry point's type exports, from `moduleExports`. Earlier sources win a name. */
export type TypeSource = { import: string; symbols: Map<string, ts.Symbol> }

const TYPE_NAMES = /\b[A-Z]\w*\b/g
const STRING_LITERALS = /"(?:[^"\\]|\\.)*"/g

function typeNames(type: string) {
  return type.replace(STRING_LITERALS, '').match(TYPE_NAMES) ?? []
}

function documentation(symbol: ts.Symbol, checker: ts.TypeChecker) {
  const description = unwrap(
    ts.displayPartsToString(symbol.getDocumentationComment(checker))
  )
  const deprecated = deprecationOf(symbol, checker)
  return {
    ...(description && { description }),
    ...(deprecated !== undefined && { deprecated })
  }
}

function isNullish(node: ts.TypeNode) {
  return (
    node.kind === ts.SyntaxKind.UndefinedKeyword ||
    (ts.isLiteralTypeNode(node) &&
      node.literal.kind === ts.SyntaxKind.NullKeyword)
  )
}

// Literals in the order the source declares them, as the props list them, not
// the order the checker first created them in.
function declaredLiterals(
  node: ts.TypeNode | undefined,
  checker: ts.TypeChecker
): string[] | undefined {
  if (!node) return undefined
  if (ts.isLiteralTypeNode(node)) {
    return [
      ts.isStringLiteral(node.literal)
        ? `"${node.literal.text}"`
        : node.literal.getText()
    ]
  }
  if (ts.isParenthesizedTypeNode(node))
    return declaredLiterals(node.type, checker)
  if (ts.isUnionTypeNode(node)) {
    const literals = node.types
      .filter((member) => !isNullish(member))
      .map((member) => declaredLiterals(member, checker))
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

function isOptional(field: ts.Symbol) {
  return !!(field.flags & ts.SymbolFlags.Optional)
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
  const printed = checker.typeToString(
    declared,
    undefined,
    ts.TypeFormatFlags.NoTruncation
  )
  // On an optional field `undefined` only repeats that `required` is unset; on
  // a required one it's a value the field takes.
  return isOptional(field) ? formatType({ name: printed }) : printed
}

function isSymbolKeyed(field: ts.Symbol) {
  return !!field.declarations?.some((declaration) => {
    const name = ts.getNameOfDeclaration(declaration)
    return (
      !!name &&
      ts.isComputedPropertyName(name) &&
      !ts.isStringLiteralLike(name.expression) &&
      !ts.isNumericLiteral(name.expression)
    )
  })
}

// The same props a component's own list keeps: ours and Base UI's, not the DOM's or React's,
// plus those a type from another package declares itself.
function isOwnField(field: ts.Symbol, home: Set<string>) {
  if (SKIPPED_PROPS.has(field.getName())) return false
  // A symbol key has no name a reader can set.
  if (isSymbolKeyed(field)) return false
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
    ...(!isOptional(field) && { required: true as const }),
    ...documentation(field, checker)
  }
}

function isDescribed(type: ts.Type, checker: ts.TypeChecker) {
  const isObject = !!(type.flags & ts.TypeFlags.Object) || type.isIntersection()
  return (
    isObject &&
    !checker.isArrayType(type) &&
    !checker.isTupleType(type) &&
    type.getCallSignatures().length === 0
  )
}

/**
 * Describes each exported object type that the given prop types name, and the
 * exported types their fields lead to through unions, arrays and aliases, so a
 * reader can follow a prop like `readonly QuoteItem[]` to the fields of `QuoteItem`.
 */
export function readTypes(
  program: ts.Program,
  sources: TypeSource[],
  propTypes: string[]
): ManifestType[] {
  if (propTypes.length === 0) return []
  const checker = program.getTypeChecker()
  const exported = new Map<ts.Symbol, { name: string; import: string }>()
  const byName = new Map<string, ts.Symbol>()
  for (const source of sources) {
    for (const [name, symbol] of source.symbols) {
      if (!exported.has(symbol))
        exported.set(symbol, { name, import: source.import })
      if (!byName.has(name)) byName.set(name, symbol)
      // Types print by their own name, so a renamed re-export is found by it too.
      if (!byName.has(symbol.getName())) byName.set(symbol.getName(), symbol)
    }
  }

  const queue = propTypes
    .flatMap(typeNames)
    .flatMap((name) => byName.get(name) ?? [])
  const followed = new Set<ts.Type>()
  const follow = (type: ts.Type) => {
    if (followed.has(type)) return
    followed.add(type)
    if (type.flags & ts.TypeFlags.TypeParameter) return
    for (const symbol of [type.aliasSymbol, type.getSymbol()]) {
      if (symbol && exported.has(symbol)) queue.push(symbol)
    }
    if (type.isUnionOrIntersection()) type.types.forEach(follow)
    type.aliasTypeArguments?.forEach(follow)
    if (!(type.flags & ts.TypeFlags.Object)) return
    const { objectFlags } = type as ts.ObjectType
    // `T[]`, `Promise<T>` and other generic instances name their types as arguments.
    if (objectFlags & ts.ObjectFlags.Reference) {
      checker.getTypeArguments(type as ts.TypeReference).forEach(follow)
    }
    for (const signature of [
      ...type.getCallSignatures(),
      ...type.getConstructSignatures()
    ]) {
      for (const parameter of signature.getParameters()) {
        follow(checker.getTypeOfSymbol(parameter))
      }
      follow(signature.getReturnType())
    }
    // An inline object type has no name to describe it by, so look inside it.
    if (objectFlags & ts.ObjectFlags.Anonymous) {
      for (const field of checker.getPropertiesOfType(type)) {
        follow(checker.getTypeOfSymbol(field))
      }
    }
  }

  const seen = new Set<ts.Symbol>()
  const described: ManifestType[] = []
  for (const symbol of queue) {
    if (seen.has(symbol)) continue
    seen.add(symbol)
    const type = checker.getDeclaredTypeOfSymbol(symbol)
    if (!isDescribed(type, checker)) {
      follow(type)
      continue
    }

    const declarations = symbol.declarations ?? []
    const home = new Set(
      declarations.map((declaration) => declaration.getSourceFile().fileName)
    )
    const typeParameters = declarations.flatMap((declaration) =>
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
    for (const field of fields) follow(checker.getTypeOfSymbol(field))
    const entry = exported.get(symbol)!
    const name = symbol.getName()
    described.push({
      name,
      import: entry.import,
      ...(entry.name !== name && { export: entry.name }),
      ...documentation(symbol, checker),
      ...(typeParameters.length > 0 && { typeParameters }),
      fields: fields.map((field) => toField(field, checker))
    })
  }

  return described.sort((a, b) => compareText(a.name, b.name))
}
