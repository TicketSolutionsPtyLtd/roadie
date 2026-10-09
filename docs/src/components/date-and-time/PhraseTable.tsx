import { ProseTable } from './ReadsTable'
import { phraseRows } from './example'

/** What `parseDatePhrase` suggests for typed text, best first. */
export function PhraseTable() {
  return (
    <ProseTable slot='phrase-table' head={['Typed', 'Suggests']}>
      {phraseRows().map(({ typed, suggests }) => (
        <tr key={typed}>
          <td>
            <code>{typed}</code>
          </td>
          <td>{suggests.join(' or ')}</td>
        </tr>
      ))}
    </ProseTable>
  )
}
