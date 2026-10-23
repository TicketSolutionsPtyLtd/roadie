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

// JSX means the value was rendered, which is what a test should assert on.
const EXPRESSION_EDGE = /Function|Statement$|Declaration$|^JSX|^Program$/

const isExpect = (callee) =>
  callee.name === 'expect' || callee.object?.name === 'expect'

// expect(…) or expect.soft(…), or a matcher chained on it such as expect(…).not.toBe(…).
function isAssertion(call) {
  let node = call
  while (node.type === 'CallExpression' || node.type === 'MemberExpression') {
    if (node.type === 'CallExpression' && isExpect(node.callee)) return true
    node = node.type === 'CallExpression' ? node.callee : node.object
  }
  return false
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

// These hold in a real browser too.
export const testRules = {
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
          message: `Wait on a condition with expect.poll or waitFor, not a fixed sleep. See ${TESTING}.`
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
        // esquery regexes cannot contain a slash.
        'ImportDeclaration[source.value=/^(node:)?timers\\x2Fpromises$/]':
          report,
        "Property[key.name='type'][value.value='wait']": report
      }
    }
  },
  'no-cva-output-assertion': {
    meta: {
      type: 'problem',
      docs: { description: 'Tests do not assert CVA output.' },
      schema: []
    },
    create(context) {
      const { sourceCode } = context
      const reported = new WeakSet()
      const report = (node) => {
        if (reported.has(node)) return
        reported.add(node)
        context.report({
          node,
          message: `Assert what a user sees, not the class string a variants function returns. See ${TESTING}.`
        })
      }
      // One binding deep: past that, the value is usually markup or an element built from the classes.
      const followBinding = (declaration) => {
        for (const variable of sourceCode.getDeclaredVariables(declaration)) {
          for (const reference of variable.references) {
            if (reference.isRead()) follow(reference.identifier, false)
          }
        }
      }
      const follow = (node, mayBind = true) => {
        let child = node
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (
            parent.type === 'CallExpression' &&
            parent.arguments.includes(child) &&
            isAssertion(parent)
          ) {
            return report(node)
          }
          const bound =
            (parent.type === 'VariableDeclarator' && parent.init === child) ||
            (parent.type === 'ForOfStatement' && parent.right === child)
          if (bound) {
            if (mayBind) followBinding(parent.left ?? parent)
            return
          }
          if (EXPRESSION_EDGE.test(parent.type)) return
          child = parent
        }
      }
      return {
        'CallExpression[callee.name=/Variants$/]': (node) => follow(node)
      }
    }
  }
}
