'use client'

import { type ReactNode } from 'react'

import { XIcon } from '@phosphor-icons/react'

import { Dialog, IconButton, IconTile } from '@oztix/roadie-components'

export type CartExpiryDialogProps = {
  open: boolean
  /** Drives the IconTile, description tint, and strong action via the cascade. */
  intent: 'warning' | 'danger'
  icon: ReactNode
  title: string
  description: ReactNode
  /** Optional body between header and footer (e.g. the live countdown). */
  children?: ReactNode
  actions: ReactNode
  /** Light-dismiss (backdrop/Escape/close); off for the blocking expired dialog. */
  dismissible?: boolean
  onClose?: () => void
}

export function CartExpiryDialog({
  open,
  intent,
  icon,
  title,
  description,
  children,
  actions,
  dismissible = false,
  onClose
}: CartExpiryDialogProps) {
  return (
    <Dialog.Root
      open={open}
      role='alertdialog'
      disablePointerDismissal={!dismissible}
      onOpenChange={(next) => {
        if (!next) onClose?.()
      }}
    >
      <Dialog.Content size='sm' intent={intent}>
        <Dialog.Header>
          {dismissible && onClose && (
            <Dialog.Close
              render={
                <IconButton
                  aria-label='Close'
                  emphasis='subtle'
                  intent='neutral'
                  size='sm'
                  className='absolute top-0 right-0'
                />
              }
            >
              <XIcon weight='bold' className='size-4' />
            </Dialog.Close>
          )}
          <IconTile size='2xl' shape='circle'>
            {icon}
          </IconTile>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
        </Dialog.Header>
        {children ? (
          <Dialog.Body className='justify-items-center text-center'>
            {children}
          </Dialog.Body>
        ) : null}
        <Dialog.Footer>{actions}</Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}
