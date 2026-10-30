import { proseVariants } from '@oztix/roadie-components/prose'
import { cn } from '@oztix/roadie-core/utils'

export type EditorSize = 'sm' | 'md' | 'lg'
export type EditorEmphasis = 'normal' | 'subtle' | 'raised' | 'subtler'

export const EDITOR_MIN_HEIGHT: Record<EditorSize, string> = {
  sm: 'min-h-20',
  md: 'min-h-24',
  lg: 'min-h-28'
}

const DISABLED =
  'data-disabled:pointer-events-none data-disabled:opacity-50 data-disabled:grayscale-30'

// A document, not a text field: focus shows on the caret's block, so the
// frame keeps its look while focused.
export const EDITOR_FRAME: Record<EditorEmphasis, string> = {
  normal: `emphasis-field ${DISABLED}`,
  subtle: `bg-subtle text-normal border border-transparent ${DISABLED}`,
  // The rim and shadow are its edge; the clear border keeps it one size.
  raised: `emphasis-raised border border-transparent ${DISABLED}`,
  subtler: `text-normal ${DISABLED}`
}

export const EDITOR_CONTENT_PADDING: Record<EditorSize, string> = {
  sm: 'px-3 py-2.5',
  md: 'px-3 py-3',
  lg: 'px-4 py-3.5'
}

// About four lines plus the padding, so a short description isn't cramped.
export const EDITOR_CONTENT_MIN_HEIGHT: Record<EditorSize, string> = {
  sm: 'min-h-[calc(4lh+--spacing(5))]',
  md: 'min-h-[calc(4lh+--spacing(6))]',
  lg: 'min-h-[calc(4lh+--spacing(7))]'
}

/** The editable area's text, padding, and room, which the skeleton holds too. */
export function editorContentClass(size: EditorSize, emphasis: EditorEmphasis) {
  return cn(
    proseVariants({ size }),
    // Text in a box runs its full width; a subtler editor's wraps where the
    // published page's will.
    emphasis === 'subtler'
      ? 'min-h-[4lh]'
      : [
          EDITOR_CONTENT_PADDING[size],
          EDITOR_CONTENT_MIN_HEIGHT[size],
          '[--prose-measure:none]'
        ]
  )
}

/** A step smaller than the editor, so the controls don't crowd the text. */
export const EDITOR_TOOLBAR_SIZE: Record<EditorSize, EditorSize> = {
  sm: 'sm',
  md: 'sm',
  lg: 'md'
}

export type EditorToolbarMode = 'docked' | 'floating'

// The docked bar's height at its size: a control and the divider under it.
export const EDITOR_TOOLBAR_HEIGHT: Record<EditorSize, string> = {
  sm: '[--editor-toolbar-height:calc(--spacing(10)+1px)]',
  md: '[--editor-toolbar-height:calc(--spacing(10)+1px)]',
  lg: '[--editor-toolbar-height:calc(--spacing(12)+1px)]'
}

// Sticky, so each fill is opaque and matches the frame the text scrolls
// under, through its invalid fill. A subtle frame is a tint on the page, so
// the bar lays it on the normal surface. A subtler editor has no box for a
// divider to close, so its bar has none, and keeps a gap above the first line.
// A framed bar clips the toolbar's fill to the frame's corners.
export const EDITOR_DOCKED_BAR: Record<EditorEmphasis, string> = {
  normal: 'overflow-clip rounded-t-lg bg-inherit border-b border-subtler',
  subtle:
    'overflow-clip rounded-t-lg bg-normal bg-linear-to-b from-(--intent-bg-subtle) to-(--intent-bg-subtle) border-b border-subtler',
  raised: 'overflow-clip rounded-t-lg bg-inherit border-b border-subtler',
  // A clear edge keeps every bar one height, which the skeleton holds.
  subtler: 'mb-3 bg-normal border-b border-transparent'
}
