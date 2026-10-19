import { proseVariants } from '@oztix/roadie-components/prose'
import { cn } from '@oztix/roadie-core/utils'

export type EditorSize = 'sm' | 'md' | 'lg'
export type EditorEmphasis = 'normal' | 'subtle' | 'subtler'

export const EDITOR_MIN_HEIGHT: Record<EditorSize, string> = {
  sm: 'min-h-20',
  md: 'min-h-24',
  lg: 'min-h-28'
}

export const EDITOR_FRAME: Record<EditorEmphasis, string> = {
  normal: 'emphasis-field is-interactive-field-group',
  subtle:
    'bg-subtle text-normal border border-transparent is-interactive-field-group',
  // Content on the page, so focus shows by the caret, not a ring.
  subtler:
    'text-normal data-disabled:pointer-events-none data-disabled:opacity-50 data-disabled:grayscale-30'
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
    emphasis === 'subtler'
      ? 'min-h-[4lh]'
      : [EDITOR_CONTENT_PADDING[size], EDITOR_CONTENT_MIN_HEIGHT[size]]
  )
}

/** A step smaller than the editor, so the controls don't crowd the text. */
export const EDITOR_TOOLBAR_SIZE: Record<EditorSize, EditorSize> = {
  sm: 'sm',
  md: 'sm',
  lg: 'md'
}

// The toolbar's height at its size: a control, the toolbar's padding, and its border.
export const EDITOR_TOOLBAR_HEIGHT: Record<EditorSize, string> = {
  sm: '[--editor-toolbar-height:calc(--spacing(10)+2px)]',
  md: '[--editor-toolbar-height:calc(--spacing(10)+2px)]',
  lg: '[--editor-toolbar-height:calc(--spacing(12)+2px)]'
}

// A subtler editor has no padding, so its toolbar starts where the text does
// and keeps its own gap above the first line.
export const EDITOR_TOOLBAR_ROOM: Record<EditorEmphasis, string> = {
  normal: 'mx-2 mt-2 mb-1',
  subtle: 'mx-2 mt-2 mb-1',
  subtler: 'mb-3'
}
