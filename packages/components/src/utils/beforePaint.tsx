import { useSyncExternalStore } from 'react'

const subscribeToNothing = () => () => {}

/** True on the server and while hydrating, false once the client renders alone. */
function useHydrating() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => false,
    () => true
  )
}

/**
 * Runs `fix`, with the element just before it as `e`, while the page parses,
 * so what only the reader's browser knows is right on first paint. Server
 * markup only: a client render already knows, and React never runs it there.
 */
export function BeforePaint({ fix }: { fix: string }) {
  const hydrating = useHydrating()
  if (!hydrating) return null
  // No `currentScript` in a shadow root, where the server's guess stays.
  const __html = `(function(s){var e=s&&s.previousElementSibling;if(e){${fix}}})(document.currentScript)`
  return <script dangerouslySetInnerHTML={{ __html }} />
}
