import type { EditorValue, StoredEditorValue } from './value'

/**
 * An email: a design in the `email` preset, or a whole HTML page kept as
 * written, such as one pasted in from another tool.
 */
export type EmailContent =
  | { kind: 'design'; value: EditorValue }
  | { kind: 'html'; html: string }

/** An email as read back from storage, before `migrate` checks its design. */
export type StoredEmailContent =
  | { kind: 'design'; value: StoredEditorValue }
  | { kind: 'html'; html: string }
