import { readFileSync } from 'node:fs'

import { frameTable, parseRecords } from '../src/table.ts'

const usage =
  'Usage: node testing/frames/bin/frame-table.ts <Label>=<report.jsonl> [<Label>=<report.jsonl> …]'

const runs = process.argv.slice(2).map((argument) => {
  const [label, file] = argument.split('=')
  if (!label || !file) {
    console.error(usage)
    process.exit(2)
  }
  return { label, records: parseRecords(readFileSync(file, 'utf8')) }
})
if (runs.length === 0) {
  console.error(usage)
  process.exit(2)
}

console.log(
  `Each cell: p95 ms · worst ms · dropped frames · long tasks.\n\n${frameTable(runs)}`
)
