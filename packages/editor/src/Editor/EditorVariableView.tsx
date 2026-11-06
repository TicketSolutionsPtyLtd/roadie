'use client'

import { use } from 'react'

import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'

import { Badge } from '@oztix/roadie-components/badge'

import { EditorContext } from './EditorContext'

/**
 * A merge tag in the editor: a chip with its variable's label and its
 * fallback, or a warning dot without one.
 */
export function EditorVariableView({
  node,
  selected,
  editor,
  getPos
}: ReactNodeViewProps) {
  const variables = use(EditorContext)?.variables
  const key = String(node.attrs.key)
  const fallback =
    typeof node.attrs.fallback === 'string' ? node.attrs.fallback : ''
  const variable = variables?.find((listed) => listed.key === key)
  const invalid = variables !== undefined && !variable
  const pos = getPos()
  // A button is a strong fill, where a subtle chip disappears.
  const inButton =
    pos !== undefined &&
    editor.state.doc.resolve(pos).parent.type.name === 'button'

  return (
    <NodeViewWrapper
      as='span'
      data-slot='editor-variable'
      data-selected={selected ? '' : undefined}
      data-invalid={invalid ? '' : undefined}
      className='rounded-full'
    >
      <Badge
        intent={invalid ? 'danger' : 'accent'}
        emphasis='subtle'
        size='sm'
        className={inButton && !invalid ? 'emphasis-raised' : undefined}
        contentEditable={false}
      >
        {variable?.label ?? key}
        {fallback ? (
          <>
            <span aria-hidden>·</span>
            <span className='text-subtler'>{fallback}</span>
          </>
        ) : invalid ? null : (
          <span
            role='img'
            aria-label='No fallback'
            title='No fallback'
            className='size-1.5 shrink-0 rounded-full bg-strong intent-warning'
          />
        )}
      </Badge>
    </NodeViewWrapper>
  )
}
