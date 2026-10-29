import axe from 'axe-core'
import { page } from 'vitest/browser'

export function useStylesheet(css: string) {
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)
  return () => style.remove()
}

export const widths = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 }
] as const

export async function atWidth(width: number, height: number) {
  await page.viewport(width, height)
  await new Promise(requestAnimationFrame)
}

export async function axeViolations(container: Element) {
  const results = await axe.run(container)
  return results.violations.map(
    (violation) => `${violation.id}: ${violation.nodes.length}`
  )
}
