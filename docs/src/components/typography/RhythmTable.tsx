import { getFamilyTokens } from '@/lib/tokens'

const CONTEXTS = ['display', 'ui', 'prose', 'code']

/** Line height and letter spacing for each text context, from its tokens. */
export async function RhythmTable() {
  const tokens = await getFamilyTokens('typography')
  const valueOf = (name: string) => {
    const token = tokens.find((entry) => entry.name === name)
    if (!token) throw new Error(`No ${name} token in the manifest.`)
    return token.value!.light!
  }

  return (
    <table data-slot='rhythm-table'>
      <thead>
        <tr>
          <th>Context</th>
          <th>Line height</th>
          <th>Letter spacing</th>
        </tr>
      </thead>
      <tbody>
        {CONTEXTS.map((context) => (
          <tr key={context} data-slot='rhythm-row'>
            <td>
              <code>{context}</code>
            </td>
            <td>{valueOf(`--leading-${context}`)}</td>
            <td>{valueOf(`--tracking-${context}`)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
