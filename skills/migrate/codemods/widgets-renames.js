import {
  dynamicImports,
  isLabel,
  isReExportName,
  namespaceLocals,
  namespaceUses,
  print,
  readWhole,
  readsImport,
  reportDynamicImports,
  reportReExports,
  reporter
} from './lib.js'

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

function exactly(source) {
  return { test: (value) => value === source }
}

function isReference(path) {
  if (path.node.type !== 'Identifier') return false
  const parent = path.parent.node
  if (parent.type === 'ImportSpecifier') return false
  if (isReExportName(path)) return false
  if (parent.type === 'ExportSpecifier' && parent.exported === path.node) {
    return false
  }
  if (isLabel(parent, path.node)) return false
  return true
}

// A re-export or shorthand key is a public name, so it keeps the old one.
// Recast prints an edited shorthand node without its alias, so replace it.
function keepPublicName(j, path, from, to, report) {
  const parent = path.parent.node
  if (parent.type === 'ExportSpecifier' && parent.local === path.node) {
    if (parent.exported.name === from) {
      report(
        parent,
        `export { ${from} } keeps the deprecated name as this module's public export. Rename it by hand once its importers move.`
      )
    }
    path.parent.replace(
      j.exportSpecifier.from({
        local: j.identifier(to),
        exported: j.identifier(parent.exported.name)
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

function renameReferences(j, root, from, to, report) {
  root
    .find(j.Identifier, { name: from })
    .filter((path) => isReference(path) && readsImport(path, from))
    .forEach((path) => {
      if (!keepPublicName(j, path, from, to, report)) path.node.name = to
    })
  root.find(j.JSXIdentifier, { name: from }).forEach((path) => {
    const parent = path.parent.node
    if (parent.type === 'JSXAttribute') return
    if (!readsImport(path, from)) return
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
  const report = reporter(api)
  let changed = false

  const deprecatedIn = (source) => Object.keys(RENAMED_EXPORTS[source] ?? {})
  reportReExports(j, root, report, {
    isDeprecated: (source, name) => Boolean(RENAMED_EXPORTS[source]?.[name]),
    deprecatedIn
  })
  reportDynamicImports(j, root, report, deprecatedIn)

  for (const { literal } of dynamicImports(j, root)) {
    const moved = MOVED_SOURCES[literal.value]
    if (moved) {
      literal.value = moved
      delete literal.extra
      changed = true
    }
  }

  // Only the path moved, so a re-export of it keeps the same names.
  for (const type of [j.ExportNamedDeclaration, j.ExportAllDeclaration]) {
    root
      .find(type)
      .filter((path) => MOVED_SOURCES[path.node.source?.value])
      .forEach((path) => {
        path.node.source = j.stringLiteral(
          MOVED_SOURCES[path.node.source.value]
        )
        changed = true
      })
  }

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
      if (!keepLocal) renameReferences(j, root, local, to, report)
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

  for (const [source, renames] of Object.entries(RENAMED_EXPORTS)) {
    for (const namespace of namespaceLocals(j, root, exactly(source))) {
      for (const { node, member } of namespaceUses(j, root, namespace)) {
        if (!member) {
          report(node, readWhole(namespace))
        } else if (renames[member.name]) {
          member.name = renames[member.name]
          changed = true
        }
      }
    }
  }

  report.flush()
  return changed ? print(root, file.source) : file.source
}
