import published from '@oztix/roadie-lint-plugin'
import {
  classRule,
  selectorRule,
  staticString
} from '@oztix/roadie-lint-plugin/internal'

const LAYOUT_CLASS =
  /(^|:|!)-?(grid|flex|inline|inline-flex|inline-grid|block|inline-block|flow-root|contents|hidden|container|grow|shrink|absolute|relative|fixed|sticky|(gap|space|[mp][trblxyse]?|w|h|min|max-[wh]|grid-(cols|rows|flow)|col|row|flex|basis|grow|shrink|order|columns|items|justify|place|self|inset|top|right|bottom|left|start|end)-.+)!?$/

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

// layout=row always wraps, so it can't replace a flex row that doesn't.
const isWrappingIfFlex = (tokens) =>
  !tokens.includes('flex') || tokens.includes('flex-wrap')

// Any prop besides className, such as role or style, is more than layout.
const isLayoutDiv = (node) => {
  if (!isElement(node, 'div') || node.openingElement.attributes.length !== 1) {
    return false
  }
  const tokens = classTokens(node)
  return (
    tokens !== undefined &&
    tokens.every((token) => FENCE_LAYOUT_CLASS.test(token)) &&
    isWrappingIfFlex(tokens)
  )
}

const isCaption = (node) => {
  const tokens = isElement(node, 'p') ? classTokens(node) : undefined
  return (
    tokens?.length === CAPTION_CLASS.size &&
    tokens.every((token) => CAPTION_CLASS.has(token))
  )
}

const POPUP_ITEM = new Set([
  'option',
  'menuitem',
  'menuitemradio',
  'menuitemcheckbox'
])

// `await screen.findByRole('option', …)`, or `(await …findAllByRole(…))[i]`
// or `.at(i)`.
const isFoundPopupItem = (node) => {
  const at =
    node?.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.name === 'at'
  const found = at
    ? node.callee.object
    : node?.type === 'MemberExpression'
      ? node.object
      : node
  const call = found?.type === 'AwaitExpression' ? found.argument : undefined
  const method =
    call?.type === 'CallExpression' &&
    (call.callee.type === 'MemberExpression'
      ? call.callee.property.name
      : call.callee.name)
  return (
    /^find(All)?ByRole$/.test(method || '') &&
    POPUP_ITEM.has(staticString(call.arguments[0]))
  )
}

// A const that holds one, as in `const item = await screen.findByRole(…)`.
const foundPopupItemIn = (identifier, sourceCode) => {
  for (
    let scope = sourceCode.getScope(identifier);
    scope;
    scope = scope.upper
  ) {
    const variable = scope.set.get(identifier.name)
    if (!variable) continue
    const [def] = variable.defs
    return (
      variable.defs.length === 1 &&
      def.type === 'Variable' &&
      def.parent.kind === 'const' &&
      isFoundPopupItem(def.node.init)
    )
  }
  return false
}

const rules = {
  ...published.rules,
  // Base UI opens a popup in a frame and keeps a closed one mounted, inert,
  // until its exit ends, and Linux WebKit runs no frames while idle, so a
  // found item can belong to the popup that's closing (#1072, #1080, #1083, #1086).
  'no-unwaited-popup-pick': {
    meta: {
      type: 'problem',
      docs: {
        description:
          'Browser tests pick from a Select or menu with the helpers that wait for frames.'
      },
      schema: []
    },
    create(context) {
      return {
        // fireEvent can't take the helpers, which need a user.
        "CallExpression[callee.property.name='click'][callee.object.name!='fireEvent']"(
          node
        ) {
          const [target] = node.arguments
          const unwaited =
            isFoundPopupItem(target) ||
            (target?.type === 'Identifier' &&
              foundPopupItemIn(target, context.sourceCode))
          if (!unwaited) return
          context.report({
            node: target,
            message:
              'Pick with pickOption or pickMenuItem from src/css/testUtils.ts (in the editor, src/Editor/testUtils.ts), which find the item with frames running and wait for the popup to go, or, for an item clicked while its popup stays open, find it inside withFrames. See docs/solutions/test-failures/linux-webkit-no-frames-while-idle.md.'
          })
        }
      }
    }
  },
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
  // esbuild bundles all of zod for `z` (or the default, which is `z`) imported
  // by name, from zod or any subpath such as zod/mini, and only what's used
  // through a namespace (INNO-1692).
  'no-named-zod-import': selectorRule(
    'zod is imported as a namespace, so esbuild can tree-shake it.',
    [
      'ImportDeclaration[source.value=/^zod(\\x2F|$)/][importKind!="type"] > :matches(ImportDefaultSpecifier, ImportSpecifier[imported.name=/^(z|default)$/][importKind!="type"])',
      'ExportNamedDeclaration[source.value=/^zod(\\x2F|$)/][exportKind!="type"] > ExportSpecifier[local.name=/^(z|default)$/][exportKind!="type"]'
    ].join(', '),
    "Import zod as a namespace, `import * as z from 'zod'`, or esbuild bundles all of it."
  )
}

export default { meta: { name: 'roadie' }, rules }
