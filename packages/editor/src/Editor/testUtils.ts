import { userEvent } from 'vitest/browser'

const MAC = /^(Mac|iP)/.test(navigator.platform)

export const MOD = MAC ? 'Meta' : 'Control'

// Firefox and WebKit on macOS leave the caret where it is on Home and End.
export const LINE_START = MAC ? '{Meta>}{ArrowLeft}{/Meta}' : '{Home}'
export const LINE_END = MAC ? '{Meta>}{ArrowRight}{/Meta}' : '{End}'

// ProseMirror resets the DOM selection 20ms after the editor takes focus, and
// in Firefox that drops Shift+Arrow moves it hasn't read yet. On a triple
// click ProseMirror selects the paragraph itself, so nothing is dropped.
export const selectParagraph = (text: Element) => userEvent.tripleClick(text)
