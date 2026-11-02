// Phone sits under the `sm` breakpoint (40rem) and Tablet on `md` (48rem), so
// each lands on the side of a breakpoint an example changes at.
export const DEVICES = [
  { value: 'phone', label: 'Phone', width: 375 },
  { value: 'tablet', label: 'Tablet', width: 768 },
  { value: 'desktop', label: 'Desktop', width: undefined }
] as const

export type Device = (typeof DEVICES)[number]['value']

export const deviceWidth = (device: Device): number | undefined =>
  DEVICES.find(({ value }) => value === device)?.width

/** How far to shrink a frame wider than the space it sits in; 1 before layout. */
export const fitScale = (width: number, available: number) =>
  available > 0 ? Math.min(1, available / width) : 1

/** Runs an example the docs page posts to it, at the frame's own viewport width. */
export const FRAME_PATH = '/examples/frame/'

export type FrameExample = {
  code: string
  language: string
  previewLayout?: string
  /** The docs page's `<html>` class and style, so the frame keeps its theme and accent. */
  root: { className: string; style: string }
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
