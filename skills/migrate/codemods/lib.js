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

// A target is `Name` or `Name.Part`; `Name` also matches its `Name.Root` alias.
export function jsxNameMatcher(j, root, targets) {
  const wanted = targets.map((target) => {
    const [name, part] = target.split('.')
    return { locals: importedLocals(j, root, name), part }
  })
  return (name) =>
    wanted.some(({ locals, part }) => {
      if (name.type === 'JSXIdentifier') return !part && locals.has(name.name)
      return (
        name.type === 'JSXMemberExpression' &&
        name.object.type === 'JSXIdentifier' &&
        locals.has(name.object.name) &&
        name.property.name === (part ?? 'Root')
      )
    })
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

// jscodeshift prefixes each report with the file's path.
export function reporter(api) {
  return (node, message) =>
    api.report(`line ${node.loc?.start.line ?? '?'}: ${message}`)
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
