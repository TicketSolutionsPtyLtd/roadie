const DOCS = 'https://ticketsolutionsptyltd.github.io/roadie'

const PHOSPHOR = /^@phosphor-icons\/react(\/.*)?$/
const PHOSPHOR_NON_ICONS = /^(Icon|SSR)[A-Z]|^Icon$|Context$|Props$|Weight$/
const ICON_WEIGHTS = new Set(['bold', 'fill', 'duotone'])

const CLASS_ATTRIBUTE = /^className$|ClassName$/
const CLASS_FUNCTIONS = new Set(['cn', 'clsx', 'cva', 'cx', 'twMerge'])

const LAYOUT_CLASS =
  /(^|:|!)-?(grid|flex|inline-flex|inline-grid|block|inline-block|hidden|absolute|relative|fixed|sticky|(gap|space|[mp][trblxyse]?|w|h|min|max-[wh]|grid-(cols|rows|flow)|col|row|flex|items|justify|place|self|inset|top|right|bottom|left|start|end)-.+)$/

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
      // className={cn('…')} reaches each string through both visitors.
      const checked = new WeakSet()
      const check = (root) => {
        for (const { node, text } of stringParts(root, visitorKeys)) {
          if (checked.has(node)) continue
          checked.add(node)
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

// flatCodeBlocks lints fences as virtual files named page.mdx/0.tsx, and
// those are copyable consumer code, not page layout.
function mdxContentRule(rule) {
  return {
    ...rule,
    create: (context) =>
      context.filename.endsWith('.mdx') ? rule.create(context) : {}
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

function staticString(node) {
  if (node?.type === 'JSXExpressionContainer')
    return staticString(node.expression)
  if (node?.type === 'Literal' && typeof node.value === 'string') {
    return node.value
  }
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked
  }
  return undefined
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
          if (node.attributes.some((a) => a.type === 'JSXSpreadAttribute')) {
            return
          }
          context.report({
            node,
            message: `Set weight='bold', since Phosphor defaults to regular. See ${DOCS}/foundations/iconography.`
          })
          return
        }
        for (const value of staticBranches(weight.value)) {
          if (ICON_WEIGHTS.has(value)) continue
          context.report({
            node: weight,
            message: `Use weight bold, or fill or duotone where those apply, not ${value}. See ${DOCS}/foundations/iconography.`
          })
        }
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
  'no-mdx-layout-class': mdxContentRule(
    classRule(
      'No className layout in docs MDX.',
      LAYOUT_CLASS,
      'Lay out MDX with the docs components (Guidelines, Guideline width, Guideline.Row), not {{token}}. See docs/contributing/DOCS_PAGES.md.'
    )
  ),
  'no-import-meta-env': selectorRule(
    'Dev-only checks read process.env.NODE_ENV.',
    "MemberExpression[object.type='MetaProperty'][property.name='env']",
    "Use process.env.NODE_ENV behind a typeof process !== 'undefined' guard. See docs/solutions/build-errors/cross-bundler-dev-env-check.md."
  ),
  'no-dynamic-next-import': selectorRule(
    'No dynamic next or next/* imports.',
    // esquery regexes cannot contain a slash.
    'ImportExpression[source.value=/^next(\\x2F|$)/]',
    'The React skin routes through onNavigate, not next/*.'
  ),
  'no-dynamic-next-link': selectorRule(
    'No dynamic next/link imports.',
    'ImportExpression[source.value=/^next\\x2Flink$/]',
    'Pass href and let the Link given to RoadieProvider route it. See AGENTS.md, Links and forms.'
  ),
  'no-dynamic-zod-import': selectorRule(
    'Zod-free modules do not import zod or ./schema dynamically.',
    'ImportExpression[source.value=/^(zod|\\.\\x2Fschema)$/]',
    'Keep this module zod-free; import only types from ./schema.'
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
    "CallExpression[callee.property.name='toHaveClass'] Literal[value=/calc\\(|@container|(^|\\s|:)(max-)?(sm|md|lg|xl|2xl):/]",
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
