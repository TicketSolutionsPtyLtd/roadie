import { paletteScores } from '@oztix/roadie-core/dataviz'

const ROWS = [
  ['Adjacent, colour-blind', 'adjacentCvd', '8 or more'],
  ['Any of the first five, colour-blind', 'firstFiveCvd', '8 or more'],
  ['Adjacent, normal vision', 'adjacentNormal', '15 or more']
] as const

export function ValidatorScores() {
  const scores = paletteScores()
  const under3 = (slots: number[]) => slots.join(', ') || 'None'

  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-sm tabular-nums'>
        <thead className='text-left text-subtle'>
          <tr>
            <th className='py-2 font-medium'>Check (worst ΔE)</th>
            <th className='py-2 font-medium'>Light</th>
            <th className='py-2 font-medium'>Dark</th>
            <th className='py-2 font-medium'>Target</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-subtler'>
          {ROWS.map(([label, key, target]) => (
            <tr key={key}>
              <td className='py-2'>{label}</td>
              <td className='py-2'>{scores.light[key]}</td>
              <td className='py-2'>{scores.dark[key]}</td>
              <td className='py-2 text-subtle'>{target}</td>
            </tr>
          ))}
          <tr>
            <td className='py-2'>Slots under 3:1 on the page</td>
            <td className='py-2'>{under3(scores.light.lightSlotsUnder3)}</td>
            <td className='py-2'>{under3(scores.dark.lightSlotsUnder3)}</td>
            <td className='py-2 text-subtle'>Never carry text</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
