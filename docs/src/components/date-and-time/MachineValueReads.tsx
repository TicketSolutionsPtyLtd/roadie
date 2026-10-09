import { ReadsTable } from './ReadsTable'
import { machineValueRows } from './example'

/** The `datetime` value for each shape, from `formatMachine`. */
export function MachineValueReads() {
  return (
    <ReadsTable
      slot='machine-value-reads'
      head={['Showing', 'datetime']}
      rows={machineValueRows()}
    />
  )
}
