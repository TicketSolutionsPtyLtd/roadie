'use client'

import { Button } from '../Button'
import { Dialog } from '../Dialog'
import type { RecordName, RecordsBulkAction } from './types'

type Confirmable = Pick<RecordsBulkAction, 'label' | 'intent' | 'confirm'>

const format = new Intl.NumberFormat('en-AU')

export const needsConfirm = ({ intent, confirm }: Confirmable) =>
  (intent === 'danger' && confirm !== false) || typeof confirm === 'object'

// onClick discards an action's promise, so a rejection can't reach a caller's
// own catch. reportError surfaces it instead of swallowing it.
export const reportActionError = (error: unknown) =>
  // jsdom has no reportError.
  (window.reportError ?? console.error)(error)

export type RecordsConfirmProps = {
  action: Confirmable
  /** The records the action acts on, for the default title. */
  count: number
  recordName: RecordName
  onCancel: () => void
  onConfirm: () => void
}

export function RecordsConfirm({
  action,
  count,
  recordName,
  onCancel,
  onConfirm
}: RecordsConfirmProps) {
  const overrides = action.confirm || {}
  const noun = count === 1 ? recordName.one : recordName.other
  return (
    <Dialog
      role='alertdialog'
      open
      onOpenChange={(open) => !open && onCancel()}
    >
      <Dialog.Content intent={action.intent} size='sm'>
        <Dialog.Header>
          <Dialog.Title>
            {overrides.title ??
              `${action.label} ${format.format(count)} ${noun}?`}
          </Dialog.Title>
          {overrides.description && (
            <Dialog.Description>{overrides.description}</Dialog.Description>
          )}
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close render={<Button>Cancel</Button>} />
          <Button intent={action.intent} emphasis='strong' onClick={onConfirm}>
            {overrides.confirmLabel ?? action.label}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  )
}
RecordsConfirm.displayName = 'RecordsConfirm'
