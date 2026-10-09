import {
  COMPONENTS,
  attribute,
  importedLocals,
  isLabel,
  isReExportName,
  jsxName,
  namespaceLocals,
  namespaceUses,
  print,
  reExportedName,
  readWhole,
  readsImport,
  removeAttribute,
  reportReExports,
  reporter,
  stringValue
} from './lib.js'

export const parser = 'tsx'

const REPLACEMENTS = { LinkButton: 'Button', LinkIconButton: 'IconButton' }
const BUTTON_SOURCE = '@oztix/roadie-components/button'
const LINK_BUTTON_SOURCE = '@oztix/roadie-components/link-button'
const DEPRECATED = /^Link(?:Icon)?Button/
const BARREL_DEPRECATIONS = [
  'LinkButton',
  'LinkButtonProps',
  'LinkIconButton',
  'LinkIconButtonProps'
]
// Only these namespaces can reach LinkButton.
const LINK_BUTTON_NAMESPACE = /^@oztix\/roadie-components(?:\/link-button)?$/

function blocker(opening) {
  if (opening.attributes.some((attr) => attr.type === 'JSXSpreadAttribute')) {
    return 'spreads props, so its href and as are unknown'
  }
  if (!attribute(opening, 'href')) {
    return 'has no href, and Button without href renders a <button>'
  }
  const as = attribute(opening, 'as')
  if (as && stringValue(as) !== 'a') {
    return 'sets as; pass the router Link to RoadieProvider and drop as'
  }
  return undefined
}

function importButton(j, root, name) {
  const existing = importedLocals(j, root, name)
  if (existing.size > 0) return [...existing][0]

  const taken =
    root
      .find(j.Identifier, { name })
      .filter(
        (path) => !isLabel(path.parent.node, path.node) && !isReExportName(path)
      )
      .size() > 0
  const local = taken ? `Roadie${name}` : name
  const specifier = j.importSpecifier(j.identifier(name), j.identifier(local))
  const buttonImport = root
    .find(j.ImportDeclaration, { source: { value: BUTTON_SOURCE } })
    .filter((path) => path.node.importKind !== 'type')
  if (buttonImport.size() > 0) {
    buttonImport.get().node.specifiers.push(specifier)
  } else {
    const first = root
      .find(j.ImportDeclaration)
      .filter((path) => COMPONENTS.test(path.node.source.value))
      .get()
    const declaration = j.importDeclaration(
      [specifier],
      j.stringLiteral(BUTTON_SOURCE)
    )
    // The new import goes first, so it takes the group's leading comment.
    declaration.comments = first.node.comments
    first.node.comments = null
    first.insertBefore(declaration)
  }
  return local
}

// A header comment, licence, or lint directive often sits on the first import.
function removeKeepingComments(path) {
  const body = path.parent.node.body
  const next = body[body.indexOf(path.node) + 1]
  if (path.node.comments && next) {
    next.comments = [...path.node.comments, ...(next.comments ?? [])]
  }
  path.prune()
}

function dropSpecifier(j, root, local) {
  root
    .find(j.ImportDeclaration)
    .filter((path) => COMPONENTS.test(path.node.source.value))
    .forEach((path) => {
      path.node.specifiers = path.node.specifiers.filter(
        (specifier) => specifier.local.name !== local
      )
      if (path.node.specifiers.length === 0) removeKeepingComments(path)
    })
}

function usesOutsideJsx(j, root, local) {
  return root
    .find(j.Identifier, { name: local })
    .filter(
      (path) =>
        path.node.type === 'Identifier' &&
        path.parent.node.type !== 'ImportSpecifier' &&
        !isReExportName(path) &&
        !(
          path.parent.node.type === 'MemberExpression' &&
          path.parent.node.property === path.node &&
          !path.parent.node.computed
        )
    )
    .size()
}

function reportLocalReExports(j, root, report, local) {
  root
    .find(j.ExportSpecifier, { local: { name: local } })
    .filter((path) => !path.parent.node.source)
    .forEach((path) => report(path.node, reExportedName(local)))
}

function isNamespaceMember(path, namespace, member) {
  const name = path.node.openingElement.name
  return (
    readsImport(path, namespace) &&
    name.type === 'JSXMemberExpression' &&
    name.object.type === 'JSXIdentifier' &&
    name.object.name === namespace &&
    name.property.name === member
  )
}

export default function transform(file, api) {
  const j = api.jscodeshift
  const root = j(file.source)
  const report = reporter(api)
  const targets = {}
  let changed = false

  // Returns whether the element is kept.
  function migrate(path, replacement) {
    const { openingElement, closingElement } = path.node
    const reason = blocker(openingElement)
    if (reason) {
      const name = jsxName(openingElement.name)
      report(openingElement, `<${name}> ${reason}. Migrate it by hand.`)
      return true
    }
    targets[replacement] ??= importButton(j, root, replacement)
    const as = attribute(openingElement, 'as')
    if (as) removeAttribute(openingElement, as)
    openingElement.name = j.jsxIdentifier(targets[replacement])
    if (closingElement) {
      closingElement.name = j.jsxIdentifier(targets[replacement])
    }
    changed = true
    return false
  }

  reportReExports(j, root, report, {
    isDeprecated: (source, name) =>
      COMPONENTS.test(source) && DEPRECATED.test(name),
    deprecatedIn: (source) => {
      if (source === LINK_BUTTON_SOURCE) return 'all'
      return source === '@oztix/roadie-components' ? BARREL_DEPRECATIONS : []
    }
  })

  for (const [deprecated, replacement] of Object.entries(REPLACEMENTS)) {
    for (const local of importedLocals(j, root, deprecated)) {
      reportLocalReExports(j, root, report, local)
      const elements = root.findJSXElements(local)
      let kept = usesOutsideJsx(j, root, local)
      elements.forEach((path) => {
        if (migrate(path, replacement)) kept += 1
      })
      if (kept === 0 && elements.size() > 0) dropSpecifier(j, root, local)
    }
  }

  for (const namespace of namespaceLocals(j, root, LINK_BUTTON_NAMESPACE)) {
    let migrated = false
    for (const [deprecated, replacement] of Object.entries(REPLACEMENTS)) {
      root
        .find(j.JSXElement)
        .filter((path) => isNamespaceMember(path, namespace, deprecated))
        .forEach((path) => {
          if (!migrate(path, replacement)) migrated = true
        })
    }
    const uses = namespaceUses(j, root, namespace)
    for (const { node, member } of uses) {
      if (!member) {
        report(node, readWhole(namespace))
      } else if (
        node.type !== 'JSXMemberExpression' &&
        DEPRECATED.test(member.name)
      ) {
        report(
          node,
          `${namespace}.${member.name} is used outside JSX. Migrate it by hand.`
        )
      }
    }
    if (migrated && uses.length === 0) dropSpecifier(j, root, namespace)
  }

  report.flush()
  return changed ? print(root, file.source) : file.source
}
