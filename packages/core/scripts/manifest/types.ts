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
  /** The type of any key `fields` doesn't name, when the type takes them. */
  additionalFields?: string
  fields: ManifestProp[]
}

/** One entry point's type exports, from `moduleExports`. Earlier sources win a name. */
export type TypeSource = { import: string; symbols: Map<string, ts.Symbol> }

const TYPE_NAMES = /\b[A-Z]\w*\b/g
const STRING_LITERALS = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g
// Their argument isn't the shape a prop or field takes, so it isn't followed.
const RESHAPING = new Set(['Omit', 'Pick', 'Partial', 'Required'])
const RESHAPED = /\b(?:Omit|Pick|Partial|Required)</g

function withoutReshaped(type: string) {
  let result = ''
  let index = 0
  for (const match of type.matchAll(RESHAPED)) {
    if (match.index < index) continue
    result += type.slice(index, match.index)
    let end = match.index + match[0].length - 1
    for (let depth = 0; end < type.length; end++) {
      if (type[end] === '<') depth++
      else if (type[end] === '>' && --depth === 0) break
    }
    index = end + 1
  }
  return result + type.slice(index)
}

function typeNames(type: string) {
  return (
    withoutReshaped(type.replace(STRING_LITERALS, '')).match(TYPE_NAMES) ?? []
  )
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

// Declared order, as props list them, not the order the checker created them in.
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

function withoutOuterParentheses(type: string) {
  if (!type.startsWith('(') || !type.endsWith(')')) return type
  let depth = 0
  for (let index = 0; index < type.length - 1; index++) {
    if (type[index] === '(') depth++
    else if (type[index] === ')' && --depth === 0) return type
  }
  return type.slice(1, -1)
}

function fieldType(field: ts.Symbol, checker: ts.TypeChecker) {
  const declared = checker.getTypeOfSymbol(field)
  const type = checker.getNonNullableType(declared)
  // On a required field, `undefined` or `null` is a value it takes, not optionality.
  const empty =
    isOptional(field) || !declared.isUnion()
      ? []
      : declared.types
          .filter(
            (member) =>
              member.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)
          )
          .map((member) => checker.typeToString(member))
  if (type.isUnion() && type.types.every(isLiteral)) {
    const declaration = field.declarations?.find(ts.isPropertySignature)
    return [
      ...(declaredLiterals(declaration?.type, checker) ??
        type.types.map((member) => checker.typeToString(member))),
      ...empty
    ].join(' | ')
  }
  // The declared type keeps a nullable alias's name, such as `ReactNode`.
  const printed = checker.typeToString(
    declared,
    undefined,
    ts.TypeFormatFlags.NoTruncation
  )
  return isOptional(field)
    ? withoutOuterParentheses(formatType({ name: printed }))
    : printed
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

function isHome(declaration: ts.Declaration, home: Set<string>) {
  const fileName = declaration.getSourceFile().fileName
  return isOursOrBaseUi(fileName) || home.has(fileName)
}

// The fields props keep (ours and Base UI's), plus a re-exported type's own.
function isOwnField(field: ts.Symbol, home: Set<string>) {
  if (SKIPPED_PROPS.has(field.getName())) return false
  if (isSymbolKeyed(field)) return false
  // A key with a leading space, such as Base UI's `' subscribe'`, is the library's own.
  if (/^\s/.test(field.getName())) return false
  const declarations = field.declarations ?? []
  return (
    declarations.length === 0 ||
    declarations.some((declaration) => isHome(declaration, home))
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

// A library's class or interface under our alias, such as `Map<string, Row>`, has none of our fields.
function isLibraryClassOrInterface(type: ts.Type, home: Set<string>) {
  if (!(type.flags & ts.TypeFlags.Object)) return false
  const named = ts.ObjectFlags.ClassOrInterface | ts.ObjectFlags.Reference
  if (!((type as ts.ObjectType).objectFlags & named)) return false
  const declarations = type.getSymbol()?.declarations ?? []
  return !declarations.some((declaration) => isHome(declaration, home))
}

function isDescribed(type: ts.Type, home: Set<string>) {
  const isObject = !!(type.flags & ts.TypeFlags.Object) || type.isIntersection()
  return (
    isObject &&
    !isLibraryClassOrInterface(type, home) &&
    type.getCallSignatures().length === 0
  )
}

/** Describes the exported object types props name, and those their fields lead to. */
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
    if (!RESHAPING.has(type.aliasSymbol?.getName() ?? '')) {
      type.aliasTypeArguments?.forEach(follow)
    }
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
    const declarations = symbol.declarations ?? []
    const home = new Set(
      declarations.map((declaration) => declaration.getSourceFile().fileName)
    )
    if (!isDescribed(type, home)) {
      follow(type)
      continue
    }

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
    const extra = checker
      .getIndexInfosOfType(type)
      .find((info) => info.keyType.flags & ts.TypeFlags.String)
    described.push({
      name,
      import: entry.import,
      ...(entry.name !== name && { export: entry.name }),
      ...documentation(symbol, checker),
      ...(typeParameters.length > 0 && { typeParameters }),
      ...(extra && { additionalFields: checker.typeToString(extra.type) }),
      fields: fields.map((field) => toField(field, checker))
    })
  }

  return described.sort((a, b) => compareText(a.name, b.name))
}
