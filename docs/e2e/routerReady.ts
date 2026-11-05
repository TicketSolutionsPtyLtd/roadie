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

/**
 * Waits for a page `goto` loaded to settle: nothing left to fetch, and
 * hydrated. Before hydration the layout can differ, such as guideline cards
 * stacked one to a row.
 */
export async function settled(page: Page) {
  await page.waitForLoadState('networkidle')
  await routerReady(page)
}
