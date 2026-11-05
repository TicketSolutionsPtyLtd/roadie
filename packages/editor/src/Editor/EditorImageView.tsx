'use client'

import { WarningIcon } from '@phosphor-icons/react'
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'

import { Badge } from '@oztix/roadie-components/badge'
import { cn } from '@oztix/roadie-core/utils'

import { imageLook, imageWidth } from '../schema/emailAttrs'
import { pageImageLook } from '../schema/imageAttrs'

const ALIGN = {
  left: 'me-auto',
  center: 'mx-auto',
  right: 'ms-auto'
} as const

/**
 * An image in the editor, flagged until it has alt text. An email's image
 * fills its column, or sits at its width, centred unless aligned, as the
 * email draws it. A page's image sits at its own width or across the text,
 * aligned, with its caption under it.
 */
export function EditorImageView({ node, selected }: ReactNodeViewProps) {
  const src = String(node.attrs.src)
  const alt = String(node.attrs.alt ?? '')
  const inEmail = 'width' in node.attrs
  const width = imageWidth(node.attrs.width)
  const { align } = imageLook(node.attrs)
  const page = pageImageLook(node.attrs)

  return (
    <NodeViewWrapper
      data-slot='editor-image'
      data-selected={selected ? '' : undefined}
      // Hugs the image, rounded as prose rounds it, so the ring follows it.
      className={cn(
        'relative grid max-w-full rounded-md',
        !inEmail && (page.fullWidth ? 'w-full' : 'w-fit'),
        !inEmail && page.align && ALIGN[page.align],
        inEmail && width === null && 'w-full',
        inEmail && width !== null && (align ? ALIGN[align] : 'mx-auto')
      )}
      style={inEmail && width !== null ? { width } : undefined}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={cn('m-0', (inEmail || page.fullWidth) && 'w-full')}
      />
      {page.caption ? (
        <figcaption contentEditable={false}>{page.caption}</figcaption>
      ) : null}
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
