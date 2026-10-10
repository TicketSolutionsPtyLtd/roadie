import { describe, it } from 'vitest'

import { cardSizeTable } from '@/lib/card-sizes'
import {
  chartLabelLimitsTable,
  copyLimitsTable,
  periodComparisonsTable
} from '@/lib/dashboard-limits'
import { expectRendersTable } from '@/lib/twinTestUtils'

import { CardSizes } from './CardSizes'
import { ChartLabelLimits, CopyLimits } from './CopyLimits'
import { PeriodComparisons } from './PeriodComparisons'

describe('dashboard tables match their markdown twin', () => {
  it.each([
    ['CardSizes', <CardSizes key='a' />, cardSizeTable()],
    ['CopyLimits', <CopyLimits key='b' />, copyLimitsTable()],
    ['ChartLabelLimits', <ChartLabelLimits key='c' />, chartLabelLimitsTable()],
    [
      'PeriodComparisons',
      <PeriodComparisons key='d' />,
      periodComparisonsTable()
    ]
  ])('%s', (_, element, table) => expectRendersTable(element, table))
})
