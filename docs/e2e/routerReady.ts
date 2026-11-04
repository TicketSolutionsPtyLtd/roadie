import type { Page } from 'playwright'

/**
 * Waits for Next's router to take over the page: it patches `pushState` once
 * it has hydrated and replaced the history entry. A hash pushed before then
 * is dropped, and a link clicked before then loads a whole page. Network idle
 * can come first, and `history.state` outlives a reload, so neither will do.
 */
export const routerReady = (page: Page) =>
  page.waitForFunction(
    () => !String(window.history.pushState).includes('[native code]')
  )
