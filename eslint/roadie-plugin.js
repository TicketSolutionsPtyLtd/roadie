const DOCS = 'https://ticketsolutionsptyltd.github.io/roadie'

const PHOSPHOR = /^@phosphor-icons\/react(\/.*)?$/
const PHOSPHOR_NON_ICONS = /^(Icon|SSR)[A-Z]|^Icon$|Context$|Props$|Weight$/
const ICON_WEIGHTS = new Set(['bold', 'fill', 'duotone'])

const CLASS_ATTRIBUTE = /^className$|ClassName$/
const CLASS_FUNCTIONS = new Set(['cn', 'clsx', 'cva', 'cx', 'twMerge'])

const LAYOUT_CLASS =
  /(^|:|!)-?(grid|flex|inline|inline-flex|inline-grid|block|inline-block|flow-root|contents|hidden|container|grow|shrink|absolute|relative|fixed|sticky|(gap|space|[mp][trblxyse]?|w|h|min|max-[wh]|grid-(cols|rows|flow)|col|row|flex|basis|grow|shrink|order|columns|items|justify|place|self|inset|top|right|bottom|left|start|end)-.+)!?$/

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

// flatCodeBlocks lints fences as virtual files such as page.mdx/0.tsx, or
// page.mdx/0.mdx for an mdx fence, and those are copyable code, not layout.
function mdxContentRule(rule) {
  return {
    ...rule,
    create: (context) =>
      context.filename.endsWith('.mdx') &&
      context.filename === context.physicalFilename
        ? rule.create(context)
        : {}
  }
}

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

// Navigator.Item renders its icon duotone, so it takes the icon bare.
function isNavigatorItemIcon(openingElement) {
  const attribute = openingElement.parent.parent?.parent
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

// Classes the fence options reproduce: layout=, gap=, width=, and a caption.
const FENCE_LAYOUT_CLASS =
  /^(grid|flex|flex-row|flex-wrap|items-center|gap-[123468]|w-(40|48|64|72|80|140|180)|max-w-(full|40|48|64|72|80|140|180))$/
const CAPTION_CLASS = new Set(['text-sm', 'text-subtle'])

const classTokens = (element) => {
  const attribute = element.openingElement.attributes.find(
    (node) => node.type === 'JSXAttribute' && node.name.name === 'className'
  )
  return staticString(attribute?.value)?.split(/\s+/).filter(Boolean)
}

const isElement = (node, name) =>
  node?.type === 'JSXElement' && node.openingElement.name.name === name

// Any prop besides className, such as role or style, is more than layout.
const isLayoutDiv = (node) =>
  isElement(node, 'div') &&
  node.openingElement.attributes.length === 1 &&
  classTokens(node)?.every((token) => FENCE_LAYOUT_CLASS.test(token))

const isCaption = (node) => {
  const tokens = isElement(node, 'p') ? classTokens(node) : undefined
  return (
    tokens?.length === CAPTION_CLASS.size &&
    tokens.every((token) => CAPTION_CLASS.has(token))
  )
}

// No delay, or 0, only yields to the next task.
const isDelay = (node) =>
  node !== undefined &&
  !(node.type === 'Literal' && typeof node.value === 'number' && node.value < 1)

const isNewPromise = (node) =>
  node.type === 'NewExpression' && node.callee.name === 'Promise'

const isFunction = (node) =>
  /^(Arrow)?Function(Expression|Declaration)$/.test(node.type)

/** The declaration of a function that resolves when `promise` does, such as `const wait = (ms) => withFrames(() => new Promise(…))`. */
function sleepHelper(promise) {
  let node = promise
  for (;;) {
    const { parent } = node
    if (
      parent.type === 'AwaitExpression' ||
      (parent.type === 'CallExpression' && parent.arguments.includes(node)) ||
      (isFunction(parent) && parent.body === node)
    ) {
      node = parent
    } else if (
      (parent.type === 'ReturnStatement' ||
        (parent.type === 'ExpressionStatement' &&
          node.type === 'AwaitExpression')) &&
      parent.parent.type === 'BlockStatement' &&
      parent.parent.body.length === 1 &&
      isFunction(parent.parent.parent)
    ) {
      node = parent.parent.parent
    } else {
      return undefined
    }
    if (node.type === 'FunctionDeclaration') return node
    if (
      isFunction(node) &&
      node.parent.type === 'VariableDeclarator' &&
      node.parent.id.type === 'Identifier'
    )
      return node.parent
  }
}

const callsTo = (declaration, sourceCode) =>
  sourceCode
    .getDeclaredVariables(declaration)
    .filter((variable) => variable.name === declaration.id.name)
    .flatMap((variable) => variable.references)
    .map((reference) => reference.identifier)
    .filter(
      (identifier) =>
        identifier.parent.type === 'CallExpression' &&
        identifier.parent.callee === identifier
    )
    .map((identifier) => identifier.parent)

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
      iconAttribute(icons, 'size', (node) => {
        // An icon nested in an SVG, such as a QRCode mark, fills its viewport.
        if (staticString(node.value) === '100%') return
        context.report({
          node,
          message: `Size icons with a size-* class, not the size prop. See ${DOCS}/foundations/iconography.`
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
        if (isNavigatorItemIcon(node)) return
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
  'no-fence-layout-wrapper': {
    meta: {
      type: 'suggestion',
      docs: {
        description:
          'Inline live fences take preview layout from fence options, not a wrapper.'
      },
      schema: []
    },
    create(context) {
      const checkRoot = (node) => {
        if (!isLayoutDiv(node)) return
        const captioned = (child) =>
          isCaption(child) ||
          (isLayoutDiv(child) && child.children.some(isCaption))
        const kind = node.children.some(captioned)
          ? 'state label'
          : 'layout wrapper'
        context.report({
          node: node.openingElement,
          message: `Replace this ${kind} with fence options (layout=, gap=, width=, or a {/* Label */} caption), so copied code is only the component. See docs/contributing/COMPONENT_DOC_TEMPLATE.md rules 12 and 13.`
        })
      }
      return {
        'Program > ExpressionStatement > JSXElement': checkRoot,
        'Program > ExpressionStatement > JSXFragment > JSXElement': checkRoot
      }
    }
  },
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
  'no-fixed-sleep': {
    meta: {
      type: 'problem',
      docs: { description: 'Tests wait on a condition, not a fixed time.' },
      schema: []
    },
    create(context) {
      const { sourceCode } = context
      const report = (node) =>
        context.report({
          node,
          message:
            'Wait on a condition with expect.poll or waitFor, not a fixed sleep. See docs/contributing/PR_WORKFLOW.md section 2.'
        })
      return {
        "CallExpression[callee.name='setTimeout'], CallExpression[callee.property.name='setTimeout']"(
          node
        ) {
          if (!isDelay(node.arguments[1])) return
          const promise = sourceCode.getAncestors(node).findLast(isNewPromise)
          if (!promise) return
          report(node)
          const helper = sleepHelper(promise)
          if (helper) callsTo(helper, sourceCode).forEach(report)
        },
        "CallExpression[callee.property.name='waitForTimeout']": report,
        "Property[key.name='type'][value.value='wait']": report
      }
    }
  },
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
  'no-cva-output-assertion': selectorRule(
    'Tests do not assert CVA output.',
    "CallExpression[callee.name='expect'] > CallExpression.arguments[callee.name=/Variants$/]",
    'Assert what a user sees, not the class string a variants function returns. See docs/contributing/CODING_STANDARDS.md, Test at the public interface.'
  )
}

export default { meta: { name: 'roadie' }, rules }
