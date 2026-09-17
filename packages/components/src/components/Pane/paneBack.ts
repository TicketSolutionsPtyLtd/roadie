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
export function traverseToBackHref(
  event: BackClick,
  backHref: string
): boolean {
  if (typeof window === 'undefined' || !isPlainLinkClick(event)) return false

  const navigation = (window as { navigation?: NavigationLike }).navigation
  const activation = navigation?.activation
  const current = navigation?.currentEntry
  // Chromium keeps earlier entries marked same-document across a reload. The
  // activation entry identifies the one that loaded this document.
  const isReloadedEntry =
    activation?.navigationType === 'reload' &&
    current?.key !== undefined &&
    activation.entry.key === current.key
  if (
    activation === undefined ||
    activation === null ||
    typeof navigation?.entries !== 'function' ||
    current === undefined ||
    current === null ||
    current.index <= 0 ||
    isReloadedEntry
  ) {
    return false
  }

  try {
    const previous = navigation.entries()[current.index - 1]
    if (previous?.sameDocument !== true || previous.url === null) return false

    const renderedHref = event.currentTarget.getAttribute('href') ?? backHref
    const targetUrl = new URL(
      renderedHref,
      event.currentTarget.ownerDocument.baseURI
    )
    const previousUrl = new URL(previous.url)
    if (
      previousUrl.origin !== targetUrl.origin ||
      previousUrl.pathname !== targetUrl.pathname ||
      previousUrl.search !== targetUrl.search
    ) {
      return false
    }

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
