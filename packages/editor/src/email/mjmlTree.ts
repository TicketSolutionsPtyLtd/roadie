import type { JSONContent } from '@tiptap/core'

import {
  EMAIL_WIDTH,
  type SectionLook,
  buttonLook,
  columnWidths,
  columnsLook,
  imageLook,
  sectionLook,
  textAlign
} from '../schema/emailAttrs'
import { preheaderOf } from '../schema/preheader'
import type { ShowWhen } from '../schema/showWhen'
import type { ShowsWhen } from './conditions'
import { untokenedText } from './mergeTags'
import {
  type TextContext,
  emailHref,
  escapeHtml,
  inlineHtml,
  textBlockHtml
} from './textHtml'
import type { EmailTheme } from './theme'

/** A node of MJML's JSON tree, which it reads in place of its XML. */
export type MjmlNode = {
  tagName: string
  attributes: Record<string, string>
  children?: MjmlNode[]
  /** Raw HTML, so it's escaped before it gets here. */
  content?: string
}

export type TreeContext = TextContext & {
  showsWhen: ShowsWhen
  /** Set inside a filled section, whose colours the head's defaults miss. */
  filled?: boolean
}

type Context = TreeContext & {
  /** Each block's padding, narrower beside other columns. */
  padding: string
}

/** A block's inset from the email's sides, in pixels. */
export const EMAIL_BLOCK_INSET = 24

const BLOCK_PADDING = `8px ${EMAIL_BLOCK_INSET}px`
const COLUMN_BLOCK_PADDING = '8px 12px'
// With each column's 12px, columns' text sits in as far as any other block's.
const COLUMNS_PADDING = `0 ${EMAIL_BLOCK_INSET - 12}px`

const mj = (
  tagName: string,
  attributes: Record<string, string> = {},
  children?: MjmlNode[]
): MjmlNode => ({ tagName, attributes, ...(children && { children }) })

const leaf = (
  tagName: string,
  attributes: Record<string, string>,
  content: string
): MjmlNode => ({ tagName, attributes, content })

const raw = (content: string): MjmlNode => ({
  tagName: 'mj-raw',
  attributes: {},
  content
})

// A hidden block is still built, so a preview throws on a variable or rule
// the app lacks wherever a send would.
function shownNodes(
  { attrs }: JSONContent,
  { showsWhen }: TreeContext,
  build: () => MjmlNode[]
) {
  const rule = attrs?.showWhen as ShowWhen | undefined
  const shows = rule ? showsWhen(rule) : true
  const built = build()
  if (shows === false) return []
  if (shows === true || built.length === 0) return built
  return [raw(shows.open), ...built, raw(shows.close)]
}

// A normal or subtle button is neutral, so the accent stays for the one that
// matters. Each sets the fill a strong button's head attributes give it.
function buttonLayout(
  attrs: Record<string, unknown>,
  { theme, filled }: Context
) {
  const { align, emphasis, fullWidth } = buttonLook(attrs)
  return {
    ...(filled &&
      !emphasis && {
        'background-color': theme.button,
        color: theme.buttonText
      }),
    ...(align && { align }),
    ...(fullWidth && { width: '100%' }),
    ...(emphasis === 'normal' && {
      'background-color': theme.background,
      color: theme.text,
      border: `1px solid ${theme.border}`,
      // Less the border, so it's the size a strong button is.
      'inner-padding': '11px 23px'
    }),
    ...(emphasis === 'subtle' && {
      'background-color': theme.tint,
      color: theme.text,
      // On a fill its tint can match the section's, so it keeps an edge.
      ...(filled && {
        border: `1px solid ${theme.border}`,
        'inner-padding': '11px 23px'
      })
    })
  }
}

const blockNodes = (node: JSONContent, context: Context) =>
  shownNodes(node, context, () => blockContent(node, context))

// A node `migrate` let through but this list doesn't know renders as nothing.
function blockContent(node: JSONContent, context: Context) {
  const { type, attrs = {} } = node
  const { padding } = context
  switch (type) {
    case 'button': {
      const label = inlineHtml(node.content, context)
      if (label === '') return []
      const href = emailHref(attrs, context)
      if (!href) return [leaf('mj-text', { padding }, label)]
      return [
        leaf(
          'mj-button',
          { href, padding, ...buttonLayout(attrs, context) },
          label
        )
      ]
    }
    case 'image': {
      const { align } = imageLook(attrs)
      const href = emailHref(imageLook(attrs), context)
      return [
        mj('mj-image', {
          src: escapeHtml(String(attrs.src)),
          alt: escapeHtml(String(attrs.alt ?? '')),
          padding,
          ...(attrs.width && { width: `${attrs.width}px` }),
          ...(align && { align }),
          ...(href && { href })
        })
      ]
    }
    case 'spacer':
      return [mj('mj-spacer', { height: `${attrs.height}px` })]
    case 'horizontalRule':
      return [
        mj('mj-divider', {
          padding,
          ...(context.filled && { 'border-color': context.theme.divider })
        })
      ]
    default: {
      // An empty line is room to type in, not space to send.
      if (isBlankParagraph(node)) return []
      const kept = withoutBlankItems(node)
      if (!kept) return []
      const html = textBlockHtml(kept, context)
      const align = textAlign(attrs.align)
      return html
        ? [
            leaf(
              'mj-text',
              {
                padding,
                ...(align && { align }),
                ...(context.filled && { color: context.theme.text })
              },
              html
            )
          ]
        : []
    }
  }
}

const isBlankParagraph = (node: JSONContent) => isBlankText(node, 'paragraph')

// A paragraph or heading with no words: empty, spaces, or breaks.
const isBlankText = (node: JSONContent, ...types: string[]) =>
  types.includes(node.type ?? '') &&
  (node.content ?? []).every(
    (child) =>
      child.type === 'hardBreak' ||
      (child.type === 'text' && !child.text?.trim())
  )

const LISTS = new Set(['bulletList', 'orderedList'])

// A list item with no words, such as a hinted line left empty, would send as
// a blank bullet, so it goes, and a list left with none goes too.
function withoutBlankItems(node: JSONContent): JSONContent | null {
  if (!LISTS.has(node.type ?? '')) return node
  const items = (node.content ?? []).flatMap((listItem) => {
    const content = (listItem.content ?? []).flatMap((child) => {
      const kept = withoutBlankItems(child)
      return kept && !isBlankText(kept, 'paragraph', 'heading') ? [kept] : []
    })
    return content.length > 0 ? [{ ...listItem, content }] : []
  })
  return items.length > 0 ? { ...node, content: items } : null
}

const column = (
  blocks: JSONContent[],
  context: Context,
  attributes: Record<string, string> = {}
) =>
  mj(
    'mj-column',
    attributes,
    blocks.flatMap((block) => blockNodes(block, context))
  )

const percent = (share: number) => `${Number(share.toFixed(2))}%`

// MJML stacks columns in their order, so a reversed stack writes them last
// first and lays the row out right to left, which puts them back on a desktop.
function columns(node: JSONContent, text: TreeContext) {
  const context = { ...text, padding: COLUMN_BLOCK_PADDING }
  const look = columnsLook(node.attrs)
  const children = node.content ?? []
  const widths = columnWidths(children.length, look)
  const built = children.map((child, index) =>
    column(
      child.content ?? [],
      context,
      look.layout ? { width: percent(widths[index]!) } : {}
    )
  )
  return look.stack
    ? mj(
        'mj-section',
        { padding: COLUMNS_PADDING, direction: 'rtl' },
        built.reverse()
      )
    : mj('mj-section', { padding: COLUMNS_PADDING }, built)
}

const SECTION_PADDING = { tight: '8px 0', roomy: '32px 0' } as const

// An accent fill takes the strong button's colours, and its strong button
// swaps them, so text, links and buttons stay legible on it.
function lookTheme(theme: EmailTheme, look: SectionLook): EmailTheme {
  if (look === 'tint') {
    return { ...theme, background: theme.tint, tint: theme.background }
  }
  return {
    ...theme,
    background: theme.button,
    text: theme.buttonText,
    link: theme.buttonText,
    button: theme.buttonText,
    buttonText: theme.button,
    border: theme.buttonText,
    tint: theme.button,
    divider: theme.buttonText
  }
}

// MJML stacks columns below 480px, and its conditional tables hold them in Outlook.
function rows(nodes: JSONContent[], text: TreeContext): MjmlNode[] {
  const built: MjmlNode[] = []
  let run: JSONContent[] = []
  const endRun = () => {
    const runColumn = column(run, { ...text, padding: BLOCK_PADDING })
    if (runColumn.children?.length)
      built.push(mj('mj-section', {}, [runColumn]))
    run = []
  }
  for (const node of nodes) {
    if (node.type === 'columns') {
      endRun()
      built.push(columns(node, text))
    } else if (node.type === 'section') {
      endRun()
      const { look, spacing } = sectionLook(node.attrs)
      const inner = look
        ? { ...text, theme: lookTheme(text.theme, look), filled: true }
        : text
      built.push(
        ...shownNodes(node, text, () => {
          const built = rows(node.content ?? [], inner)
          // An empty section's padding is space to send, too.
          return built.length > 0
            ? [
                mj(
                  'mj-wrapper',
                  {
                    ...(spacing && { padding: SECTION_PADDING[spacing] }),
                    ...(look && { 'background-color': inner.theme.background })
                  },
                  built
                )
              ]
            : []
        })
      )
    } else {
      run.push(node)
    }
  }
  endRun()
  return built
}

function head(
  { text, fontFamily, button, buttonText, divider }: EmailTheme,
  preheader: string | undefined
) {
  return mj('mj-head', {}, [
    ...(preheader
      ? [leaf('mj-preview', {}, escapeHtml(untokenedText(preheader)))]
      : []),
    mj('mj-attributes', {}, [
      mj('mj-all', { 'font-family': fontFamily }),
      mj('mj-section', { padding: '0' }),
      mj('mj-wrapper', { padding: '16px 0' }),
      mj('mj-text', {
        color: text,
        'font-size': '16px',
        'line-height': '24px'
      }),
      mj('mj-button', {
        'background-color': button,
        color: buttonText,
        'font-size': '16px',
        'font-weight': '700',
        'border-radius': '8px',
        'inner-padding': '12px 24px',
        align: 'left'
      }),
      mj('mj-divider', { 'border-color': divider, 'border-width': '1px' })
    ])
  ])
}

/** An email preset's doc as MJML's tree. */
export function mjmlTree(doc: JSONContent, text: TreeContext): MjmlNode {
  const { theme } = text
  return mj('mjml', {}, [
    head(theme, preheaderOf(doc.attrs?.preheader)),
    mj(
      'mj-body',
      { width: `${EMAIL_WIDTH}px`, 'background-color': theme.background },
      rows(doc.content ?? [], text)
    )
  ])
}
