import { ProseTable } from '@/components/ProseTable'

import { rangeRows } from './example'

/** Each relative range's label and the dates it covers, from `describeDateRange`. */
export function RangeTable() {
  return (
    <ProseTable slot='range-table' head={['Value', 'Label', 'Covers']}>
      {rangeRows().map(({ code, label, detail }) => (
        <tr key={code}>
          <td>
            <code>{code}</code>
          </td>
          <td>{label}</td>
          <td>{detail}</td>
        </tr>
      ))}
    </ProseTable>
  )
}
