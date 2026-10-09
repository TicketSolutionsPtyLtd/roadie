export const COMPONENTS = /^@oztix\/roadie-components(?:\/|$)/

export function importedLocals(j, root, exportName, source = COMPONENTS) {
  const locals = new Set()
  root
    .find(j.ImportDeclaration)
    .filter(
      (path) =>
        source.test(path.node.source.value) && path.node.importKind !== 'type'
    )
    .forEach((path) => {
      for (const specifier of path.node.specifiers ?? []) {
        if (
          specifier.type === 'ImportSpecifier' &&
          specifier.importKind !== 'type' &&
          specifier.imported.name === exportName
        ) {
          locals.add(specifier.local.name)
        }
      }
    })
  return locals
}

export function namespaceLocals(j, root, source = COMPONENTS) {
  const locals = new Set()
  root
    .find(j.ImportDeclaration)
    .filter(
      (path) =>
        source.test(path.node.source.value) && path.node.importKind !== 'type'
    )
    .forEach((path) => {
      for (const specifier of path.node.specifiers ?? []) {
        if (specifier.type === 'ImportNamespaceSpecifier') {
          locals.add(specifier.local.name)
        }
      }
    })
  return locals
}

// Each read of a namespace import, as the node naming the member read off it,
// or as `member: undefined` when the namespace is used whole.
export function namespaceUses(j, root, namespace) {
  const uses = []
  root.find(j.Identifier, { name: namespace }).forEach((path) => {
    const parent = path.parent.node
    if (path.node.type !== 'Identifier') return
    if (parent.type === 'ImportNamespaceSpecifier') return
    if (
      (parent.type === 'MemberExpression' ||
        parent.type === 'OptionalMemberExpression') &&
      parent.object === path.node &&
      !parent.computed
    ) {
      uses.push({ node: parent, member: parent.property })
    } else if (parent.type === 'TSQualifiedName' && parent.left === path.node) {
      uses.push({ node: parent, member: parent.right })
    } else if (!isPropertyName(parent, path.node) && !isReExportName(path)) {
      uses.push({ node: path.node, member: undefined })
    }
  })
  root.find(j.JSXMemberExpression).forEach((path) => {
    const { object, property } = path.node
    if (object.type === 'JSXIdentifier' && object.name === namespace) {
      uses.push({ node: path.node, member: property })
    }
  })
  return uses
}

function isPropertyName(parent, node) {
  if (
    (parent.type === 'MemberExpression' ||
      parent.type === 'OptionalMemberExpression' ||
      parent.type === 'TSQualifiedName') &&
    (parent.property === node || parent.right === node) &&
    !parent.computed
  ) {
    return true
  }
  return (
    (parent.type === 'ObjectProperty' || parent.type === 'Property') &&
    parent.key === node &&
    !parent.shorthand &&
    !parent.computed
  )
}

// `export { X } from '…'` names another module's export, not a local binding.
export function isReExportName(path) {
  return (
    path.parent.node.type === 'ExportSpecifier' &&
    Boolean(path.parent.parent.node.source)
  )
}

function jsxSegments(name) {
  if (name.type === 'JSXIdentifier') return [name.name]
  if (name.type !== 'JSXMemberExpression') return []
  return [...jsxSegments(name.object), name.property.name]
}

// A target is `Name` or `Name.Part`; `Name` also matches its `Name.Root` alias.
// Each matches through a namespace import too, as `Roadie.Name.Part`.
export function jsxNameMatcher(j, root, targets) {
  const namespaces = namespaceLocals(j, root)
  const wanted = targets.map((target) => {
    const [name, part] = target.split('.')
    return { name, locals: importedLocals(j, root, name), part }
  })
  const partMatches = (rest, part) =>
    part
      ? rest.length === 1 && rest[0] === part
      : rest.length === 0 || (rest.length === 1 && rest[0] === 'Root')
  return (node) => {
    const [first, ...rest] = jsxSegments(node)
    return wanted.some(({ name, locals, part }) =>
      namespaces.has(first)
        ? rest[0] === name && partMatches(rest.slice(1), part)
        : locals.has(first) && partMatches(rest, part)
    )
  }
}

export function jsxName(name) {
  return name.type === 'JSXMemberExpression'
    ? `${jsxName(name.object)}.${name.property.name}`
    : name.name
}

export function attribute(opening, name) {
  return opening.attributes.find(
    (attr) => attr.type === 'JSXAttribute' && attr.name.name === name
  )
}

export function removeAttribute(opening, attr) {
  opening.attributes = opening.attributes.filter((other) => other !== attr)
}

function isStringLiteral(node) {
  return (
    node?.type === 'StringLiteral' ||
    (node?.type === 'Literal' && typeof node.value === 'string')
  )
}

export function stringValue(attr) {
  const value = attr?.value
  if (isStringLiteral(value)) return value.value
  if (
    value?.type === 'JSXExpressionContainer' &&
    isStringLiteral(value.expression)
  ) {
    return value.expression.value
  }
  return undefined
}

export function setStringValue(attr, text) {
  const literal = isStringLiteral(attr.value)
    ? attr.value
    : attr.value.expression
  literal.value = text
  delete literal.extra
}

export function readWhole(namespace) {
  return `${namespace} is read whole, so which deprecated exports it reaches is unknown. Migrate them by hand.`
}

export function reExportedName(name) {
  return `export { ${name} } re-exports a deprecated name, and renaming it changes this module's own API. Migrate it by hand.`
}

// Renaming a re-exported name would change the file's own public API, so
// each `export … from` of a deprecated name or module is reported, not moved.
export function reportReExports(
  j,
  root,
  report,
  { isDeprecated, wholeModule }
) {
  const reportModule = (node) =>
    report(
      node,
      `'${node.source.value}' is re-exported whole, and renaming its deprecated names changes this module's own API. Migrate it by hand.`
    )
  root
    .find(j.ExportAllDeclaration)
    .filter((path) => wholeModule(path.node.source.value))
    .forEach((path) => reportModule(path.node))
  root
    .find(j.ExportNamedDeclaration)
    .filter((path) => Boolean(path.node.source))
    .forEach((path) => {
      const source = path.node.source.value
      for (const specifier of path.node.specifiers ?? []) {
        if (specifier.type === 'ExportNamespaceSpecifier') {
          if (wholeModule(source)) reportModule(path.node)
        } else if (isDeprecated(source, specifier.local.name)) {
          report(specifier, reExportedName(specifier.local.name))
        }
      }
    })
}

// Reports are held until `flush`, which sends them in line order. jscodeshift
// prefixes each with the file's path.
export function reporter(api) {
  const held = []
  const report = (node, message) =>
    held.push({ line: node.loc?.start.line ?? Infinity, message })
  report.flush = () => {
    held.sort((a, b) => a.line - b.line)
    for (const { line, message } of held) {
      api.report(`line ${line === Infinity ? '?' : line}: ${message}`)
    }
  }
  return report
}

const PROLOGUE = /^(?:\s*(['"])use [a-z ]+\1;?[ \t]*\n)+\s*/

// Recast reprints the whole program when a statement is added, which drops
// the blank line after a 'use client' directive.
export function print(root, source) {
  const output = root.toSource({ quote: 'single' })
  const before = PROLOGUE.exec(source)
  const after = PROLOGUE.exec(output)
  return before && after ? before[0] + output.slice(after[0].length) : output
}
