import { staticString } from './ast.js'

const TESTING =
  'https://ticketsolutionsptyltd.github.io/roadie/overview/linting#testing'

export function selectorRule(description, selector, message) {
  return {
    meta: { type: 'problem', docs: { description }, schema: [] },
    create: (context) => ({
      [selector]: (node) => context.report({ node, message })
    })
  }
}

const LAYOUT_READS = new Set([
  'getComputedStyle',
  'getBoundingClientRect',
  'getClientRects',
  'offsetWidth',
  'offsetHeight',
  'offsetLeft',
  'offsetTop',
  'offsetParent',
  'clientWidth',
  'clientHeight',
  'clientLeft',
  'clientTop',
  'scrollWidth',
  'scrollHeight',
  'innerWidth',
  'innerHeight'
])
// (min-width: 48rem), (width < 48rem), and (48rem <= width), but not
// (prefers-reduced-motion: reduce) or (prefers-color-scheme: dark).
const VIEWPORT_QUERY =
  /\(\s*(?:(?:min|max)-)?(?:device-)?(?:width|height)\s*[:<>=]|[<>=]\s*(?:device-)?(?:width|height)\s*\)/
const JSDOM_LAYOUT = `jsdom has no layout. Test it in a *.browser.test.tsx. See ${TESTING}.`

const keyName = (node, computed) =>
  !computed && node.type === 'Identifier' ? node.name : staticString(node)

const objectKeys = (node) =>
  node?.type === 'ObjectExpression'
    ? node.properties
        .filter((property) => property.type === 'Property')
        .map((property) => keyName(property.key, property.computed))
    : []

const isLocal = (identifier, sourceCode) => {
  for (
    let scope = sourceCode.getScope(identifier);
    scope;
    scope = scope.upper
  ) {
    const variable = scope.set.get(identifier.name)
    if (variable) return variable.defs.length > 0
  }
  return false
}

/** The key a fake replaces: vi.spyOn(target, key), vi.stubGlobal(key), Object.defineProperty(target, key), Object.assign(target, { key }), or target.key = …. */
function fakedKeys(node, sourceCode) {
  if (node.type === 'AssignmentExpression') {
    const { left } = node
    if (left.type === 'Identifier') {
      return isLocal(left, sourceCode) ? [] : [left.name]
    }
    if (left.type === 'MemberExpression') {
      return [keyName(left.property, left.computed)]
    }
    return []
  }
  const { callee, arguments: args } = node
  const method = callee.type === 'MemberExpression' && callee.property.name
  if (method === 'spyOn' || method === 'defineProperty') {
    return [staticString(args[1])]
  }
  if (method === 'stubGlobal') return [staticString(args[0])]
  if (method === 'defineProperties') return objectKeys(args[1])
  // Object.assign({}, …) builds a plain object, not a fake.
  if (method === 'assign' && args[0]?.type !== 'ObjectExpression') {
    return args.slice(1).flatMap(objectKeys)
  }
  return []
}

// jsdom has no layout engine and evaluates no CSS.
export const jsdomRules = {
  'no-css-source-in-jsdom': selectorRule(
    'jsdom tests do not read CSS source.',
    [
      'ImportDeclaration[source.value=/\\.css\\?raw$/]',
      "CallExpression[callee.name='readFileSync'] Literal[value=/\\.css$/]",
      "CallExpression[callee.property.name='readFileSync'] Literal[value=/\\.css$/]"
    ].join(', '),
    `Assert rendered behaviour in a *.browser.test.tsx, not CSS source. See ${TESTING}.`
  ),
  'no-css-class-in-jsdom': selectorRule(
    'jsdom tests do not assert classes that only CSS can evaluate.',
    "CallExpression[callee.property.name='toHaveClass'] Literal[value=/calc\\(|@container|(^|\\s|:)(max-)?(sm|md|lg|xl|2xl):/]",
    `jsdom cannot evaluate calc(), container queries, or breakpoints. Assert this in a *.browser.test.tsx. See ${TESTING}.`
  ),
  'no-layout-fake-in-jsdom': {
    meta: {
      type: 'problem',
      docs: {
        description:
          'jsdom tests do not fake getComputedStyle, viewport media queries, or layout reads.'
      },
      schema: []
    },
    create(context) {
      // A matchMedia fake that answers only preference queries, such as
      // reduced motion or colour scheme, fakes a system setting, not layout.
      const mediaFakes = []
      const viewportQueries = []
      const check = (node) => {
        for (const key of fakedKeys(node, context.sourceCode)) {
          if (key === 'matchMedia') mediaFakes.push(node)
          else if (LAYOUT_READS.has(key)) {
            context.report({
              node,
              message: `Don't fake ${key}: ${JSDOM_LAYOUT}`
            })
          }
        }
      }
      const query = (node) => {
        const text = staticString(node) ?? node.value?.cooked
        if (typeof text === 'string' && VIEWPORT_QUERY.test(text)) {
          viewportQueries.push(node)
        }
      }
      return {
        AssignmentExpression: check,
        CallExpression: check,
        Literal: query,
        TemplateElement: query,
        'Program:exit'() {
          if (mediaFakes.length === 0) return
          for (const node of viewportQueries) {
            context.report({
              node,
              message: `Don't fake matchMedia to answer a viewport query: ${JSDOM_LAYOUT}`
            })
          }
        }
      }
    }
  }
}
