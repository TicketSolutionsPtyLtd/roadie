import { print } from './lib.js'

export const parser = 'tsx'

const MOVED_SOURCES = {
  '@oztix/roadie-widgets/cart-drawer/core': '@oztix/roadie-widgets/cart'
}

const RENAMED_EXPORTS = {
  '@oztix/roadie-widgets/cart-drawer/react': {
    CartExpiryModals: 'CartExpiryDialogs',
    CartExpiryModalsProps: 'CartExpiryDialogsProps'
  },
  '@oztix/roadie-widgets/cart-drawer/vue': {
    CartExpiryModals: 'CartExpiryDialogs'
  }
}

function isReference(path) {
  if (path.node.type !== 'Identifier') return false
  const parent = path.parent.node
  if (parent.type === 'ImportSpecifier') return false
  if (parent.type === 'ExportSpecifier' && parent.exported === path.node) {
    return false
  }
  if (
    (parent.type === 'MemberExpression' ||
      parent.type === 'TSQualifiedName' ||
      parent.type === 'OptionalMemberExpression') &&
    (parent.property === path.node || parent.right === path.node) &&
    !parent.computed
  ) {
    return false
  }
  if (
    (parent.type === 'ObjectProperty' || parent.type === 'Property') &&
    parent.key === path.node &&
    !parent.shorthand &&
    !parent.computed
  ) {
    return false
  }
  return true
}

// A re-export or shorthand key is a public name, so it keeps the old one.
// Recast prints an edited shorthand node without its alias, so replace it.
function keepPublicName(j, path, from, to) {
  const parent = path.parent.node
  if (parent.type === 'ExportSpecifier' && parent.local === path.node) {
    path.parent.replace(
      j.exportSpecifier.from({
        local: j.identifier(to),
        exported: j.identifier(from)
      })
    )
    return true
  }
  if (
    (parent.type === 'ObjectProperty' || parent.type === 'Property') &&
    parent.shorthand
  ) {
    path.parent.replace(j.objectProperty(j.identifier(from), j.identifier(to)))
    return true
  }
  return false
}

function renameReferences(j, root, from, to) {
  root
    .find(j.Identifier, { name: from })
    .filter(isReference)
    .forEach((path) => {
      if (!keepPublicName(j, path, from, to)) path.node.name = to
    })
  root.find(j.JSXIdentifier, { name: from }).forEach((path) => {
    const parent = path.parent.node
    if (parent.type === 'JSXAttribute') return
    if (
      parent.type === 'JSXMemberExpression' &&
      parent.property === path.node
    ) {
      return
    }
    path.node.name = to
  })
}

export default function transform(file, api) {
  const j = api.jscodeshift
  const root = j(file.source)
  let changed = false

  root.find(j.ImportDeclaration).forEach((path) => {
    const source = path.node.source.value
    if (MOVED_SOURCES[source]) {
      path.node.source = j.stringLiteral(MOVED_SOURCES[source])
      changed = true
    }

    const renames = RENAMED_EXPORTS[source] ?? {}
    path.node.specifiers = path.node.specifiers?.map((specifier) => {
      const to =
        specifier.type === 'ImportSpecifier' && renames[specifier.imported.name]
      if (!to) return specifier
      const local = specifier.local.name
      const keepLocal =
        local !== specifier.imported.name ||
        root.find(j.Identifier, { name: to }).size() > 0
      if (!keepLocal) renameReferences(j, root, local, to)
      // Recast drops the alias when an existing specifier's names are edited.
      const renamed = j.importSpecifier(
        j.identifier(to),
        j.identifier(keepLocal ? local : to)
      )
      renamed.importKind = specifier.importKind
      changed = true
      return renamed
    })
  })

  return changed ? print(root, file.source) : file.source
}
