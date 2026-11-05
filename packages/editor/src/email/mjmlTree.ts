import type { JSONContent } from '@tiptap/core'

import { EMAIL_WIDTH } from '../schema/emailAttrs'
import { escapeHtml, textBlockHtml } from './textHtml'
import type { EmailTheme } from './theme'

/** A node of MJML's JSON tree, which it reads in place of its XML. */
export type MjmlNode = {
  tagName: string
  attributes: Record<string, string>
  children?: MjmlNode[]
  /** Raw HTML, so it's escaped before it gets here. */
  content?: string
}

type Context = {
  theme: EmailTheme
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

const textOf = (node: JSONContent) =>
  (node.content ?? []).map(({ text }) => text ?? '').join('')

// A node `migrate` let through but this list doesn't know renders as nothing.
function blockNodes(node: JSONContent, { theme, padding }: Context) {
  const { type, attrs = {} } = node
  switch (type) {
    case 'button': {
      const label = textOf(node)
      if (label === '') return []
      const href = escapeHtml(String(attrs.href))
      return [leaf('mj-button', { href, padding }, escapeHtml(label))]
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
      const html = textBlockHtml(node, theme)
      return html ? [leaf('mj-text', { padding }, html)] : []
    }
  }
}

const column = (blocks: JSONContent[], context: Context) =>
  mj(
    'mj-column',
    {},
    blocks.flatMap((block) => blockNodes(block, context))
  )

function columns(node: JSONContent, theme: EmailTheme) {
  const context = { theme, padding: COLUMN_BLOCK_PADDING }
  return mj(
    'mj-section',
    {},
    (node.content ?? []).map((child) => column(child.content ?? [], context))
  )
}

// MJML stacks columns below 480px, and its conditional tables hold them in Outlook.
function rows(nodes: JSONContent[], theme: EmailTheme): MjmlNode[] {
  const built: MjmlNode[] = []
  let run: JSONContent[] = []
  const endRun = () => {
    if (run.length === 0) return
    built.push(
      mj('mj-section', {}, [column(run, { theme, padding: BLOCK_PADDING })])
    )
    run = []
  }
  for (const node of nodes) {
    if (node.type === 'columns') {
      endRun()
      built.push(columns(node, theme))
    } else if (node.type === 'section') {
      endRun()
      built.push(mj('mj-wrapper', {}, rows(node.content ?? [], theme)))
    } else {
      run.push(node)
    }
  }
  endRun()
  return built
}

function head({ text, fontFamily, button, buttonText, divider }: EmailTheme) {
  return mj('mj-head', {}, [
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
export function mjmlTree(doc: JSONContent, theme: EmailTheme): MjmlNode {
  return mj('mjml', {}, [
    head(theme),
    mj(
      'mj-body',
      { width: `${EMAIL_WIDTH}px`, 'background-color': theme.background },
      rows(doc.content ?? [], theme)
    )
  ])
}
