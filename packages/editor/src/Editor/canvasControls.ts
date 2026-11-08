/** A section's Settings and the badge reading its rule, on its top edge. */
export const SECTION_CONTROLS = [
  '[data-slot="editor-section-settings"]',
  '[data-slot="editor-section-toolbar"] [data-slot="badge"]'
].join(', ')

/** The grips beside a block and above a column. */
export const GRIPS = [
  '[data-slot="editor-column-handle"]',
  '[data-slot="editor-block-handle"]'
].join(', ')

/** Where the canvas's shown controls matching `selector` sit in `frame`. */
export function controlRects(frame: Element | null, selector: string) {
  if (!frame) return []
  return Array.from(frame.querySelectorAll(selector))
    .filter((control) => getComputedStyle(control).visibility === 'visible')
    .map((control) => control.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0)
}
