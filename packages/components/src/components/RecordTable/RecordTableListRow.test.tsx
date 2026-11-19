import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { gridParts } from '../RecordGrid/parts'
import { showFields, testShows } from '../Records/testUtils'
import type { RecordCardParts } from '../Records/types'
import { RecordTableListRow } from './RecordTableListRow'

const partsFor = (config: { description?: 'city'; details: string[] }) =>
  gridParts({ title: 'show', ...config }, showFields, {
    type: 'list'
  }) as RecordCardParts

function renderRow(parts: RecordCardParts, index: number) {
  const show = testShows(8)[index]!
  const { container } = render(
    <ul>
      <RecordTableListRow id={show.id} row={show} parts={parts} bleed />
    </ul>
  )
  return {
    description: container.querySelector('[data-slot="list-item-description"]')
      ?.textContent,
    tall: container.querySelector('.h-16') !== null
  }
}

describe('RecordTableListRow', () => {
  it('follows the description with each detail', () => {
    const parts = partsFor({ description: 'city', details: ['sold', 'status'] })
    expect(renderRow(parts, 1).description).toBe('Melbourne · 37 · Sold out')
  })

  it('leaves out a detail with no value', () => {
    const parts = partsFor({ description: 'city', details: ['sold'] })
    expect(renderRow(parts, 0).description).toBe('Brisbane')
  })

  it('gives details a second line without a description', () => {
    expect(renderRow(partsFor({ details: ['sold'] }), 1)).toEqual({
      description: '37',
      tall: true
    })
  })
})
