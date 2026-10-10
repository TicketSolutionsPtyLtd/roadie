import { ProseDataTable } from '@/components/ProseTable'
import { cardSizeTable } from '@/lib/card-sizes'

/** Each card size's span at each width, from `CARD_SPANS`. */
export function CardSizes() {
  return <ProseDataTable slot='card-sizes' table={cardSizeTable()} />
}
