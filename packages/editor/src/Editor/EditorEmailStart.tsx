import { useId } from 'react'

import { Button } from '@oztix/roadie-components/button'
import { EmptyState } from '@oztix/roadie-components/empty-state'

import type { EditorValue } from '../schema'

type EditorEmailStartProps = {
  onSections?: () => void
  onBlocks?: () => void
  onImport?: () => void
}

/** Whether a value holds only the empty line a new email opens with. */
export function isBlankDoc({ doc }: EditorValue) {
  const [line, ...rest] = doc.content ?? []
  return (
    rest.length === 0 && line?.type === 'paragraph' && !line.content?.length
  )
}

/**
 * Ways into an empty email, under its first line. The skeleton draws it
 * hidden, so the email doesn't grow as the editor loads.
 */
export function EditorEmailStart({
  onSections,
  onBlocks,
  onImport
}: EditorEmailStartProps) {
  const titleId = useId()
  return (
    <EmptyState
      size='sm'
      role='group'
      aria-labelledby={titleId}
      data-slot='editor-email-start'
    >
      <EmptyState.Title id={titleId} render={<p />}>
        Start your email
      </EmptyState.Title>
      <EmptyState.Actions>
        <Button size='sm' onClick={onSections}>
          Sections
        </Button>
        <Button size='sm' onClick={onBlocks}>
          Blocks
        </Button>
        <Button size='sm' onClick={onImport}>
          Import
        </Button>
      </EmptyState.Actions>
    </EmptyState>
  )
}
