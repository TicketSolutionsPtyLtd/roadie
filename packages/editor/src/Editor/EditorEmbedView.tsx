'use client'

import { type CSSProperties, use } from 'react'

import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'

import { EmptyState } from '@oztix/roadie-components/empty-state'

import { EMBED_ALLOW, EMBED_SANDBOX, embedFrame } from '../render/embedFrame'
import { EditorContext } from './EditorContext'

/** An embed's player in the editor, under a cover so a click selects it. */
export function EditorEmbedView({ node, selected }: ReactNodeViewProps) {
  const context = use(EditorContext)
  const frame = embedFrame(node.attrs, context?.embedProviders)
  return (
    <NodeViewWrapper
      data-slot='editor-embed'
      data-selected={selected ? '' : undefined}
      className='grid justify-items-start rounded-md'
      // Takes the player's width, so its ring and toolbar hug it.
      style={{ maxWidth: frame?.style.maxWidth }}
    >
      {frame ? (
        <iframe
          src={frame.src}
          title={frame.title}
          loading='lazy'
          sandbox={EMBED_SANDBOX}
          allow={EMBED_ALLOW}
          tabIndex={-1}
          className='rounded-md'
          style={frame.style as CSSProperties}
        />
      ) : (
        <EmptyState
          size='sm'
          intent='danger'
          className='not-prose w-full rounded-lg bg-subtle'
        >
          <EmptyState.Title render={<p />}>
            This embed can’t be shown.
          </EmptyState.Title>
        </EmptyState>
      )}
      <div aria-hidden data-slot='editor-embed-cover' />
    </NodeViewWrapper>
  )
}
