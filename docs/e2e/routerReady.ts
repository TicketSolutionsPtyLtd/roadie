import type { Page } from 'playwright'

/**
 * Waits for Next's router to take over the page. It replaces the history
 * entry as it hydrates, which drops a hash pushed before then, and a link
 * clicked before then loads a whole page. Network idle can come first.
 */
export const routerReady = (page: Page) =>
  page.waitForFunction(
    () => (window.history.state as { __NA?: boolean } | null)?.__NA === true
  )
