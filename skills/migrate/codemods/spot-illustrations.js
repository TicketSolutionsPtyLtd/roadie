import {
  namespaceUses,
  print,
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

const REEXPORTED_WHOLE = `'${FROM}' is re-exported whole, and its exports changed in ${TO}. Migrate it by hand.`

// `export { 'a-b' as c }` names an export with a string.
const nameOf = (node) => node.name ?? node.value

// Why a re-export stays on the old path, or undefined when it can move.
function reExportLeft(specifier) {
  if (specifier.type !== 'ExportSpecifier') return REEXPORTED_WHOLE
  const name = nameOf(specifier.local)
  if (LEFT[name]) return LEFT[name]
  if (PROPS_TYPES.has(name) && specifier.exported.type !== 'Identifier') {
    return `${name} is re-exported under a string name. Re-export ${SHARED_PROPS} from ${TO} under that name by hand.`
  }
  return undefined
}

const importedName = (specifier) =>
  specifier.type === 'ImportSpecifier' ? nameOf(specifier.imported) : undefined

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
    j.TSEnumDeclaration,
    j.VariableDeclarator,
    j.FunctionDeclaration,
    j.ClassDeclaration
  ].some((type) => root.find(type, { id: { name } }).size() > 0)
  const typeParameter = root.find(j.TSTypeParameter, { name }).size() > 0
  return imported || declared || typeParameter
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
      const specifiers = path.node.specifiers ?? []
      const staying = specifiers.filter(reExportLeft)
      for (const specifier of staying) {
        report(specifier, reExportLeft(specifier))
      }
      const moving = specifiers
        .filter((specifier) => !staying.includes(specifier))
        .map((specifier) => {
          if (!PROPS_TYPES.has(nameOf(specifier.local))) return specifier
          // The alias keeps the module's own public name.
          const aliased = j.exportSpecifier.from({
            local: j.identifier(SHARED_PROPS),
            exported: j.identifier(specifier.exported.name)
          })
          aliased.exportKind = specifier.exportKind
          return aliased
        })
      if (moving.length === 0) return
      changed = true
      if (staying.length === 0) {
        path.node.source = j.stringLiteral(TO)
        path.node.specifiers = moving
        return
      }
      path.node.specifiers = staying
      const moved = j.exportNamedDeclaration(null, moving, j.stringLiteral(TO))
      moved.exportKind = path.node.exportKind
      path.insertAfter(moved)
    })

  root
    .find(j.ExportAllDeclaration, { source: { value: FROM } })
    .forEach((path) => report(path.node, REEXPORTED_WHOLE))

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
