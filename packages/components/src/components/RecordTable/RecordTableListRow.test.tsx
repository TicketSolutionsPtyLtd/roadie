import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { gridParts } from '../RecordGrid/parts'
import { hasSubline, listRowSize } from '../Records/rowSizing'
import { showFields, testShows } from '../Records/testUtils'
import type { RecordCardParts } from '../Records/types'
import { RecordTableListRow } from './RecordTableListRow'

const partsFor = (config: { description?: 'city'; details: string[] }) =>
  gridParts({ title: 'show', ...config }, showFields, {
    type: 'list'
  }) as RecordCardParts

function renderRow(parts: RecordCardParts, index: number, sold?: number) {
  const show = { ...testShows(8)[index]!, ...(sold !== undefined && { sold }) }
  const { container } = render(
    <ul>
      <RecordTableListRow id={show.id} row={show} parts={parts} bleed />
    </ul>
  )
  return container.querySelector('[data-slot="list-item-description"]')
    ?.textContent
}

describe('RecordTableListRow', () => {
  it('follows the description with each detail', () => {
    const parts = partsFor({ description: 'city', details: ['sold', 'status'] })
    expect(renderRow(parts, 1)).toBe('Melbourne · 37 · Sold out')
  })

  it.each([
    ['missing', undefined],
    ['not a number', Number.NaN]
  ])('leaves out a detail whose value is %s', (_, sold) => {
    const parts = partsFor({ description: 'city', details: ['sold'] })
    expect(renderRow(parts, 0, sold)).toBe('Brisbane')
  })

  it('gives details a second line without a description', () => {
    const parts = partsFor({ details: ['sold'] })
    expect(renderRow(parts, 1)).toBe('37')
    expect(listRowSize(parts).estimateRem).toBe(4)
  })

  it('renders no second line with neither', () => {
    const parts = partsFor({ details: [] })
    expect(hasSubline(parts)).toBe(false)
    expect(renderRow(parts, 1)).toBeUndefined()
  })
})
