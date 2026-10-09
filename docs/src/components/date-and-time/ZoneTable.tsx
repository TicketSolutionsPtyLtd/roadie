import { ProseTable } from './ReadsTable'
import { zoneRows } from './example'

/** Each Australian zone's abbreviations and daylight saving, from Intl. */
export function ZoneTable() {
  return (
    <ProseTable
      slot='zone-table'
      head={['Abbreviation', 'Where', 'Daylight saving']}
    >
      {zoneRows().map(({ abbreviation, where, daylightSaving }) => (
        <tr key={where}>
          <td>
            <code>{abbreviation}</code>
          </td>
          <td>{where}</td>
          <td>{daylightSaving}</td>
        </tr>
      ))}
    </ProseTable>
  )
}
