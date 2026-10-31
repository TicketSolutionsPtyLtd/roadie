import {
  escapeHTML,
  escapeHTMLAttribute,
  renderJSONContentToString,
  serializeAttrsToHTMLString,
  serializeChildrenToHTMLString
} from '@tiptap/static-renderer/json/html-string'

import { proseVariants } from '@oztix/roadie-components/prose'
import { cn } from '@oztix/roadie-core/utils'

import { type EditorValue, type StoredEditorValue, migrate } from '../schema'
import {
  type Element,
  type Elements,
  type RenderContext,
  type SavedAttrs,
  VOID_TAGS,
  outermostMarksLast,
  presetElementsFor,
  withTableSections
} from './elements'
import type { RenderEditorOptions } from './renderEditorValue'

/** An app's own blocks need React, so this renderer drops them. */
export type RenderEditorHtmlOptions = Omit<RenderEditorOptions, 'nodeMapping'>

// Roadie's Link opens these in a new tab (`resolveLinkKind` in components).
const EXTERNAL_HREF = /^(https?:)?\/\//i

type RendererProps = {
  node: { attrs?: SavedAttrs; text?: unknown }
  mark?: { attrs?: SavedAttrs }
  children?: string | string[]
}

type Renderer = (props: RendererProps) => string

// Matches React's inline style output, so both renderers agree.
function cssText(style: Record<string, string>) {
  return Object.entries(style)
    .map(([property, value]) => {
      const name = property.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`
      )
      return `${name}:${value}`
    })
    .join(';')
}

// What Roadie's Link renders, so a link looks the same from either renderer.
const LINK_ATTRS = { 'data-slot': 'link', class: 'link-normal' }

function htmlAttrs({ tag, attrs, style }: Element) {
  const opensTab = tag === 'a' && EXTERNAL_HREF.test(String(attrs?.href))
  return serializeAttrsToHTMLString({
    ...attrs,
    ...(opensTab && { target: '_blank', rel: 'noopener noreferrer' }),
    ...(tag === 'a' && LINK_ATTRS),
    ...(style && { style: cssText(style) })
  })
}

function htmlElement(element: Element, children: string) {
  const open = `<${element.tag}${htmlAttrs(element)}>`
  return VOID_TAGS.has(element.tag)
    ? open
    : `${open}${children}</${element.tag}>`
}

function renderers(
  table: Elements['nodes'],
  attrsOf: (props: RendererProps) => SavedAttrs | undefined,
  context: RenderContext
) {
  const mapping: Record<string, Renderer> = Object.create(null)
  for (const [name, toElement] of Object.entries(table)) {
    mapping[name] = (props) => {
      const element = toElement(attrsOf(props) ?? {}, context)
      const children = serializeChildrenToHTMLString(props.children)
      // A link with no text has no name, as an email button emptied of its label.
      if (element?.tag === 'a' && children === '') return ''
      return element ? htmlElement(element, children) : children
    }
  }
  return mapping
}

function renderDoc(
  doc: EditorValue['doc'],
  { nodes, marks }: Elements,
  context: RenderContext
) {
  const nodeMapping = renderers(nodes, ({ node }) => node.attrs, context)
  nodeMapping.text = ({ node }) =>
    typeof node.text === 'string' ? escapeHTML(node.text) : ''
  return renderJSONContentToString({
    nodeMapping,
    markMapping: renderers(marks, ({ mark }) => mark?.attrs, context),
    unhandledNode: () => '',
    unhandledMark: ({ children }) => serializeChildrenToHTMLString(children)
  })({ content: withTableSections(outermostMarksLast(doc)) })
}

/**
 * Renders a saved value as an HTML string in a `.prose` element, for a
 * consumer that isn't React. It maps the same nodes and marks as
 * `renderEditorValue` and escapes every text and attribute.
 */
export function renderEditorHtml(
  value: StoredEditorValue | EditorValue,
  { size, className, embedProviders }: RenderEditorHtmlOptions = {}
): string {
  const { preset, doc } = migrate(value)
  const classes = escapeHTMLAttribute(cn(proseVariants({ size, className })))
  const content = renderDoc(doc, presetElementsFor(preset), { embedProviders })
  return `<div data-slot="prose" class="${classes}">${content}</div>`
}
