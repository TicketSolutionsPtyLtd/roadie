'use client'

import { WarningIcon } from '@phosphor-icons/react'
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'

import { Badge } from '@oztix/roadie-components/badge'

/** An image in the editor, flagged until it has alt text. */
export function EditorImageView({ node, selected }: ReactNodeViewProps) {
  const src = String(node.attrs.src)
  const alt = String(node.attrs.alt ?? '')

  return (
    <NodeViewWrapper
      data-slot='editor-image'
      data-selected={selected ? '' : undefined}
      // Hugs the image, rounded as prose rounds it, so the ring follows it.
      className='relative grid w-fit max-w-full rounded-md'
    >
      <img src={src} alt={alt} draggable={false} className='m-0' />
      {alt ? null : (
        <div contentEditable={false} className='absolute start-2 top-2'>
          <Badge intent='warning' emphasis='strong'>
            <WarningIcon weight='bold' className='size-4' aria-hidden />
            No alt text
          </Badge>
        </div>
      )}
    </NodeViewWrapper>
  )
}
