import { staticString } from './ast.js'
import { docsPage } from './docs.js'
import { canonicalClasses } from './tailwind.js'

const COLORS = docsPage('foundations/colors')
const SHAPE = docsPage('foundations/shape')
const LINTING = docsPage('overview/linting')
const ELEVATION = docsPage('foundations/elevation')

const CLASS_ATTRIBUTE = /^className$|ClassName$/
const CLASS_FUNCTIONS = new Set(['cn', 'clsx', 'cva', 'cx', 'tv', 'twMerge'])
const CLASS_DATA = new Set([
  'Literal',
  'TemplateLiteral',
  'ArrayExpression',
  'ObjectExpression'
])
const TYPE_WRAPPERS = new Set(['TSAsExpression', 'TSSatisfiesExpression'])

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

// cn(variants[size]) reads the strings in const variants = { … }.
function constClassData(sourceCode, identifier) {
  const reference = sourceCode
    .getScope(identifier)
    .references.find((candidate) => candidate.identifier === identifier)
  const definition = reference?.resolved?.defs[0]
  if (definition?.type !== 'Variable' || definition.parent.kind !== 'const') {
    return undefined
  }
  let init = definition.node.init
  while (TYPE_WRAPPERS.has(init?.type)) init = init.expression
  return CLASS_DATA.has(init?.type) ? init : undefined
}

// A condition picks classes without being one, as in cn(path === HREF && 'p-2').
// Only + builds a class from operands; any other operator tests them.
const isComparison = (node) =>
  node.type === 'BinaryExpression' && node.operator !== '+'

function conditionOf(node) {
  if (node.type === 'ConditionalExpression') return node.test
  if (node.type === 'LogicalExpression' && node.operator === '&&') {
    return node.left
  }
  return undefined
}

function stringParts(root, sourceCode) {
  const { visitorKeys } = sourceCode
  const parts = []
  // Bindings are followed one level, so a constant built from another isn't.
  const visit = (node, followed) => {
    if (!node || typeof node.type !== 'string' || isComparison(node)) return
    if (node.type === 'Identifier' && !followed) {
      visit(constClassData(sourceCode, node), true)
    } else if (node.type === 'Literal' && typeof node.value === 'string') {
      parts.push({ node, text: node.value })
    } else if (node.type === 'TemplateElement') {
      parts.push({ node, text: node.value.cooked ?? node.value.raw })
    }
    const condition = conditionOf(node)
    for (const key of visitorKeys[node.type] ?? []) {
      for (const child of [node[key]].flat()) {
        if (child !== condition) visit(child, followed)
      }
    }
  }
  visit(root, false)
  return parts
}

function classStrings(context, checkParts) {
  // className={cn('…')} reaches each string through both visitors, and a
  // constant through every use, so each problem is reported once. Every use
  // is still read, since a later one can give a string its meaning.
  const reported = new WeakMap()
  const firstReport = (node, id) => {
    const ids = reported.get(node) ?? new Set()
    reported.set(node, ids)
    if (ids.has(id)) return false
    ids.add(id)
    return true
  }
  const check = (roots) =>
    checkParts(
      roots.flatMap((root) => stringParts(root, context.sourceCode)),
      firstReport
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
  classStrings(context, (parts, firstReport) => {
    for (const { node, text } of parts) {
      for (const [i, token] of text.split(/\s+/).entries()) {
        if (pattern.test(token) && firstReport(node, i)) {
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

// A token at a template's ${…} edge is part of a class, such as p-${size}.
function wholeTokens({ node, text }) {
  const isTemplate = node.type === 'TemplateElement'
  const tokens = [...text.matchAll(/\S+/g)]
  return tokens.filter(({ index, 0: token }) => {
    const touchesStart = index === 0 && isTemplate && !isHead(node)
    const touchesEnd =
      index + token.length === text.length && isTemplate && !node.tail
    return !touchesStart && !touchesEnd
  })
}

const isHead = (node) => node.parent?.quasis?.[0] === node

// The utility after the last variant colon outside brackets, without !.
function utilityOf(token) {
  let depth = 0
  let start = 0
  for (let i = 0; i < token.length; i++) {
    if ('[('.includes(token[i])) depth++
    else if ('])'.includes(token[i])) depth--
    else if (token[i] === ':' && depth === 0) start = i + 1
  }
  return token.slice(start).replace(/^!/, '')
}

// Roadie's hide tier is -1, so Tailwind writes z-1 and z-[1] as -z-hide,
// which reads as a different tier. A negative value, such as top-[-1px], may
// still become a negative class, such as -top-px.
const NEGATIVE = /^-|[[(:*_,]-[\d.]/

const negatesATier = (token, canonical) =>
  utilityOf(canonical).startsWith('-') && !NEGATIVE.test(utilityOf(token))

const canonicalClass = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: { description: 'Tailwind classes in their canonical form.' },
    schema: []
  },
  create: (context) =>
    classStrings(context, (parts, firstReport) => {
      const found = parts.flatMap((part) =>
        wholeTokens(part).map((match) => ({ part, match }))
      )
      const canonical = canonicalClasses(
        context.filename,
        found.map(({ match }) => match[0])
      )
      if (!canonical) return
      found.forEach(({ part: { node, text }, match }, i) => {
        const token = match[0]
        if (!canonical[i] || canonical[i] === token) return
        if (negatesATier(token, canonical[i])) return
        if (!firstReport(node, match.index)) return
        // An escape makes the source differ from the text, so there's no fix.
        const offset = context.sourceCode.getText(node).indexOf(text)
        const start = node.range[0] + offset + match.index
        context.report({
          node,
          message: `Replace {{token}} with {{canonical}}, its canonical form. See ${LINTING}.`,
          data: { token, canonical: canonical[i] },
          fix:
            offset < 0
              ? null
              : (fixer) =>
                  fixer.replaceTextRange(
                    [start, start + token.length],
                    canonical[i]
                  )
        })
      })
    })
}

export const classRules = {
  'canonical-class': canonicalClass,
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
      const variables = classStrings(context, (parts, firstReport) => {
        const tokens = parts.flatMap(({ node, text }) =>
          text.split(/\s+/).map((token, i) => ({ node, token, i }))
        )
        const read = radiusVariables(tokens.map(({ token }) => token))
        for (const { node, token, i } of tokens) {
          const [, name, value] = VARIABLE_ASSIGNMENT.exec(token) ?? []
          if (read.has(name) && hasRawLength(value) && firstReport(node, i)) {
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
            stringParts(className, context.sourceCode).flatMap(({ text }) =>
              text.split(/\s+/)
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
