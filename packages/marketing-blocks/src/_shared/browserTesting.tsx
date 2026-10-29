import axe from 'axe-core'

import roadieCss from '../../vitest.browser.css?inline'

/** Adds the compiled Roadie and block styles to the test page, and returns their removal. */
export function useBlockStyles() {
  const style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
  return () => style.remove()
}

/** The ids of the axe rules an element breaks. */
export async function axeViolations(element: Element) {
  const { violations } = await axe.run(element, {
    resultTypes: ['violations'],
    // Roadie measures contrast with APCA instead (docs/decisions/0010-apca-contrast.md).
    rules: { 'color-contrast': { enabled: false } }
  })
  return violations.map(({ id }) => id)
}

/** A placeholder image of the given size, so layout tests load nothing over the network. */
export function placeholderImage(width: number, height: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
