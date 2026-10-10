import { ProseTable } from '@/components/ProseTable'

import { comparisonRows } from './example'

/** Each comparison of month to date, from `resolveComparison` and `describeComparison`. */
export function ComparisonTable() {
  return (
    <ProseTable
      slot='comparison-table'
      head={['Comparison', 'Context line', 'Covers']}
    >
      {comparisonRows().map(({ code, context, covers }) => (
        <tr key={code}>
          <td>
            <code>{code}</code>
          </td>
          <td>{context}</td>
          <td>{covers}</td>
        </tr>
      ))}
    </ProseTable>
  )
}
