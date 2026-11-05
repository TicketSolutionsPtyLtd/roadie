'use client'

import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'

import { DesktopIcon, DeviceMobileIcon } from '@phosphor-icons/react'

import { ToggleGroup } from '@oztix/roadie-components/toggle-group'
import { cn } from '@oztix/roadie-core/utils'

export type PreviewWidth = 'desktop' | 'phone'

// Pixels, not rem: mail clients lay an email out in CSS pixels.
const PREVIEW_WIDTH: Record<PreviewWidth, number> = { desktop: 600, phone: 375 }
const PREVIEW_HEIGHT = 640

type PreviewWidthToggleProps = {
  value: PreviewWidth
  onValueChange: (width: PreviewWidth) => void
  className?: string
  /** Hides the labels, leaving the icons, to fit a narrow bar. */
  labelClassName?: string
}

/** Desktop at 600 pixels, an email's width, or a phone's 375. */
export function PreviewWidthToggle({
  value,
  onValueChange,
  className,
  labelClassName
}: PreviewWidthToggleProps) {
  return (
    <ToggleGroup
      aria-label='Preview width'
      size='sm'
      className={className}
      value={[value]}
      onValueChange={([next]) => next && onValueChange(next as PreviewWidth)}
    >
      <ToggleGroup.Item value='desktop'>
        <DesktopIcon weight='bold' className='size-4' aria-hidden />
        <span className={labelClassName}>Desktop</span>
      </ToggleGroup.Item>
      <ToggleGroup.Item value='phone'>
        <DeviceMobileIcon weight='bold' className='size-4' aria-hidden />
        <span className={labelClassName}>Phone</span>
      </ToggleGroup.Item>
    </ToggleGroup>
  )
}

// Inverts the email and turns its hues back, then inverts images again, as
// the mail apps that force dark mode on an email do.
const SIMULATED_DARK = `<style>html{filter:invert(1) hue-rotate(180deg);background:#fff}img,picture,video{filter:invert(1) hue-rotate(180deg)}</style>`

/** The email's HTML with the forced dark mode some mail apps apply. */
export function simulatedDark(html: string) {
  return /<\/head>/i.test(html)
    ? html.replace(/<\/head>/i, `${SIMULATED_DARK}</head>`)
    : SIMULATED_DARK + html
}

type EmailPreviewFrameProps = {
  html: string
  width: PreviewWidth
  /** Dark simulates a mail app that forces dark mode on the email. */
  colorScheme?: 'light' | 'dark'
  busy?: boolean
  /** Shown above the frame, at its width, such as an inbox's row. */
  header?: ReactNode
}

/**
 * An email's HTML in a sandboxed frame, laid out at a desktop's or a phone's
 * width and scaled down to fit when there's less room.
 */
export function EmailPreviewFrame({
  html,
  width,
  colorScheme = 'light',
  busy = false,
  header
}: EmailPreviewFrameProps) {
  const roomRef = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState<number | null>(null)
  useLayoutEffect(() => {
    const element = roomRef.current
    if (!element) return
    setRoom(element.clientWidth)
    const observer = new ResizeObserver(() => setRoom(element.clientWidth))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const laidOut = PREVIEW_WIDTH[width]
  const scale = room ? Math.min(1, room / laidOut) : 1
  const dark = colorScheme === 'dark'
  return (
    <div
      aria-busy={busy || undefined}
      className='grid rounded-xl emphasis-sunken p-3'
    >
      <div ref={roomRef} className='grid min-w-0'>
        <div
          className='grid gap-2 justify-self-center'
          // Measured, as the scale is: no utility knows the room.
          style={{ width: laidOut * scale }}
        >
          {header}
          <div style={{ height: PREVIEW_HEIGHT * scale }}>
            <iframe
              title='Email preview'
              // No tokens: no scripts, forms, popups, navigation or same origin.
              sandbox=''
              srcDoc={dark ? simulatedDark(html) : html}
              style={{
                width: laidOut,
                height: PREVIEW_HEIGHT,
                transform: scale < 1 ? `scale(${scale})` : undefined,
                transformOrigin: '0 0',
                colorScheme
              }}
              className={cn(
                'rounded-sm transition-opacity',
                dark
                  ? 'bg-(--color-neutral-light-13)'
                  : 'bg-(--color-neutral-light-0)',
                busy && 'opacity-60'
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
