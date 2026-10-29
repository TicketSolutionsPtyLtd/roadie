import {
  type CSSProperties,
  Children,
  type ReactElement,
  type ReactNode,
  createElement
} from 'react'

import { renderJSONContentToReactElement } from '@tiptap/static-renderer/json/react'

import { Link } from '@oztix/roadie-components/link'
import { Prose } from '@oztix/roadie-components/prose'

import {
  type EditorValue,
  type EmbedProvider,
  type StoredEditorValue,
  migrate
} from '../schema'
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

/** Renders one of an app's own blocks from its stored attrs. */
export type EditorBlockRenderer = (props: {
  /** As stored, so read each one as untrusted input. */
  attrs: Record<string, unknown>
}) => ReactNode

export type RenderEditorOptions = {
  /** The `Prose` size, matching the editor's. @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /**
   * The providers that may render an embed, matching the editor's.
   * @default defaultEmbedProviders
   */
  embedProviders?: readonly EmbedProvider[]
  /**
   * Renders an app's own blocks, by node name, matching the editor's
   * `extensions`. A block with no entry is dropped. An entry can't replace
   * one of the preset's own nodes.
   */
  nodeMapping?: Readonly<Record<string, EditorBlockRenderer>>
}

type RendererProps = {
  node: { attrs?: SavedAttrs; text?: unknown }
  mark?: { attrs?: SavedAttrs }
  children?: ReactNode
}

type Renderer = (props: RendererProps) => ReactNode

const REACT_PROP_NAMES: Record<string, string> = {
  class: 'className',
  colspan: 'colSpan',
  rowspan: 'rowSpan'
}

function reactElement({ tag, attrs, style }: Element, children: ReactNode) {
  if (tag === 'a') return <Link href={String(attrs?.href)}>{children}</Link>
  const props: Record<string, unknown> & { style?: CSSProperties } = {
    ...Object.fromEntries(
      Object.entries(attrs ?? {}).map(([name, value]) => [
        REACT_PROP_NAMES[name] ?? name,
        value
      ])
    ),
    ...(style && { style })
  }
  return VOID_TAGS.has(tag)
    ? createElement(tag, props)
    : createElement(tag, props, children)
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
      // A link with no text has no name, as an email button emptied of its label.
      if (
        element?.tag === 'a' &&
        Children.toArray(props.children).length === 0
      ) {
        return null
      }
      return element ? reactElement(element, props.children) : props.children
    }
  }
  return mapping
}

function renderDoc(
  doc: EditorValue['doc'],
  { nodes, marks }: Elements,
  context: RenderContext,
  blocks: Readonly<Record<string, EditorBlockRenderer>>
) {
  const nodeMapping = renderers(nodes, ({ node }) => node.attrs, context)
  for (const [name, render] of Object.entries(blocks)) {
    if (name in nodeMapping || name === 'text') continue
    nodeMapping[name] = ({ node }) => render({ attrs: { ...node.attrs } })
  }
  nodeMapping.text = ({ node }) =>
    typeof node.text === 'string' ? node.text : null
  return renderJSONContentToReactElement({
    nodeMapping,
    markMapping: renderers(marks, ({ mark }) => mark?.attrs, context),
    unhandledNode: () => null,
    unhandledMark: ({ children }) => children
  })({ content: withTableSections(outermostMarksLast(doc)) })
}

/**
 * Renders a saved value as React elements in `Prose`, on the server or the
 * client. It migrates the value first, keeping only the text of each node and
 * mark its preset doesn't define, and drops every attribute it doesn't, so no
 * raw HTML gets through.
 */
export function renderEditorValue(
  value: StoredEditorValue | EditorValue,
  {
    size,
    className,
    embedProviders,
    nodeMapping = {}
  }: RenderEditorOptions = {}
): ReactElement {
  const { preset, doc } = migrate(value, undefined, {
    customBlocks: Object.keys(nodeMapping)
  })
  return (
    <Prose size={size} className={className}>
      {renderDoc(
        doc,
        presetElementsFor(preset),
        { embedProviders },
        nodeMapping
      )}
    </Prose>
  )
}
