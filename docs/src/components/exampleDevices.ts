import { useSyncExternalStore } from 'react'

// Phone sits under `sm` (40rem), Tablet on `md` (48rem), and Desktop on `xl`
// (80rem), so each lands on the side of a breakpoint an example changes at.
export const DEVICES = [
  { value: 'phone', label: 'Phone', width: 375 },
  { value: 'tablet', label: 'Tablet', width: 768 },
  { value: 'desktop', label: 'Desktop', width: 1280 }
] as const

export type Device = (typeof DEVICES)[number]['value']

export const deviceWidth = (device: Device): number =>
  DEVICES.find(({ value }) => value === device)!.width

/** The device a viewport this wide is: under `md` a phone, under `lg` a tablet. */
export const deviceForWidth = (width: number): Device =>
  width < 768 ? 'phone' : width < 1024 ? 'tablet' : 'desktop'

function subscribeToResize(onChange: () => void) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

/** The device the reader's own screen is, so an example shows inline at it and in a frame at any other. */
export const useViewportDevice = () =>
  useSyncExternalStore(
    subscribeToResize,
    () => deviceForWidth(window.innerWidth),
    (): Device => 'desktop'
  )

/** How far to shrink a frame wider than the space it sits in; 1 before layout. */
export const fitScale = (width: number, available: number) =>
  available > 0 ? Math.min(1, available / width) : 1

/** Runs an example the docs page posts to it, at the frame's own viewport width. */
export const FRAME_PATH = '/examples/frame/'

// ThemeProvider writes the accent into this tag but doesn't export its id.
const ACCENT_STYLE_ID = 'roadie-accent-theme'

/** The docs page's theme and accent, without the rest of `<html>`'s style, such as a scroll lock. */
export type FrameRoot = {
  className: string
  colorScheme: string
  accent: string
}

export type FrameExample = {
  code: string
  language: string
  previewLayout?: string
  root: FrameRoot
}

export function readFrameRoot(): FrameRoot {
  const html = document.documentElement
  return {
    className: html.className,
    colorScheme: html.style.colorScheme,
    accent: document.getElementById(ACCENT_STYLE_ID)?.textContent ?? ''
  }
}

export function applyFrameRoot({ className, colorScheme, accent }: FrameRoot) {
  const html = document.documentElement
  html.className = className
  html.style.colorScheme = colorScheme
  if (!accent) return
  let style = document.getElementById(ACCENT_STYLE_ID)
  if (!style) {
    style = document.createElement('style')
    style.id = ACCENT_STYLE_ID
    document.head.append(style)
  }
  style.textContent = accent
}

export type FrameMessage =
  | { type: 'roadie-example-ready' }
  | { type: 'roadie-example-height'; height: number }
  | { type: 'roadie-example'; example: FrameExample }

/** The message's data when it came from `source` on this origin. */
export function frameMessageFrom(
  event: MessageEvent,
  source: MessageEventSource | null | undefined
): FrameMessage | undefined {
  if (!source || event.source !== source) return
  if (event.origin !== window.location.origin) return
  const data: unknown = event.data
  if (typeof data !== 'object' || data === null || !('type' in data)) return
  return data as FrameMessage
}

export const postToFrame = (target: Window, message: FrameMessage) =>
  target.postMessage(message, window.location.origin)
