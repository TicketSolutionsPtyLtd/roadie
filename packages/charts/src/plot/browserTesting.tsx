import type { ReactElement } from 'react'

import { type RenderResult, render } from '@testing-library/react'
import { expect } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Chart } from '../Chart'

export type CardSizeName = 'sm' | 'md' | 'lg' | 'full'
export const CARD_HEIGHTS: Record<CardSizeName, number> = {
  sm: 160,
  md: 220,
  lg: 260,
  full: 260
}

export function renderInCard(
  plot: ReactElement,
  { size = 'md', width = 560 }: { size?: CardSizeName; width?: number } = {}
): RenderResult {
  return render(
    <div style={{ width }}>
      <Chart label='Test chart' source='Oztix sales.' size={size}>
        {plot}
      </Chart>
    </div>
  )
}

/** Waits for the width band, which a ResizeObserver sets after the first paint. */
export const afterResize = () =>
  new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  )

export function expectFillsPlot(container: HTMLElement, height: number) {
  const plot = container.querySelector('[data-slot=chart-plot]')!
  const host = container.querySelector(
    '[data-slot=chart-plot-host]'
  )!.parentElement!
  expect(
    Math.abs(host.getBoundingClientRect().height - height)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(
      host.getBoundingClientRect().width - plot.getBoundingClientRect().width
    )
  ).toBeLessThanOrEqual(1)
}

// Firefox boxes SVG text by the font's full line height, so compare em boxes.
function emBox(element: Element) {
  const rect = element.getBoundingClientRect()
  const size = parseFloat(getComputedStyle(element).fontSize)
  const middle = (rect.top + rect.bottom) / 2
  return {
    left: rect.left,
    right: rect.right,
    top: middle - size / 2,
    bottom: middle + size / 2
  }
}

export function expectNoOverlap(container: HTMLElement, selector: string) {
  const boxes = [...container.querySelectorAll(selector)].map(emBox)
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!
      const b = boxes[j]!
      const overlap =
        a.left < b.right - 0.5 &&
        b.left < a.right - 0.5 &&
        a.top < b.bottom - 0.5 &&
        b.top < a.bottom - 0.5
      expect(overlap, `${selector} ${i} overlaps ${j}`).toBe(false)
    }
}

export function expectMinFontSize(container: HTMLElement, min = 11) {
  for (const text of container.querySelectorAll('svg.ts-chart text'))
    expect(parseFloat(getComputedStyle(text).fontSize)).toBeGreaterThanOrEqual(
      min
    )
}

export async function visitEveryStop(container: HTMLElement, max = 400) {
  const svg = container.querySelector<SVGElement>('svg.ts-chart')!
  const live = container.querySelector('[data-slot=chart-plot-announcement]')!
  svg.focus()
  await expect.poll(() => live.textContent).not.toBe('')
  const heard: string[] = []
  for (let i = 0; i < max; i++) {
    const text = live.textContent ?? ''
    if (heard.at(-1) === text) break
    heard.push(text)
    await userEvent.keyboard('{ArrowRight}')
  }
  return heard
}

export async function expectTableKeepsHeight(
  container: HTMLElement,
  getByRole: (role: string, options: { name: string }) => HTMLElement
) {
  const card = container.querySelector('[data-slot=data-card]')!
  const before = card.getBoundingClientRect().height
  await userEvent.click(getByRole('tab', { name: 'Table' }))
  expect(
    Math.abs(card.getBoundingClientRect().height - before)
  ).toBeLessThanOrEqual(0.5)
}
