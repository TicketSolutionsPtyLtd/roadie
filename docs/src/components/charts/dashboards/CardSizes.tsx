import { ProseTable } from '@/components/date-and-time/ReadsTable'
import { cardSizeTable } from '@/lib/card-sizes'

/** Each card size's span at each width, from `CARD_SPANS`. */
export function CardSizes() {
  const { head, rows } = cardSizeTable()
  return (
    <ProseTable slot='card-sizes' head={head}>
      {rows.map(({ size, spans, use }) => (
        <tr key={size}>
          <td>
            <code>{size}</code>
          </td>
          {spans.map((span, index) => (
            <td key={index}>{span}</td>
          ))}
          <td>{use}</td>
        </tr>
      ))}
    </ProseTable>
  )
}
