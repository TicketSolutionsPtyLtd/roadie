import type {
  BlockContent,
  Code,
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
  /** Markdown for each docs component the page renders data with, keyed by its JSX name and given its string props. */
  renderers?: Record<
    string,
    (props: Record<string, string | undefined>) => string
  >
}

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

function attribute(node: JsxElement, name: string) {
  const attr = node.attributes.find(
    (a): a is MdxJsxAttribute => a.type === 'mdxJsxAttribute' && a.name === name
  )
  if (!attr || attr.value === null || attr.value === undefined) return undefined
  if (typeof attr.value === 'string') return attr.value
  const [statement] = attr.value.data?.estree?.body ?? []
  const expression =
    statement?.type === 'ExpressionStatement' ? statement.expression : undefined
  if (
    expression?.type === 'TemplateLiteral' &&
    !expression.expressions.length
  ) {
    return expression.quasis[0]?.value.cooked ?? attr.value.value
  }
  if (expression?.type === 'Literal' && typeof expression.value === 'string') {
    return expression.value
  }
  return attr.value.value
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

function guideline(node: JsxElement, children: RootContent[]): RootContent[] {
  const title = attribute(node, 'title')
  const description = attribute(node, 'description')
  // Guideline.Row only lays out the docs card, so readers get the bare parts.
  const example = attribute(node, 'example')?.replace(
    /^\s*<Guideline\.Row>([\s\S]*)<\/Guideline\.Row>\s*$/,
    '<>$1</>'
  )
  const code = attribute(node, 'code')
  const label =
    node.name === 'Guideline.Do'
      ? 'Do'
      : node.name === 'Guideline.Dont'
        ? 'Don’t'
        : title
  return [
    ...(label ? [paragraph(strong(label))] : []),
    ...(description ? [paragraph(text(description))] : []),
    ...(example ? [tsx(dedent(example))] : []),
    ...(code ? [tsx(dedent(code))] : []),
    ...children
  ]
}

function transform(
  node: Node,
  page: Required<Pick<MarkdownPage, 'components'>> & MarkdownPage
): Node[] {
  switch (node.type) {
    case 'mdxjsEsm':
    case 'mdxFlowExpression':
    case 'mdxTextExpression':
      return []
    case 'code':
      return LIVE_FENCE.test(node.lang ?? '')
        ? [{ ...node, lang: node.lang!.replace(/-.*/, ''), meta: null }]
        : [node]
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
    const render = node.name ? page.renderers?.[node.name] : undefined
    if (render) {
      const props = Object.fromEntries(
        node.attributes
          .filter((a): a is MdxJsxAttribute => a.type === 'mdxJsxAttribute')
          .map((a) => [a.name, attribute(node, a.name)])
      )
      return unified()
        .use(remarkParse)
        .use(remarkGfm)
        .parse(render(props))
        .children.flatMap((child) => transform(child, page))
    }
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
      return guideline(node, children as RootContent[])
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
  const state = { components: [], ...page }
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
function cell(value: string | undefined) {
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
    ? `${cell(light)} / ${cell(dark)}`
    : cell(light ?? dark)

function table(header: string[], rows: string[][]) {
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n')
}

type Column = [name: string, value: (token: TokenRow) => string]

function tokenGroup(group: string, tokens: TokenRow[]) {
  const used = (column: Column) =>
    tokens.some((token) => column[1](token) !== '')
  const dark: Column = [
    'Dark, if different',
    (token) => cell(darkIfDifferent(token.value))
  ]
  const columns: Column[] = [
    ['Token', (token) => cell(token.name)],
    ...(
      [
        [
          used(dark) ? 'Light' : 'Value',
          (token) => cell(token.value?.light ?? token.value?.dark)
        ],
        dark,
        ['Classes', (token) => (token.classes ?? []).map(cell).join(' ')],
        ['Description', (token) => prose(token.description)]
      ] satisfies Column[]
    ).filter(used)
  ]
  const sections = [
    `## ${group}`,
    table(
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
      table(
        ['Token', ...intents],
        tokens
          .filter((token) => token.byIntent)
          .map((token) => [
            cell(token.name),
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

export function tokenFamilyToMarkdown(page: TokenFamilyMarkdown): string {
  const groups = Map.groupBy(page.tokens, (token) => token.group)
  return [
    `# ${page.title}`,
    ...(page.description ? [`> ${page.description}`] : []),
    page.intro,
    ...(page.guidance.length > 0
      ? [
          `When to use these: ${page.guidance
            .map(({ title, url }) => `[${title}](${url})`)
            .join(', ')}.`
        ]
      : []),
    ...[...groups].flatMap(([group, tokens]) => tokenGroup(group, tokens))
  ]
    .join('\n\n')
    .concat('\n')
}
