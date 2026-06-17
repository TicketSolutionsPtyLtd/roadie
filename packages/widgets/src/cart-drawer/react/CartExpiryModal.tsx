'use client'

import { type ReactNode } from 'react'

import { XIcon } from '@phosphor-icons/react'

import { Dialog, IconButton } from '@oztix/roadie-components'

type CartExpiryModalProps = {
  open: boolean
  title: string
  icon: ReactNode
  children: ReactNode
  actions: ReactNode
  /** Light-dismiss (backdrop/Escape/close); off for the blocking expired modal. */
  dismissible?: boolean
  onClose?: () => void
}

export function CartExpiryModal({
  open,
  title,
  icon,
  children,
  actions,
  dismissible = false,
  onClose
}: CartExpiryModalProps) {
  return (
    <Dialog.Root
      open={open}
      disablePointerDismissal={!dismissible}
      onOpenChange={(next) => {
        if (!next) onClose?.()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className='z-80' />
        <Dialog.Viewport className='z-80'>
          <Dialog.Popup
            size='sm'
            className='relative justify-items-center gap-6 text-center'
          >
            {dismissible && onClose && (
              <Dialog.Close
                render={
                  <IconButton
                    aria-label='Close'
                    emphasis='subtle'
                    intent='neutral'
                    size='icon-sm'
                    className='absolute top-4 right-4'
                  />
                }
              >
                <XIcon weight='bold' className='size-4' />
              </Dialog.Close>
            )}
            {icon}
            <Dialog.Title className='text-display-ui-4 text-strong'>
              {title}
            </Dialog.Title>
            <div className='text-prose text-balance text-subtle'>
              {children}
            </div>
            <div className='flex w-full gap-3'>{actions}</div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
