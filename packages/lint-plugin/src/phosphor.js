import { staticString } from './ast.js'
import { docsPage } from './docs.js'

const ICONOGRAPHY = docsPage('foundations/iconography')

const PHOSPHOR = /^@phosphor-icons\/react(\/.*)?$/
const PHOSPHOR_NON_ICONS = /^(Icon|SSR)[A-Z]|^Icon$|Context$|Props$|Weight$/
const ICON_WEIGHTS = new Set(['bold', 'fill', 'duotone'])

function phosphorRule(description, create) {
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

// A selected state picks its weight at runtime, so only the literal
// branches of a ternary or fallback can be checked.
function staticBranches(node) {
  if (node?.type === 'JSXExpressionContainer') {
    return staticBranches(node.expression)
  }
  if (node?.type === 'ConditionalExpression') {
    return [
      ...staticBranches(node.consequent),
      ...staticBranches(node.alternate)
    ]
  }
  if (node?.type === 'LogicalExpression') {
    return [...staticBranches(node.left), ...staticBranches(node.right)]
  }
  const value = staticString(node)
  return value === undefined ? [] : [value]
}

const BRANCHING = new Set(['ConditionalExpression', 'LogicalExpression'])

// Navigator.Item renders its icon duotone, so it takes the icon bare, even
// as a fallback such as icon={icons[href] ?? <HouseIcon />}.
function isNavigatorItemIcon(openingElement) {
  let node = openingElement.parent
  while (BRANCHING.has(node.parent?.type)) node = node.parent
  const attribute = node.parent?.parent
  const element = attribute?.parent?.name
  return (
    attribute?.type === 'JSXAttribute' &&
    attribute.name.name === 'icon' &&
    element?.type === 'JSXMemberExpression' &&
    element.object.name === 'Navigator' &&
    element.property.name === 'Item'
  )
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
  ),
  'phosphor-icon-weight': phosphorRule(
    'Phosphor icons are bold, or fill or duotone where those apply.',
    (context, icons) => ({
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier' || !icons.has(node.name.name)) {
          return
        }
        const weight = node.attributes.find(
          (attribute) =>
            attribute.type === 'JSXAttribute' &&
            attribute.name.name === 'weight'
        )
        if (!weight) {
          const spread = node.attributes.some(
            (a) => a.type === 'JSXSpreadAttribute'
          )
          if (spread || isNavigatorItemIcon(node)) return
          context.report({
            node,
            message: `Set weight='bold', since Phosphor defaults to regular. See ${ICONOGRAPHY}.`
          })
          return
        }
        for (const value of staticBranches(weight.value)) {
          if (ICON_WEIGHTS.has(value)) continue
          context.report({
            node: weight,
            message: `Use weight bold, or fill or duotone where those apply, not ${value}. See ${ICONOGRAPHY}.`
          })
        }
      }
    })
  )
}
