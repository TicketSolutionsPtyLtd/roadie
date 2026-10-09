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

// Type-only namespaces count too: a deprecated type is read through them.
export function namespaceLocals(j, root, source = COMPONENTS) {
  const locals = new Set()
  root
    .find(j.ImportDeclaration)
    .filter((path) => source.test(path.node.source.value))
    .forEach((path) => {
      for (const specifier of path.node.specifiers ?? []) {
        if (specifier.type === 'ImportNamespaceSpecifier') {
          locals.add(specifier.local.name)
        }
      }
    })
  return locals
}

// A parameter or variable of the same name shadows the import.
export function readsImport(path, name) {
  return path.scope?.lookup(name)?.isGlobal ?? true
}

// A name that labels a member, key, or export rather than reading a binding.
export function isLabel(parent, node) {
  if (parent.computed) return false
  switch (parent.type) {
    case 'MemberExpression':
    case 'OptionalMemberExpression':
    case 'JSXMemberExpression':
      return parent.property === node
    case 'TSQualifiedName':
      return parent.right === node
    case 'ExportSpecifier':
      return parent.exported === node && parent.local !== node
    default:
      return parent.key === node && parent.value !== node
  }
}

// Each read of a namespace import, as the node naming the member read off it,
// or as `member: undefined` when the namespace is used whole.
export function namespaceUses(j, root, namespace) {
  const uses = new Map()
  root.find(j.Identifier, { name: namespace }).forEach((path) => {
    const parent = path.parent.node
    if (path.node.type !== 'Identifier') return
    if (parent.type === 'ImportNamespaceSpecifier') return
    if (isLabel(parent, path.node) || isReExportName(path)) return
    if (!readsImport(path, namespace)) return
    if (
      (parent.type === 'MemberExpression' ||
        parent.type === 'OptionalMemberExpression') &&
      parent.object === path.node &&
      !parent.computed
    ) {
      uses.set(parent, parent.property)
    } else if (parent.type === 'TSQualifiedName' && parent.left === path.node) {
      uses.set(parent, parent.right)
    } else {
      uses.set(path.node, undefined)
    }
  })
  root.find(j.JSXMemberExpression).forEach((path) => {
    const { object, property } = path.node
    if (
      object.type === 'JSXIdentifier' &&
      object.name === namespace &&
      readsImport(path, namespace)
    ) {
      uses.set(path.node, property)
    }
  })
  return [...uses].map(([node, member]) => ({ node, member }))
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
// `deprecatedIn(source)` is 'all', or the deprecated names the source exports.
export function reportReExports(
  j,
  root,
  report,
  { isDeprecated, deprecatedIn }
) {
  const reportModule = (node) => {
    const source = node.source.value
    const deprecated = deprecatedIn(source)
    if (deprecated === 'all') {
      report(
        node,
        `'${source}' is re-exported whole, and renaming its deprecated names changes this module's own API. Migrate it by hand.`
      )
    } else if (deprecated.length > 0 && node.type === 'ExportAllDeclaration') {
      report(
        node,
        `export * from '${source}' re-exports the deprecated ${deprecated.join(', ')}, which leave this module's API when Roadie removes them. Check its importers.`
      )
    }
  }
  root.find(j.ExportAllDeclaration).forEach((path) => reportModule(path.node))
  root
    .find(j.ExportNamedDeclaration)
    .filter((path) => Boolean(path.node.source))
    .forEach((path) => {
      const source = path.node.source.value
      for (const specifier of path.node.specifiers ?? []) {
        if (specifier.type === 'ExportNamespaceSpecifier') {
          reportModule(path.node)
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
