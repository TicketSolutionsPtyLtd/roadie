const COLORS =
  'https://ticketsolutionsptyltd.github.io/roadie/foundations/colors'
const ELEVATION =
  'https://ticketsolutionsptyltd.github.io/roadie/foundations/elevation'

const CLASS_ATTRIBUTE = /^className$|ClassName$/
const CLASS_FUNCTIONS = new Set(['cn', 'clsx', 'cva', 'cx', 'twMerge'])

export function stringParts(root, visitorKeys) {
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

export function classStrings(context, checkParts) {
  const { visitorKeys } = context.sourceCode
  // className={cn('…')} reaches each string through both visitors.
  const checked = new WeakSet()
  const check = (roots) =>
    checkParts(
      roots
        .flatMap((root) => stringParts(root, visitorKeys))
        .filter(({ node }) => {
          if (checked.has(node)) return false
          checked.add(node)
          return true
        })
    )
  return {
    JSXAttribute(node) {
      if (CLASS_ATTRIBUTE.test(node.name.name)) check([node.value])
    },
    CallExpression(node) {
      if (CLASS_FUNCTIONS.has(node.callee.name)) check(node.arguments)
    }
  }
}

export const classPattern = (context, pattern, message) =>
  classStrings(context, (parts) => {
    for (const { node, text } of parts) {
      for (const token of text.split(/\s+/)) {
        if (pattern.test(token)) {
          context.report({ node, message, data: { token } })
        }
      }
    }
  })

export function classRule(description, pattern, message) {
  return {
    meta: { type: 'problem', docs: { description }, schema: [] },
    create: (context) => classPattern(context, pattern, message)
  }
}

export const classRules = {
  'no-dark-variant': classRule(
    'No dark: variants.',
    /(^|:)dark:/,
    `Remove {{token}}: .dark swaps the colour scales, so semantic utilities need no dark: variant. See ${COLORS}.`
  ),
  'no-hex-colour-class': classRule(
    'No raw hex colours in class strings.',
    /#[0-9a-f]{3,8}(?![0-9a-z])/i,
    `Replace {{token}} with a semantic colour utility. See ${COLORS}.`
  ),
  'no-arbitrary-z-index': classRule(
    'No arbitrary z-index classes.',
    /(^|:|!)-?z-\[/,
    `Replace {{token}} with a named z tier or a plain z-1 style value. See ${ELEVATION}.`
  )
}
