import type { JSONContent } from '@tiptap/core'

import { EMAIL_WIDTH, buttonLook } from '../schema/emailAttrs'
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

export type TreeContext = TextContext & { showsWhen: ShowsWhen }

type Context = TreeContext & {
  /** Each block's padding, narrower beside other columns. */
  padding: string
}

const BLOCK_PADDING = '8px 24px'
const COLUMN_BLOCK_PADDING = '8px 12px'

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
function buttonLayout(attrs: Record<string, unknown>, { theme }: Context) {
  const { align, emphasis, fullWidth } = buttonLook(attrs)
  return {
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
      color: theme.text
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
    case 'image':
      return [
        mj('mj-image', {
          src: escapeHtml(String(attrs.src)),
          alt: escapeHtml(String(attrs.alt ?? '')),
          padding,
          ...(attrs.width && { width: `${attrs.width}px` })
        })
      ]
    case 'spacer':
      return [mj('mj-spacer', { height: `${attrs.height}px` })]
    case 'horizontalRule':
      return [mj('mj-divider', { padding })]
    default: {
      // An empty line is room to type in, not space to send.
      if (isBlankParagraph(node)) return []
      const html = textBlockHtml(node, context)
      return html ? [leaf('mj-text', { padding }, html)] : []
    }
  }
}

const isBlankParagraph = (node: JSONContent) =>
  node.type === 'paragraph' &&
  (node.content ?? []).every(
    (child) =>
      child.type === 'hardBreak' ||
      (child.type === 'text' && !child.text?.trim())
  )

const column = (blocks: JSONContent[], context: Context) =>
  mj(
    'mj-column',
    {},
    blocks.flatMap((block) => blockNodes(block, context))
  )

function columns(node: JSONContent, text: TreeContext) {
  const context = { ...text, padding: COLUMN_BLOCK_PADDING }
  return mj(
    'mj-section',
    {},
    (node.content ?? []).map((child) => column(child.content ?? [], context))
  )
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
      built.push(
        ...shownNodes(node, text, () => {
          const inner = rows(node.content ?? [], text)
          // An empty section's padding is space to send, too.
          return inner.length > 0 ? [mj('mj-wrapper', {}, inner)] : []
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
