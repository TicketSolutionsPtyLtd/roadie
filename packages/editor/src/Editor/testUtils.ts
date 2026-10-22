import { userEvent } from 'vitest/browser'

const MAC = /^(Mac|iP)/.test(navigator.platform)

export const MOD = MAC ? 'Meta' : 'Control'

// Firefox and WebKit on macOS leave the caret where it is on Home and End.
export const LINE_START = MAC ? '{Meta>}{ArrowLeft}{/Meta}' : '{Home}'
export const LINE_END = MAC ? '{Meta>}{ArrowRight}{/Meta}' : '{End}'

// ProseMirror resets the DOM selection 20ms after the editor takes focus, and
// in Firefox that drops Shift+Arrow moves it hasn't read yet. Select all is a
// ProseMirror command, so it can't be dropped.
export const selectAll = () => userEvent.keyboard(`{${MOD}>}a{/${MOD}}`)

// ProseMirror selects the paragraph itself on a triple click, so the same holds.
export const selectParagraph = (text: Element) => userEvent.tripleClick(text)
