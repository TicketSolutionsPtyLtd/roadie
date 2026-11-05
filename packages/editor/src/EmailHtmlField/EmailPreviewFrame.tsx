'use client'

import { ToggleGroup } from '@oztix/roadie-components/toggle-group'
import { cn } from '@oztix/roadie-core/utils'

export type PreviewWidth = 'desktop' | 'phone'

// Pixels, not rem: mail clients lay an email out in CSS pixels.
const PREVIEW_WIDTH: Record<PreviewWidth, string> = {
  desktop: 'w-[600px]',
  phone: 'w-[375px]'
}

type PreviewWidthToggleProps = {
  value: PreviewWidth
  onValueChange: (width: PreviewWidth) => void
  className?: string
}

/** Desktop at 600 pixels, an email's width, or a phone's 375. */
export function PreviewWidthToggle({
  value,
  onValueChange,
  className
}: PreviewWidthToggleProps) {
  return (
    <ToggleGroup
      aria-label='Preview width'
      size='sm'
      className={className}
      value={[value]}
      onValueChange={([next]) => next && onValueChange(next as PreviewWidth)}
    >
      <ToggleGroup.Item value='desktop'>Desktop</ToggleGroup.Item>
      <ToggleGroup.Item value='phone'>Phone</ToggleGroup.Item>
    </ToggleGroup>
  )
}

type EmailPreviewFrameProps = {
  html: string
  width: PreviewWidth
  /** The scheme a mail client in light or dark mode gives the email. */
  colorScheme?: 'light' | 'dark'
  busy?: boolean
}

/** An email's HTML in a sandboxed frame, at a desktop's or a phone's width. */
export function EmailPreviewFrame({
  html,
  width,
  colorScheme = 'light',
  busy = false
}: EmailPreviewFrameProps) {
  return (
    <div
      aria-busy={busy || undefined}
      className='grid overflow-x-auto rounded-xl emphasis-sunken p-3'
    >
      <iframe
        title='Email preview'
        // No tokens: no scripts, forms, popups, navigation or same origin.
        sandbox=''
        srcDoc={html}
        style={{ colorScheme }}
        className={cn(
          'h-160 justify-self-center-safe rounded-sm transition-opacity',
          colorScheme === 'light'
            ? 'bg-(--color-neutral-light-0)'
            : 'bg-(--color-neutral-light-13)',
          busy && 'opacity-60',
          PREVIEW_WIDTH[width]
        )}
      />
    </div>
  )
}
