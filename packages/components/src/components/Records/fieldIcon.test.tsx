import type { ReactElement } from 'react'

import {
  CalendarBlankIcon,
  CircleHalfIcon,
  CurrencyDollarIcon,
  HashIcon,
  TagIcon,
  TextAaIcon,
  ToggleLeftIcon
} from '@phosphor-icons/react/ssr'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { fieldIcon } from './fieldIcon'
import type { RecordsField } from './types'

const markup = (icon: unknown) => renderToStaticMarkup(icon as ReactElement)
const of = (type: RecordsField['type'], more: Partial<RecordsField> = {}) => ({
  key: type,
  label: type,
  type,
  ...more
})

describe('fieldIcon', () => {
  it.each<[string, RecordsField, ReactElement]>([
    ['an option', of('option'), <TagIcon weight='bold' />],
    [
      'an option with status',
      of('option', { status: { on_sale: { intent: 'success' } } }),
      <CircleHalfIcon weight='bold' />
    ],
    ['text', of('text'), <TextAaIcon weight='bold' />],
    ['a number', of('number'), <HashIcon weight='bold' />],
    ['money', of('money'), <CurrencyDollarIcon weight='bold' />],
    ['a date', of('date'), <CalendarBlankIcon weight='bold' />],
    ['a boolean', of('boolean'), <ToggleLeftIcon weight='bold' />]
  ])('gives %s its type’s icon', (_, field, icon) => {
    expect(markup(fieldIcon(field))).toBe(markup(icon))
  })

  it('prefers the field’s own icon', () => {
    const own = <svg data-testid='own' />
    expect(fieldIcon(of('option', { icon: own }))).toBe(own)
  })
})
