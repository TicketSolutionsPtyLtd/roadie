import { type LinkClick, isPlainLinkClick } from '../../utils/isPlainLinkClick'

type NavigationLike = {
  activation?: {
    entry: { key?: string }
    navigationType: string
  } | null
  currentEntry?: { index: number; key?: string } | null
  entries?: () => { sameDocument: boolean; url: string | null }[]
}

type BackClick = LinkClick & { preventDefault: () => void }

/** Uses the previous entry only when it is this rendered link's route and query. */
export function traverseToBackHref(event: BackClick): boolean {
  if (typeof window === 'undefined' || !isPlainLinkClick(event)) return false

  const navigation = (window as { navigation?: NavigationLike }).navigation
  const current = navigation?.currentEntry
  const activation = navigation?.activation
  if (
    !activation ||
    !navigation?.entries ||
    !current ||
    current.index < 1 ||
    // Chromium keeps earlier entries marked same-document across a reload.
    (activation.navigationType === 'reload' &&
      activation.entry.key === current.key)
  )
    return false

  try {
    const previous = navigation.entries()[current.index - 1]
    const target = (event.currentTarget as HTMLAnchorElement).href.split('#')[0]
    if (
      !previous?.sameDocument ||
      !previous.url ||
      previous.url.split('#')[0] !== target
    )
      return false

    // History.back has no NavigationResult that can reject after this handler
    // cancels the link.
    window.history.back()
    event.preventDefault()
    return true
  } catch {
    // Leave the click alone so its real href remains the safe fallback.
    return false
  }
}
