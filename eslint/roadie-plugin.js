import published from '@oztix/roadie-lint-plugin'

// The package's helpers, not its public API.
import { staticString } from '../packages/lint-plugin/src/ast.js'
import { classRule } from '../packages/lint-plugin/src/classes.js'
import { selectorRule } from '../packages/lint-plugin/src/testing.js'

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

const rules = {
  ...published.rules,
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
  )
}

export default { meta: { name: 'roadie' }, rules }
