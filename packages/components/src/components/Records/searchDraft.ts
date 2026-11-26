/** A server's search field, which runs ahead of the view's search until typing pauses. */
export type SearchDraft = {
  /** What the field shows. */
  draft: string
  /** The parent's search as last shown. */
  seen: string
  /** Searches sent and not yet seen back, oldest first, so a slow parent's late echo of an earlier one isn't read as a change from outside. */
  sent: readonly string[]
  /** Counts each search set from outside, which voids a pending draft. */
  outside: number
}

export type SearchDraftEvent =
  /** The parent's search, each render. */
  | { type: 'shown'; search: string }
  /** A keystroke, not sent yet. */
  | { type: 'typed'; search: string }
  /** A search that goes to the parent now, replacing the draft. */
  | { type: 'sent'; search: string }

export const startSearchDraft = (search: string): SearchDraft => ({
  draft: search,
  seen: search,
  sent: [],
  outside: 0
})

/** What the parent will hold once every search sent has echoed. */
export const heldSearch = (state: SearchDraft) =>
  state.sent.at(-1) ?? state.seen

/** The next draft; the same object when nothing changes. */
export function searchDraft(
  state: SearchDraft,
  event: SearchDraftEvent
): SearchDraft {
  const { search } = event
  if (
    event.type === 'typed' ||
    (event.type === 'sent' && search === heldSearch(state))
  )
    return search === state.draft ? state : { ...state, draft: search }
  if (event.type === 'sent')
    return {
      ...state,
      draft: search,
      sent: [...state.sent, search].slice(-20)
    }
  if (search !== state.seen) {
    const echo = state.sent.indexOf(search)
    if (echo !== -1)
      return { ...state, seen: search, sent: state.sent.slice(echo + 1) }
    // A search set from outside, like a reset or the URL, replaces the draft.
    return {
      draft: search,
      seen: search,
      sent: [],
      outside: state.outside + 1
    }
  }
  // The parent holds the last search sent, so earlier ones it skipped can't
  // echo back and mask a later change from outside.
  if (state.sent.length > 0 && search === state.sent.at(-1))
    return { ...state, sent: [] }
  return state
}
