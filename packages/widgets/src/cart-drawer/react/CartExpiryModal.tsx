'use client'

import { type ReactNode, useEffect } from 'react'

import { XIcon } from '@phosphor-icons/react'
import FocusLock from 'react-focus-lock'

import { IconButton } from '@oztix/roadie-components'

import { lockBodyScroll } from './documentEffects'

type CartExpiryModalProps = {
  open: boolean
  titleId: string
  title: string
  icon: ReactNode
  children: ReactNode
  actions: ReactNode
  /** Light-dismiss (backdrop/Escape/close); off for the blocking expired modal. */
  dismissible?: boolean
  onClose?: () => void
}

// Hand-rolled accessible shell (Roadie has no Dialog): role=dialog + aria-modal
// + focus trap + Escape + refcounted body-scroll-lock.
export function CartExpiryModal({
  open,
  titleId,
  title,
  icon,
  children,
  actions,
  dismissible = false,
  onClose
}: CartExpiryModalProps) {
  useEffect(() => {
    if (!open || !dismissible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, dismissible, onClose])

  // Refcounted so it composes with the drawer's own body-scroll lock.
  useEffect(() => {
    if (!open) return
    return lockBodyScroll()
  }, [open])

  if (!open) return null

  return (
    <div
      className='fixed inset-0 z-80 flex items-center justify-center emphasis-overlay p-4'
      onClick={dismissible ? onClose : undefined}
    >
      <FocusLock returnFocus className='w-full max-w-sm'>
        <div
          role='dialog'
          aria-modal='true'
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
          className='relative grid justify-items-center gap-4 rounded-4xl emphasis-floating p-6 text-center'
        >
          {dismissible && onClose && (
            <div className='absolute top-4 right-4'>
              <IconButton
                aria-label='Close'
                emphasis='subtle'
                intent='neutral'
                size='icon-sm'
                onClick={onClose}
              >
                <XIcon weight='bold' className='size-4' />
              </IconButton>
            </div>
          )}
          {icon}
          <h2 id={titleId} className='text-display-ui-4 text-strong'>
            {title}
          </h2>
          <div className='text-prose text-balance text-subtle'>{children}</div>
          <div className='flex w-full gap-3'>{actions}</div>
        </div>
      </FocusLock>
    </div>
  )
}
