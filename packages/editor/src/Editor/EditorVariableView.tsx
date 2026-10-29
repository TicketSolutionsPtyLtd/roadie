'use client'

import { use } from 'react'

import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'

import { Badge } from '@oztix/roadie-components/badge'

import { EditorContext } from './EditorContext'

/** A merge tag in the editor: a chip with its variable's label. */
export function EditorVariableView({ node, selected }: ReactNodeViewProps) {
  const variables = use(EditorContext)?.variables
  const key = String(node.attrs.key)
  const variable = variables?.find((listed) => listed.key === key)
  const invalid = variables !== undefined && !variable

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
        contentEditable={false}
      >
        {variable?.label ?? key}
      </Badge>
    </NodeViewWrapper>
  )
}
