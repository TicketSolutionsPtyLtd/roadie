import { describe, expect, it } from 'vitest'

import { cellText, columnStatus, humaniseStatus } from './cells'
import type { TableColumn } from './schema'

const status: TableColumn = {
  key: 'status',
  header: 'Status',
  kind: 'status',
  status: {
    paid: { intent: 'success', label: 'Paid in full' },
    on_sale: { intent: 'info' },
    refunded: { intent: 'neutral', order: 3 }
  }
}

describe('columnStatus', () => {
  it('reads the intent and label for a key', () => {
    expect(columnStatus(status, 'paid')).toEqual({
      intent: 'success',
      label: 'Paid in full'
    })
  })

  it('humanises a mapped key without a label', () => {
    expect(columnStatus(status, 'on_sale')).toEqual({
      intent: 'info',
      label: 'On sale'
    })
  })

  it('keeps the order', () => {
    expect(columnStatus(status, 'refunded')).toEqual({
      intent: 'neutral',
      label: 'Refunded',
      order: 3
    })
  })

  it('shows an unknown key as neutral raw text', () => {
    expect(columnStatus(status, 'charged_back')).toEqual({
      intent: 'neutral',
      label: 'charged_back'
    })
    expect(columnStatus(status, 'constructor')).toEqual({
      intent: 'neutral',
      label: 'constructor'
    })
  })
})

describe('humaniseStatus', () => {
  it.each([
    ['paid', 'Paid'],
    ['on_sale', 'On sale'],
    ['sold-out', 'Sold out'],
    ['partlyRefunded', 'Partly refunded']
  ])('%s reads as %s', (key, label) => {
    expect(humaniseStatus(key)).toBe(label)
  })
})

describe('cellText', () => {
  it('writes a status as its label', () => {
    expect(cellText(status, 'paid')).toBe('Paid in full')
    expect(cellText(status, 'mystery')).toBe('mystery')
  })

  it('formats numbers, meters and sparklines like their cells', () => {
    expect(
      cellText(
        { key: 'g', header: 'Gross', kind: 'number', format: 'currency' },
        1200
      )
    ).toBe('$1,200')
    expect(
      cellText({ key: 'm', header: 'Sell-through', kind: 'meter' }, 0.5)
    ).toBe('50%')
    expect(
      cellText({ key: 's', header: 'Daily', kind: 'sparkline' }, [1, 2, 30])
    ).toBe('30')
  })

  it('leaves an empty cell empty', () => {
    expect(cellText(status, null)).toBe('')
    expect(cellText(status, undefined)).toBe('')
  })
})
