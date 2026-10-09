import {
  COMPONENTS,
  attribute,
  importedLocals,
  print,
  removeAttribute,
  reporter,
  stringValue
} from './lib.js'

export const parser = 'tsx'

const REPLACEMENTS = { LinkButton: 'Button', LinkIconButton: 'IconButton' }
const BUTTON_SOURCE = '@oztix/roadie-components/button'

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

  const taken = root.find(j.Identifier, { name }).size() > 0
  const local = taken ? `Roadie${name}` : name
  const specifier = j.importSpecifier(j.identifier(name), j.identifier(local))
  const buttonImport = root
    .find(j.ImportDeclaration, { source: { value: BUTTON_SOURCE } })
    .filter((path) => path.node.importKind !== 'type')
  if (buttonImport.size() > 0) {
    buttonImport.get().node.specifiers.push(specifier)
  } else {
    root
      .find(j.ImportDeclaration)
      .filter((path) => COMPONENTS.test(path.node.source.value))
      .at(0)
      .insertBefore(
        j.importDeclaration([specifier], j.stringLiteral(BUTTON_SOURCE))
      )
  }
  return local
}

function dropSpecifier(j, root, local) {
  root
    .find(j.ImportDeclaration)
    .filter((path) => COMPONENTS.test(path.node.source.value))
    .forEach((path) => {
      path.node.specifiers = path.node.specifiers.filter(
        (specifier) => specifier.local.name !== local
      )
      if (path.node.specifiers.length === 0) j(path).remove()
    })
}

function usesOutsideJsx(j, root, local) {
  return root
    .find(j.Identifier, { name: local })
    .filter(
      (path) =>
        path.node.type === 'Identifier' &&
        path.parent.node.type !== 'ImportSpecifier' &&
        !(
          path.parent.node.type === 'MemberExpression' &&
          path.parent.node.property === path.node &&
          !path.parent.node.computed
        )
    )
    .size()
}

export default function transform(file, api) {
  const j = api.jscodeshift
  const root = j(file.source)
  const report = reporter(api)
  let changed = false

  for (const [deprecated, replacement] of Object.entries(REPLACEMENTS)) {
    for (const local of importedLocals(j, root, deprecated)) {
      const elements = root.findJSXElements(local)
      let kept = usesOutsideJsx(j, root, local)
      let target

      elements.forEach((path) => {
        const { openingElement, closingElement } = path.node
        const reason = blocker(openingElement)
        if (reason) {
          report(openingElement, `<${local}> ${reason}. Migrate it by hand.`)
          kept += 1
          return
        }
        target ??= importButton(j, root, replacement)
        const as = attribute(openingElement, 'as')
        if (as) removeAttribute(openingElement, as)
        openingElement.name = j.jsxIdentifier(target)
        if (closingElement) closingElement.name = j.jsxIdentifier(target)
        changed = true
      })

      if (kept === 0 && elements.size() > 0) dropSpecifier(j, root, local)
    }
  }

  return changed ? print(root, file.source) : file.source
}
