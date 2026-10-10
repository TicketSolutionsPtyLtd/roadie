import type {
  BlockContent,
  Code,
  Heading,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent
} from 'mdast'
import type {
  MdxJsxAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement
} from 'mdast-util-mdx-jsx'
import { toString } from 'mdast-util-to-string'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'

import type { ManifestComponent, ManifestPart, ManifestProp } from './manifest'

export type { ManifestComponent }

export type MarkdownPage = {
  title: string
  description?: string
  mdx: string
  /** Components whose `docs` URL is this page, rendered once, where the page first places `PropsDefinitions`, or at the end. */
  components?: ManifestComponent[]
  /** Rewrites a root-relative docs link, such as `/components/field#states`. */
  resolveLink?: (href: string) => string
  /** Markdown for each docs component the page renders data with, keyed by its JSX name; bare props arrive as `true`. */
  renderers?: Record<string, (props: Record<string, string | true>) => string>
  /** Docs components that only draw for the site. When set, a docs component that is neither rendered nor listed here fails the build. */
  drawings?: ReadonlySet<string>
}

// Structure every page shares, which `transform` expands itself.
export const BUILT_IN = new Set(['Guideline', 'Guidelines', 'PropsDefinitions'])

type JsxElement = MdxJsxFlowElement | MdxJsxTextElement
type Node = Root | RootContent

const LIVE_FENCE = /^(tsx|jsx)-live/

const text = (value: string): PhrasingContent => ({ type: 'text', value })
const strong = (value: string): PhrasingContent => ({
  type: 'strong',
  children: [text(value)]
})
const paragraph = (...children: PhrasingContent[]): Paragraph => ({
  type: 'paragraph',
  children
})
const tsx = (value: string): Code => ({ type: 'code', lang: 'tsx', value })

function attributeValue(node: JsxElement, name: string) {
  return node.attributes.find(
    (a): a is MdxJsxAttribute => a.type === 'mdxJsxAttribute' && a.name === name
  )?.value
}

function expressionOf(value: MdxJsxAttribute['value']) {
  if (!value || typeof value === 'string') return undefined
  const [statement] = value.data?.estree?.body ?? []
  return statement?.type === 'ExpressionStatement'
    ? statement.expression
    : undefined
}

/** A string attribute's text, or undefined for a bare or computed attribute. */
function literal(attr: MdxJsxAttribute) {
  if (attr.value === null || attr.value === undefined) return undefined
  if (typeof attr.value === 'string') return attr.value
  const expression = expressionOf(attr.value)
  if (
    expression?.type === 'TemplateLiteral' &&
    !expression.expressions.length
  ) {
    return expression.quasis[0]?.value.cooked ?? attr.value.value
  }
  if (expression?.type === 'Literal' && typeof expression.value === 'string') {
    return expression.value
  }
  return undefined
}

function attribute(node: JsxElement, name: string) {
  const attr = node.attributes.find(
    (a): a is MdxJsxAttribute => a.type === 'mdxJsxAttribute' && a.name === name
  )
  if (!attr) return undefined
  return (
    literal(attr) ??
    (typeof attr.value === 'object' ? attr.value?.value : undefined)
  )
}

/** A rendered component's props: strings, and `true` for a bare attribute. Anything computed can't reach the markdown, so it throws. */
function rendererProps(node: JsxElement) {
  const props: Record<string, string | true> = {}
  for (const attr of node.attributes) {
    const value =
      attr.type === 'mdxJsxAttribute'
        ? attr.value === null
          ? true
          : literal(attr)
        : undefined
    if (attr.type !== 'mdxJsxAttribute' || value === undefined)
      throw new Error(
        `<${node.name}> needs string or bare props for its markdown renderer`
      )
    props[attr.name] = value
  }
  return props
}

// A copy of `dedent.ts`: scripts run under plain Node, which can't resolve the
// extensionless import the app's tsconfig requires.
function dedent(source: string) {
  const lines = source.replace(/^\s*\n|\s+$/g, '').split('\n')
  const indent = Math.min(
    ...lines
      .filter((line) => line.trim())
      .map((line) => line.match(/^ */)![0].length)
  )
  return lines.map((line) => line.slice(indent)).join('\n')
}

const oneLine = (markdown: string) => markdown.replace(/\s+/g, ' ').trim()

function propLine(prop: ManifestProp) {
  return [
    `- \`${prop.name}\`: \`${prop.type}\`.`,
    prop.required && 'Required.',
    prop.default !== undefined && `Defaults to \`${prop.default}\`.`,
    prop.description && oneLine(prop.description),
    prop.deprecated && `Deprecated: ${oneLine(prop.deprecated)}`
  ]
    .filter(Boolean)
    .join(' ')
}

function partSection(part: ManifestPart, importName?: string) {
  return [
    `### ${part.name}`,
    part.description,
    importName &&
      `\`\`\`tsx\nimport { ${part.name} } from '${importName}'\n\`\`\``,
    part.props.length > 0
      ? part.props.map(propLine).join('\n')
      : 'No props beyond the standard HTML attributes.'
  ].filter(Boolean)
}

function apiReference(components: ManifestComponent[]): RootContent[] {
  if (components.length === 0) return []
  const markdown = [
    '## API reference',
    ...components.flatMap((component) => [
      ...partSection(component, component.import),
      ...(component.parts ?? []).flatMap((part) => partSection(part))
    ])
  ].join('\n\n')
  return unified().use(remarkParse).use(remarkGfm).parse(markdown).children
}

type JsxTree = Extract<
  NonNullable<ReturnType<typeof expressionOf>>,
  { type: 'JSXElement' | 'JSXFragment' }
>
type JsxChild = JsxTree['children'][number]

// React's rule: each line is trimmed, blank lines go, and the rest join with a space.
function jsxText(value: string) {
  const lines = value.replace(/\t/g, ' ').split(/\r?\n/)
  return lines
    .map((line, index) => {
      const start = index > 0 ? line.replace(/^ +/, '') : line
      return index < lines.length - 1 ? start.replace(/ +$/, '') : start
    })
    .filter(Boolean)
    .join(' ')
}

function jsxAttribute(
  element: Extract<JsxTree, { type: 'JSXElement' }>,
  name: string
) {
  const attr = element.openingElement.attributes.find(
    (a) =>
      a.type === 'JSXAttribute' &&
      a.name.type === 'JSXIdentifier' &&
      a.name.name === name
  )
  const value = attr?.type === 'JSXAttribute' ? attr.value : undefined
  return value?.type === 'Literal' && typeof value.value === 'string'
    ? value.value
    : undefined
}

/** JSX as React renders it, so markdown syntax in its text stays literal. */
function jsxToPhrasing(
  node: JsxTree | JsxChild,
  page: Page
): PhrasingContent[] {
  switch (node.type) {
    case 'JSXText': {
      const value = jsxText(node.value)
      return value ? [text(value)] : []
    }
    case 'JSXExpressionContainer':
      return node.expression.type === 'Literal' &&
        typeof node.expression.value === 'string'
        ? [text(node.expression.value)]
        : []
    case 'JSXSpreadChild':
      return []
  }
  const children = node.children.flatMap((child) => jsxToPhrasing(child, page))
  if (node.type === 'JSXFragment') return children
  const { name } = node.openingElement
  if (name.type === 'JSXIdentifier') assertListed(name.name, page)
  switch (name.type === 'JSXIdentifier' ? name.name : '') {
    case 'code':
    case 'Code':
      return [{ type: 'inlineCode', value: toString(paragraph(...children)) }]
    case 'em':
      return [{ type: 'emphasis', children }]
    case 'strong':
      return [{ type: 'strong', children }]
    case 'a':
    case 'Link': {
      const url = jsxAttribute(node, 'href')
      return url
        ? (transform(
            { type: 'link', url, children },
            page
          ) as PhrasingContent[])
        : children
    }
  }
  return children
}

/** A prop that holds text or JSX, such as a guideline's description, as a paragraph. */
function richAttribute(node: JsxElement, name: string, page: Page): Node[] {
  const expression = expressionOf(attributeValue(node, name))
  const children =
    expression?.type === 'JSXElement' || expression?.type === 'JSXFragment'
      ? jsxToPhrasing(expression, page)
      : [text(attribute(node, name) ?? '')]
  return toString(paragraph(...children)) ? [paragraph(...children)] : []
}

/** Fails the build on a docs component that's neither rendered nor listed as a drawing. */
function assertListed(name: string, page: Page) {
  const root = name.split('.')[0]!
  if (
    page.drawings &&
    page.docsOnly.has(root) &&
    !BUILT_IN.has(root) &&
    !page.drawings.has(root)
  )
    throw new Error(
      `<${name}> isn't in the twin registry: add it to docs/src/lib/twin-components.ts`
    )
}

/** An example whose root component comes from the docs app draws for the site, so its code isn't Roadie's to copy. */
function isDocsDrawing(example: string, page: Page) {
  const root = example.match(/^\s*<([\w]+)/)?.[1]
  if (root === undefined || !page.docsOnly.has(root)) return false
  assertListed(root, page)
  return true
}

function guideline(
  node: JsxElement,
  children: RootContent[],
  page: Page
): Node[] {
  const title = attribute(node, 'title')
  // Guideline.Row only lays out the docs card, so readers get the bare parts.
  // The fragment keeps the Row's indent, so dedent lines it up with them.
  const example = attribute(node, 'example')?.replace(
    /^(\s*)<Guideline\.Row>([\s\S]*?)(\s*)<\/Guideline\.Row>\s*$/,
    '$1<>$2$3</>'
  )
  const code = attribute(node, 'code')
  const label =
    node.name === 'Guideline.Do'
      ? 'Do'
      : node.name === 'Guideline.Dont'
        ? 'Don’t'
        : undefined
  // One level below the heading it sits under, so the twin never skips a level.
  const depth = Math.min(page.headingDepth + 1, 6) as Heading['depth']
  return [
    ...(title && !label
      ? [{ type: 'heading', depth, children: [text(title)] } as Heading]
      : []),
    ...(label ? [paragraph(strong(label))] : []),
    ...richAttribute(node, 'description', page),
    ...(example && !isDocsDrawing(example, page) ? [tsx(dedent(example))] : []),
    ...(code ? [tsx(dedent(code))] : []),
    ...children
  ]
}

type Page = Required<Pick<MarkdownPage, 'components'>> &
  MarkdownPage & { docsOnly: Set<string>; headingDepth: number }

/** Names the page imports from the docs app (`@/…`). */
export function docsOnlyNames(tree: Root) {
  const names = new Set<string>()
  for (const node of tree.children) {
    if (node.type !== 'mdxjsEsm') continue
    for (const statement of node.data?.estree?.body ?? []) {
      if (
        statement.type === 'ImportDeclaration' &&
        String(statement.source.value).startsWith('@/')
      )
        for (const specifier of statement.specifiers)
          names.add(specifier.local.name)
    }
  }
  return names
}

function transform(node: Node, page: Page): Node[] {
  switch (node.type) {
    case 'mdxjsEsm':
    case 'mdxFlowExpression':
    case 'mdxTextExpression':
      return []
    case 'code':
      return LIVE_FENCE.test(node.lang ?? '')
        ? [{ ...node, lang: node.lang!.replace(/-.*/, ''), meta: null }]
        : [node]
    case 'heading':
      page.headingDepth = node.depth
      break
    case 'link':
      if (page.resolveLink && node.url.startsWith('/')) {
        node = { ...node, url: page.resolveLink(node.url) }
      }
      break
  }

  if (!('children' in node)) return [node]
  const children = (node.children as Node[]).flatMap((child) =>
    transform(child, page)
  )

  if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
    const render =
      node.name && page.renderers && Object.hasOwn(page.renderers, node.name)
        ? page.renderers[node.name]
        : undefined
    if (render) {
      if (node.type === 'mdxJsxTextElement')
        throw new Error(
          `<${node.name}> renders blocks, so it can't sit inside a paragraph`
        )
      return unified()
        .use(remarkParse)
        .use(remarkGfm)
        .parse(render(rendererProps(node)))
        .children.flatMap((child) => transform(child, page))
    }
    if (node.name) assertListed(node.name, page)
    if (node.name === 'PropsDefinitions') {
      const reference = apiReference(page.components)
      page.components = []
      return reference.flatMap((child) => transform(child, page))
    }
    if (node.name === 'code') {
      return [{ type: 'inlineCode', value: toString(children) }]
    }
    if (
      node.name === 'Guideline' ||
      node.name === 'Guideline.Do' ||
      node.name === 'Guideline.Dont'
    ) {
      return guideline(node, children as RootContent[], page)
    }
    return children
  }
  return [{ ...node, children } as Node]
}

function withoutLeadingTitle(children: RootContent[]) {
  const [first, ...rest] = children
  return first?.type === 'heading' && first.depth === 1 ? rest : children
}

/** A docs page's MDX as plain markdown: JSX gone, prose and code kept, live fences as plain fences, and the API reference from the manifest. */
export function pageToMarkdown(page: MarkdownPage): string {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkStringify, { bullet: '-', fences: true, rule: '-' })
  const tree = processor.parse(page.mdx)
  const state = {
    components: [],
    docsOnly: docsOnlyNames(tree),
    headingDepth: 1,
    ...page
  }
  const [body] = transform(tree, state) as [Root]
  const trailingReference = apiReference(state.components).flatMap((child) =>
    transform(child, state)
  )
  const children = withoutLeadingTitle(body.children)
  const [first] = children
  const repeated =
    first?.type === 'paragraph' &&
    oneLine(toString(first)) === oneLine(page.description ?? '')
  const head: BlockContent[] = [
    { type: 'heading', depth: 1, children: [text(page.title)] },
    ...(page.description && !repeated
      ? [
          {
            type: 'blockquote',
            children: [paragraph(text(page.description))]
          } as BlockContent
        ]
      : [])
  ]
  return processor.stringify({
    type: 'root',
    children: [...head, ...children, ...(trailingReference as RootContent[])]
  })
}

export type LlmsLink = { title: string; url: string; description?: string }

export const linkLine = ({ title, url, description }: LlmsLink) =>
  `- [${title}](${url})${description ? `: ${description}` : ''}`

export type LlmsSection = { name: string; links: LlmsLink[] }

export type LlmsIndex = {
  title: string
  summary: string
  details?: string
  sections: LlmsSection[]
}

/** An `llms.txt` index in the llmstxt.org shape: H1, blockquote summary, details, then H2 sections of links. */
export function llmsIndex({ title, summary, details, sections }: LlmsIndex) {
  return [
    `# ${title}`,
    `> ${summary}`,
    ...(details ? [details] : []),
    ...sections
      .filter((section) => section.links.length > 0)
      .map((section) =>
        [`## ${section.name}`, ...section.links.map(linkLine)].join('\n')
      )
  ]
    .join('\n\n')
    .concat('\n')
}

type TokenValue = { light?: string; dark?: string }
type TokenRow = {
  name: string
  group: string
  value?: TokenValue
  byIntent?: Partial<Record<string, TokenValue>>
  classes?: string[]
  description?: string
}

export type TokenFamilyMarkdown = {
  title: string
  description?: string
  intro: string
  /** Pages that say when to use the family. */
  guidance: LlmsLink[]
  tokens: TokenRow[]
}

/** Inline code fenced past any backtick run in the value; table pipes escaped. */
export function inlineCode(value: string | undefined) {
  if (!value) return ''
  const fence = '`'.repeat(
    Math.max(0, ...(value.match(/`+/g) ?? []).map((run) => run.length)) + 1
  )
  const padded =
    value.startsWith('`') || value.endsWith('`') ? ` ${value} ` : value
  return `${fence}${padded.replace(/\|/g, '\\|')}${fence}`
}
const prose = (value: string | undefined) =>
  value ? oneLine(value).replace(/\|/g, '\\|').replace(/</g, '&lt;') : ''
const darkIfDifferent = ({ light, dark }: TokenValue = {}) =>
  light !== undefined && dark !== light ? dark : undefined
const lightAndDark = ({ light, dark }: TokenValue) =>
  light && dark && dark !== light
    ? `${inlineCode(light)} / ${inlineCode(dark)}`
    : inlineCode(light ?? dark)

export function markdownTable(header: string[], rows: string[][]) {
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n')
}

type Column = [name: string, value: (token: TokenRow) => string]

function tokenGroup(group: string, tokens: TokenRow[], depth: number) {
  const used = (column: Column) =>
    tokens.some((token) => column[1](token) !== '')
  const dark: Column = [
    'Dark, if different',
    (token) => inlineCode(darkIfDifferent(token.value))
  ]
  const columns: Column[] = [
    ['Token', (token) => inlineCode(token.name)],
    ...(
      [
        [
          used(dark) ? 'Light' : 'Value',
          (token) => inlineCode(token.value?.light ?? token.value?.dark)
        ],
        dark,
        ['Classes', (token) => (token.classes ?? []).map(inlineCode).join(' ')],
        ['Description', (token) => prose(token.description)]
      ] satisfies Column[]
    ).filter(used)
  ]
  const sections = [
    `${'#'.repeat(depth)} ${group}`,
    markdownTable(
      columns.map(([name]) => name),
      tokens.map((token) => columns.map(([, value]) => value(token)))
    )
  ]
  const intents = [
    ...new Set(tokens.flatMap((token) => Object.keys(token.byIntent ?? {})))
  ]
  if (intents.length > 0) {
    sections.push(
      'Where an intent sets its own value, light / dark:',
      markdownTable(
        ['Token', ...intents],
        tokens
          .filter((token) => token.byIntent)
          .map((token) => [
            inlineCode(token.name),
            ...intents.map((intent) => {
              const value = token.byIntent?.[intent]
              return value ? lightAndDark(value) : ''
            })
          ])
      )
    )
  }
  return sections
}

function familySections(page: TokenFamilyMarkdown, depth: number) {
  const groups = Map.groupBy(page.tokens, (token) => token.group)
  return [
    page.intro,
    ...(page.guidance.length > 0
      ? [
          `When to use these: ${page.guidance
            .map(({ title, url }) => `[${title}](${url})`)
            .join(', ')}.`
        ]
      : []),
    ...[...groups].flatMap(([group, tokens]) =>
      tokenGroup(group, tokens, depth)
    )
  ]
}

const markdownDocument = (
  title: string,
  description: string | undefined,
  body: string[]
) =>
  [`# ${title}`, ...(description ? [`> ${description}`] : []), ...body]
    .join('\n\n')
    .concat('\n')

export function tokenFamilyToMarkdown(family: TokenFamilyMarkdown): string {
  return markdownDocument(
    family.title,
    family.description,
    familySections(family, 2)
  )
}

export function allTokensToMarkdown({
  title,
  description,
  intro,
  families
}: {
  title: string
  description?: string
  intro: string
  families: TokenFamilyMarkdown[]
}): string {
  return markdownDocument(title, description, [
    intro,
    ...families.flatMap((family) => [
      `## ${family.title}`,
      ...familySections(family, 3)
    ])
  ])
}

/** A fenced block whose fence outruns any backtick run inside it. */
export function fence(lang: string, code: string) {
  const longest = Math.max(
    2,
    ...(code.match(/`+/g) ?? []).map((run) => run.length)
  )
  const ticks = '`'.repeat(longest + 1)
  return `${ticks}${lang}\n${code}\n${ticks}`
}

/** How a reference dashboard's page changes the period: a sentence and the code. */
export type DashboardPeriodExample = { note: string; code: string }

export type DashboardExampleMarkdown = {
  title: string
  description?: string
  spec: unknown
  jsx: string
  period?: DashboardPeriodExample
  cardActionsCode?: string
}

/** A reference dashboard as its page shows it: the spec, any period or card action code, then the JSX. */
export function dashboardExampleToMarkdown(example: DashboardExampleMarkdown) {
  return markdownDocument(example.title, example.description, [
    '## As data',
    fence('json', JSON.stringify(example.spec, null, 2)),
    ...(example.period
      ? [
          '## With a period',
          example.period.note,
          fence('tsx', example.period.code)
        ]
      : []),
    ...(example.cardActionsCode
      ? ['## With card actions', fence('tsx', example.cardActionsCode)]
      : []),
    '## As JSX',
    fence('tsx', example.jsx)
  ])
}
