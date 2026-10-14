import { staticString } from './ast.js'

const ICONOGRAPHY =
  'https://ticketsolutionsptyltd.github.io/roadie/foundations/iconography'

const PHOSPHOR = /^@phosphor-icons\/react(\/.*)?$/
const PHOSPHOR_NON_ICONS = /^(Icon|SSR)[A-Z]|^Icon$|Context$|Props$|Weight$/

export function phosphorRule(description, create) {
  return {
    meta: { type: 'problem', docs: { description }, schema: [] },
    create(context) {
      // Code with icons in scope but no import, such as docs live examples,
      // names them in settings.roadie.phosphorIcons.
      const icons = new Set(context.settings.roadie?.phosphorIcons)
      return {
        ImportDeclaration(node) {
          if (!PHOSPHOR.test(node.source.value)) return
          for (const specifier of node.specifiers) {
            if (specifier.type === 'ImportSpecifier') {
              icons.add(specifier.local.name)
            }
          }
        },
        ...create(context, icons)
      }
    }
  }
}

function iconAttribute(icons, attributeName, report) {
  return {
    JSXAttribute(node) {
      const element = node.parent
      if (
        node.name.name === attributeName &&
        element.name.type === 'JSXIdentifier' &&
        icons.has(element.name.name)
      ) {
        report(node)
      }
    }
  }
}

export const phosphorRules = {
  'phosphor-icon-suffix': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Phosphor icons are imported by their Icon-suffixed name.'
      },
      schema: []
    },
    create: (context) => ({
      ImportDeclaration(node) {
        if (!PHOSPHOR.test(node.source.value) || node.importKind === 'type') {
          return
        }
        for (const specifier of node.specifiers) {
          if (specifier.type !== 'ImportSpecifier') continue
          if (specifier.importKind === 'type') continue
          const name = specifier.imported.name
          if (name.endsWith('Icon') || PHOSPHOR_NON_ICONS.test(name)) continue
          context.report({
            node: specifier,
            message: `Import ${name}Icon, not ${name}. See ${ICONOGRAPHY}.`
          })
        }
      }
    })
  },
  'phosphor-icon-size-prop': phosphorRule(
    'Phosphor icons are sized with size-* classes.',
    (context, icons) =>
      iconAttribute(icons, 'size', (node) => {
        // An icon nested in an SVG, such as a QRCode mark, fills its viewport.
        if (staticString(node.value) === '100%') return
        context.report({
          node,
          message: `Size icons with a size-* class, not the size prop. See ${ICONOGRAPHY}.`
        })
      })
  )
}
