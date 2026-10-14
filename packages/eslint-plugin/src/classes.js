import { staticString } from './ast.js'

const COLORS =
  'https://ticketsolutionsptyltd.github.io/roadie/foundations/colors'
const SHAPE = 'https://ticketsolutionsptyltd.github.io/roadie/foundations/shape'
const ELEVATION =
  'https://ticketsolutionsptyltd.github.io/roadie/foundations/elevation'

const CLASS_ATTRIBUTE = /^className$|ClassName$/
const CLASS_FUNCTIONS = new Set(['cn', 'clsx', 'cva', 'cx', 'twMerge'])

const ARBITRARY_RADIUS = /(^|:|!)rounded(-[a-z]{1,2})?-\[(?!inherit\])/
const RADIUS_VARIABLE =
  /(?:^|:|!)rounded(?:-[a-z]{1,2})?-\((?:length:)?(--[\w-]+)\)/
const VARIABLE_ASSIGNMENT = /(?:^|:|!)\[(--[\w-]+):(.+)\]!?$/
// Tailwind writes a space as _, so _2px is a length but radius-2xl is not.
const RAW_LENGTH = /(?<![a-z\d.-])(\d*\.?\d+)(?:[a-z]+|%)/g

const radiusVariables = (tokens) =>
  new Set(
    tokens.map((token) => RADIUS_VARIABLE.exec(token)?.[1]).filter(Boolean)
  )

// Zero is allowed, so a var() fallback of 0px passes.
const hasRawLength = (value) =>
  typeof value === 'string' &&
  [...value.matchAll(RAW_LENGTH)].some(([, number]) => Number(number) !== 0)

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

function classStrings(context, checkParts) {
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

const classPattern = (context, pattern, message) =>
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
  ),
  'no-arbitrary-radius': {
    meta: {
      type: 'problem',
      docs: { description: 'No arbitrary radius classes or variables.' },
      schema: []
    },
    create(context) {
      const reportRawRadius = (node, name, value) =>
        context.report({
          node,
          message: `Set ${name} to a named radius tier such as var(--radius-xl), or 0, not ${value}. See ${SHAPE}.`
        })
      const classes = classPattern(
        context,
        ARBITRARY_RADIUS,
        `Replace {{token}} with a named radius tier. See ${SHAPE}.`
      )
      const variables = classStrings(context, (parts) => {
        const tokens = parts.flatMap(({ node, text }) =>
          text.split(/\s+/).map((token) => ({ node, token }))
        )
        const read = radiusVariables(tokens.map(({ token }) => token))
        for (const { node, token } of tokens) {
          const [, name, value] = VARIABLE_ASSIGNMENT.exec(token) ?? []
          if (read.has(name) && hasRawLength(value)) {
            reportRawRadius(node, name, value)
          }
        }
      })
      return {
        JSXAttribute(node) {
          classes.JSXAttribute(node)
          variables.JSXAttribute(node)
        },
        CallExpression(node) {
          classes.CallExpression(node)
          variables.CallExpression(node)
        },
        // style={{ '--x': '7px' }} beside className='rounded-(--x)'.
        JSXOpeningElement(node) {
          const attribute = (name) =>
            node.attributes.find(
              (a) => a.type === 'JSXAttribute' && a.name.name === name
            )
          const style = attribute('style')?.value?.expression
          const className = attribute('className')?.value
          if (style?.type !== 'ObjectExpression' || !className) return
          const read = radiusVariables(
            stringParts(className, context.sourceCode.visitorKeys).flatMap(
              ({ text }) => text.split(/\s+/)
            )
          )
          for (const property of style.properties) {
            const name = property.key?.value
            const value = staticString(property.value)
            if (read.has(name) && hasRawLength(value)) {
              reportRawRadius(property, name, value)
            }
          }
        }
      }
    }
  }
}
