export function useStylesheet(css: string) {
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)
  return () => style.remove()
}

export async function loadBrandFont() {
  const [face] = await document.fonts.load('1em Intermission')
  if (face?.status !== 'loaded')
    throw new Error(
      'Intermission did not load, so text would measure in a fallback font'
    )
}
