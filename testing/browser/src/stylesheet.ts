/** Adds `css` to the page and returns a function that removes it. */
export function useStylesheet(css: string) {
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)
  return () => style.remove()
}

/** Waits for the brand font, so text measures as it renders for people. */
export async function loadBrandFont() {
  const [face] = await document.fonts.load('1em Intermission')
  if (face?.status !== 'loaded')
    throw new Error(
      'Intermission did not load, so text would measure in a fallback font'
    )
}

/** Turns transitions off, so a test reads each state's final value at once. */
export const STILL = '*, *::before, *::after { transition: none !important }'
