import { use, useSyncExternalStore } from 'react'

import { RoadieNonceContext } from '../providers/RoadieNonceContext'

/** Apple keyboards, read from `navigator`'s platform. */
export const APPLE_PLATFORM = /mac|iphone|ipad|ipod/i

/**
 * Each fix this module can write. Values go in only as JSON literals, so no
 * caller can put script text in the page.
 */
export type BeforePaintFix =
  | { kind: 'keyboard' }
  | {
      kind: 'drop-year'
      /** The year whose words drop it, in `timeZone`. */
      year: string
      timeZone: string
      /** Each `time`'s words without the year, or null to keep it. */
      words: (string | null)[]
    }

// `<` escaped, so no value can close the script or open a comment.
const literal = (value: unknown) =>
  JSON.stringify(value).replace(/</g, '\\u003c')

function script(fix: BeforePaintFix) {
  if (fix.kind === 'keyboard')
    return `var n=navigator,p=n.userAgentData&&n.userAgentData.platform||n.platform||n.userAgent;e.setAttribute('data-keyboard',${APPLE_PLATFORM}.test(p)?'apple':'other')`
  const now = `new Intl.DateTimeFormat('en',{timeZone:${literal(fix.timeZone)},year:'numeric'}).format(new Date())`
  return `if(${now}!==${literal(fix.year)})return;var w=${literal(fix.words)},t=e.matches('time')?[e]:e.querySelectorAll('time');for(var i=0;i<t.length;i++)if(w[i])t[i].textContent=w[i]`
}

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
 * Applies `fix` to the element just before it while the page parses, so what
 * only the reader's browser knows is right on first paint. Server markup
 * only: a client render already knows, and React never runs it there.
 */
export function BeforePaint({ fix }: { fix: BeforePaintFix }) {
  const hydrating = useHydrating()
  const nonce = use(RoadieNonceContext)
  if (!hydrating) return null
  // No `currentScript` in a shadow root, where the server's guess stays.
  const __html = `(function(s){var e=s&&s.previousElementSibling;if(e){${script(fix)}}})(document.currentScript)`
  return (
    // Browsers hide a nonce from the DOM, so hydration reads it as missing.
    <script
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html }}
    />
  )
}
