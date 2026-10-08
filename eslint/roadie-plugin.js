const DOCS = 'https://ticketsolutionsptyltd.github.io/roadie'

const PHOSPHOR = /^@phosphor-icons\/react(\/.*)?$/
const PHOSPHOR_NON_ICONS = /^(Icon|SSR)[A-Z]|^Icon$|Context$|Props$|Weight$/
const ICON_WEIGHTS = new Set(['bold', 'fill', 'duotone'])

const CLASS_ATTRIBUTE = /^className$|ClassName$/
const CLASS_FUNCTIONS = new Set(['cn', 'clsx', 'cva', 'cx', 'twMerge'])

function selectorRule(description, selector, message) {
  return {
    meta: { type: 'problem', docs: { description }, schema: [] },
    create: (context) => ({
      [selector]: (node) => context.report({ node, message })
    })
  }
}

function stringParts(root, visitorKeys) {
  const parts = []
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return
    if (node.type === 'Literal' && typeof node.value === 'string') {
      parts.push({ node, text: node.value })
    } else if (node.type === 'TemplateElement') {
      parts.push({ node, text: node.value.cooked ?? node.value.raw })
    }
    for (const key of visitorKeys[node.type] ?? []) {
      const child = node[key]
      if (Array.isArray(child)) child.forEach(visit)
      else visit(child)
    }
  }
  visit(root)
  return parts
}

function classRule(description, pattern, message) {
  return {
    meta: { type: 'problem', docs: { description }, schema: [] },
    create(context) {
      const { visitorKeys } = context.sourceCode
      const check = (root) => {
        for (const { node, text } of stringParts(root, visitorKeys)) {
          for (const token of text.split(/\s+/)) {
            if (pattern.test(token)) {
              context.report({ node, message, data: { token } })
            }
          }
        }
      }
      return {
        JSXAttribute(node) {
          if (CLASS_ATTRIBUTE.test(node.name.name)) check(node.value)
        },
        CallExpression(node) {
          if (CLASS_FUNCTIONS.has(node.callee.name)) {
            node.arguments.forEach(check)
          }
        }
      }
    }
  }
}

function phosphorRule(description, create) {
  return {
    meta: { type: 'problem', docs: { description }, schema: [] },
    create(context) {
      const icons = new Set()
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

const rules = {
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
            message: `Import ${name}Icon, not ${name}. See ${DOCS}/foundations/iconography.`
          })
        }
      }
    })
  },
  'phosphor-icon-size-prop': phosphorRule(
    'Phosphor icons are sized with size-* classes.',
    (context, icons) =>
      iconAttribute(icons, 'size', (node) =>
        context.report({
          node,
          message: `Size icons with a size-* class, not the size prop. See ${DOCS}/foundations/iconography.`
        })
      )
  ),
  'phosphor-icon-weight': phosphorRule(
    'Phosphor icons are bold, or fill or duotone where those apply.',
    (context, icons) =>
      iconAttribute(icons, 'weight', (node) => {
        const value = node.value
        if (value?.type === 'Literal' && !ICON_WEIGHTS.has(value.value)) {
          context.report({
            node,
            message: `Use weight bold, or fill or duotone where those apply, not ${value.value}. See ${DOCS}/foundations/iconography.`
          })
        }
      })
  ),
  'no-dark-variant': classRule(
    'No dark: variants.',
    /(^|:)dark:/,
    `Remove {{token}}: .dark swaps the colour scales, so semantic utilities need no dark: variant. See ${DOCS}/foundations/colors.`
  ),
  'no-hex-colour-class': classRule(
    'No raw hex colours in class strings.',
    /#[0-9a-f]{3,8}(?![0-9a-z])/i,
    `Replace {{token}} with a semantic colour utility. See ${DOCS}/foundations/colors.`
  ),
  'no-arbitrary-z-index': classRule(
    'No arbitrary z-index classes.',
    /(^|:|!)-?z-\[/,
    `Replace {{token}} with a named z tier or a plain z-1 style value. See ${DOCS}/foundations/elevation.`
  ),
  'no-arbitrary-radius': classRule(
    'No arbitrary radius classes.',
    /(^|:|!)rounded(-[a-z]{1,2})?-\[(?!inherit\])/,
    `Replace {{token}} with a named radius tier. See ${DOCS}/foundations/shape.`
  ),
  'no-import-meta-env': selectorRule(
    'Dev-only checks read process.env.NODE_ENV.',
    "MemberExpression[object.type='MetaProperty'][property.name='env']",
    "Use process.env.NODE_ENV behind a typeof process !== 'undefined' guard. See docs/solutions/build-errors/cross-bundler-dev-env-check.md."
  ),
  'no-fixed-sleep': selectorRule(
    'Tests wait on a condition, not a fixed time.',
    [
      "NewExpression[callee.name='Promise'] CallExpression[callee.name='setTimeout'][arguments.1.type='Literal'][arguments.1.value>=1]",
      "CallExpression[callee.property.name='waitForTimeout']",
      "Property[key.name='type'][value.value='wait']"
    ].join(', '),
    'Wait on a condition with expect.poll or waitFor, not a fixed sleep. See docs/contributing/PR_WORKFLOW.md section 2.'
  ),
  'no-css-source-in-jsdom': selectorRule(
    'jsdom tests do not read CSS source.',
    [
      'ImportDeclaration[source.value=/\\.css\\?raw$/]',
      "CallExpression[callee.name='readFileSync'] Literal[value=/\\.css$/]",
      "CallExpression[callee.property.name='readFileSync'] Literal[value=/\\.css$/]"
    ].join(', '),
    'Assert rendered behaviour in a *.browser.test.tsx, not CSS source. See AGENTS.md, Tests and code.'
  ),
  'no-css-class-in-jsdom': selectorRule(
    'jsdom tests do not assert classes that only CSS can evaluate.',
    "CallExpression[callee.property.name='toHaveClass'] Literal[value=/calc\\(|@container|(^|\\s|:)(max-)?lg:/]",
    'jsdom cannot evaluate calc(), container queries, or breakpoints. Assert this in a *.browser.test.tsx. See AGENTS.md, Tests and code.'
  ),
  'no-compound-root-identity': selectorRule(
    'Tests do not assert a compound equals its Root.',
    "CallExpression[callee.property.name='toBe'][callee.object.callee.name='expect'][arguments.0.type='MemberExpression'][arguments.0.property.name='Root']",
    'Render the compound and assert its behaviour, not that it is its Root. See docs/contributing/CODING_STANDARDS.md, Test at the public interface.'
  ),
  'no-cva-output-assertion': selectorRule(
    'Tests do not assert CVA output.',
    "CallExpression[callee.name='expect'] > CallExpression.arguments[callee.name=/Variants$/]",
    'Assert what a user sees, not the class string a variants function returns. See docs/contributing/CODING_STANDARDS.md, Test at the public interface.'
  )
}

export default { meta: { name: 'roadie' }, rules }
