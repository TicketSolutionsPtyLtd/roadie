import {
  namespaceUses,
  print,
  reExportedName,
  readWhole,
  renameReferences,
  reporter
} from './lib.js'

export const parser = 'tsx'

const FROM = '@oztix/roadie-components/spot-illustrations'
const TO = '@oztix/roadie-illustrations/spot'
const SHARED_PROPS = 'SpotIllustrationComponentProps'

const ILLUSTRATIONS = [
  'ArrowUpRight',
  'CowboyHat',
  'Cursor',
  'FlowerSpiral',
  'Football',
  'Hand',
  'Heart',
  'HighFive',
  'MapPin',
  'NoteMusic',
  'Ticket',
  'WineGlass'
]

const PROPS_TYPES = new Set(ILLUSTRATIONS.map((name) => `${name}Props`))

// These changed shape or aren't in the new package, so they stay put.
const LEFT = {
  SpotIllustration:
    'SpotIllustration takes `layers` in place of `illustration` in @oztix/roadie-illustrations/spot. Move it by hand.',
  SpotIllustrationProps:
    'SpotIllustrationProps takes `layers` in place of `illustration` in @oztix/roadie-illustrations/spot. Move it by hand.',
  createSpotIllustration:
    "createSpotIllustration isn't in @oztix/roadie-illustrations. Draw the art as a source in that package, or keep this import until the next major."
}

const importedName = (specifier) =>
  specifier.type === 'ImportSpecifier' ? specifier.imported.name : undefined

// A name is the app's own when it's declared, or imported from elsewhere.
function declaresElsewhere(j, root, name) {
  const imported = root
    .find(j.ImportDeclaration)
    .filter((path) => path.node.source.value !== FROM)
    .some((path) =>
      (path.node.specifiers ?? []).some(
        (specifier) => specifier.local?.name === name
      )
    )
  const declared = [
    j.TSTypeAliasDeclaration,
    j.TSInterfaceDeclaration,
    j.VariableDeclarator,
    j.FunctionDeclaration,
    j.ClassDeclaration
  ].some((type) => root.find(type, { id: { name } }).size() > 0)
  return imported || declared
}

export default function transform(file, api) {
  const j = api.jscodeshift
  const root = j(file.source)
  const report = reporter(api)
  let changed = false

  const userOwnsSharedProps = declaresElsewhere(j, root, SHARED_PROPS)
  let sharedPropsImported = root
    .find(j.ImportDeclaration, { source: { value: FROM } })
    .some((path) =>
      (path.node.specifiers ?? []).some(
        (specifier) =>
          importedName(specifier) === SHARED_PROPS &&
          specifier.local.name === SHARED_PROPS
      )
    )

  const moveSpecifier = (specifier) => {
    const name = importedName(specifier)
    if (!PROPS_TYPES.has(name)) return specifier
    const local = specifier.local.name
    // Renaming would also rename an unrelated binding of either name.
    if (userOwnsSharedProps || declaresElsewhere(j, root, local)) {
      const aliased = j.importSpecifier(
        j.identifier(SHARED_PROPS),
        j.identifier(local)
      )
      aliased.importKind = specifier.importKind
      return aliased
    }
    renameReferences(j, root, local, SHARED_PROPS, report)
    if (sharedPropsImported) return undefined
    sharedPropsImported = true
    const shared = j.importSpecifier(j.identifier(SHARED_PROPS))
    shared.importKind = specifier.importKind
    return shared
  }

  root
    .find(j.ImportDeclaration, { source: { value: FROM } })
    .forEach((path) => {
      const specifiers = path.node.specifiers ?? []
      const namespace = specifiers.find(
        (specifier) => specifier.type === 'ImportNamespaceSpecifier'
      )
      if (namespace) {
        const uses = [...namespaceUses(j, root, namespace.local.name)]
        const whole = uses.find(({ member }) => !member)
        const left = uses.filter(({ member }) => LEFT[member?.name])
        if (whole) report(whole.node, readWhole(namespace.local.name))
        for (const { node, member } of left) report(node, LEFT[member.name])
        if (whole || left.length > 0) return
        for (const { member } of uses) {
          if (PROPS_TYPES.has(member.name)) member.name = SHARED_PROPS
        }
        path.node.source = j.stringLiteral(TO)
        changed = true
        return
      }

      const staying = specifiers.filter((specifier) =>
        Boolean(LEFT[importedName(specifier)])
      )
      for (const specifier of staying) {
        report(specifier, LEFT[importedName(specifier)])
      }
      const moving = specifiers
        .filter((specifier) => !staying.includes(specifier))
        .map(moveSpecifier)
        .filter(Boolean)
      if (moving.length === 0) return
      changed = true
      if (staying.length === 0) {
        path.node.source = j.stringLiteral(TO)
        path.node.specifiers = moving
        return
      }
      path.node.specifiers = staying
      const moved = j.importDeclaration(moving, j.stringLiteral(TO))
      moved.importKind = path.node.importKind
      path.insertAfter(moved)
    })

  root
    .find(j.ExportNamedDeclaration, { source: { value: FROM } })
    .forEach((path) => {
      const deprecated = (path.node.specifiers ?? []).filter(
        (specifier) =>
          specifier.type !== 'ExportSpecifier' ||
          PROPS_TYPES.has(specifier.local.name) ||
          LEFT[specifier.local.name]
      )
      for (const specifier of deprecated) {
        report(specifier, reExportedName(specifier.local?.name ?? '*'))
      }
      if (deprecated.length > 0) return
      path.node.source = j.stringLiteral(TO)
      changed = true
    })

  root
    .find(j.ExportAllDeclaration, { source: { value: FROM } })
    .forEach((path) =>
      report(
        path.node,
        `'${FROM}' is re-exported whole, and its exports changed in @oztix/roadie-illustrations/spot. Migrate it by hand.`
      )
    )

  root
    .find(j.CallExpression, { callee: { type: 'Import' } })
    .filter((path) => path.node.arguments[0]?.value === FROM)
    .forEach((path) =>
      report(
        path.node,
        `import('${FROM}') loads the deprecated module. Load @oztix/roadie-illustrations/spot by hand, checking what it reads.`
      )
    )

  report.flush()
  return changed ? print(root, file.source) : file.source
}
