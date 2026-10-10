import { ProseTable } from '@/components/ProseTable'

import type { Row } from './example'

type ReadsTableProps = {
  slot: string
  head: [string, string]
  rows: Row[]
  /** Sets the first column in code, for option values rather than words. */
  codeNames?: boolean
}

/** A two-column table of inputs and what the formatters return for them, styled as a markdown table. */
export function ReadsTable({ slot, head, rows, codeNames }: ReadsTableProps) {
  return (
    <ProseTable slot={slot} head={head}>
      {rows.map(({ name, reads }) => (
        <tr key={name}>
          <td>{codeNames ? <code>{name}</code> : name}</td>
          <td data-slot='reads'>
            {reads.map((value, index) => (
              <span key={value}>
                {index > 0 && ' and '}
                <code>{value}</code>
              </span>
            ))}
          </td>
        </tr>
      ))}
    </ProseTable>
  )
}
