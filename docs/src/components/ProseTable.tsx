import type { ReactNode } from 'react'

import { ProseScroll } from '@/components/ProseScroll'
import { type TwinTable, segments } from '@/lib/twin-table'

/** A table styled as a markdown table, for docs components inside prose. */
export function ProseTable({
  slot,
  head,
  children
}: {
  slot: string
  head: string[]
  children: ReactNode
}) {
  return (
    <ProseScroll data-slot={slot}>
      <table>
        <thead>
          <tr>
            {head.map((cell) => (
              <th key={cell}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </ProseScroll>
  )
}

/** A `TwinTable` as a prose table, so the page and its markdown twin read the same rows. */
export function ProseDataTable({
  slot,
  table
}: {
  slot: string
  table: TwinTable
}) {
  return (
    <ProseTable slot={slot} head={table.head}>
      {table.rows.map((row, rowIndex) => (
        <tr key={rowIndex}>
          {row.map((cell, cellIndex) => (
            <td key={cellIndex}>
              {segments(cell).map((segment, index) =>
                typeof segment === 'string' ? (
                  segment
                ) : (
                  <code key={index}>{segment.code}</code>
                )
              )}
            </td>
          ))}
        </tr>
      ))}
    </ProseTable>
  )
}
