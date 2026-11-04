import type { FrameRecord } from './record'

export type LabelledRun = { label: string; records: FrameRecord[] }

const cell = (record: FrameRecord | undefined) =>
  record
    ? `${record.p95} · ${record.worst} · ${Math.round(record.droppedShare * 1000) / 10}% · ${record.longTasks ?? 'n/a'}`
    : '–'

/**
 * A Markdown table of each scenario across the runs, in the order the first
 * run met them.
 */
export function frameTable(runs: LabelledRun[]) {
  const scenarios = [
    ...new Set(runs.flatMap((run) => run.records.map((r) => r.scenario)))
  ]
  const find = (run: LabelledRun, scenario: string) =>
    run.records.findLast((record) => record.scenario === scenario)
  const header = [
    'Scenario',
    ...runs.map((run) => {
      const cpus = [...new Set(run.records.map((record) => record.cpu))]
      return `${run.label} (${cpus.map((cpu) => `${cpu}x`).join(', ')})`
    }),
    'Budget'
  ]
  const rows = scenarios.map((scenario) => [
    scenario,
    ...runs.map((run) => cell(find(run, scenario))),
    budgetCell(runs.map((run) => [run.label, find(run, scenario)] as const))
  ])
  return [header, header.map(() => '---'), ...rows]
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n')
}

function budgetCell(results: (readonly [string, FrameRecord | undefined])[]) {
  const missed = results
    .filter(([, record]) => record?.pass === false)
    .map(([label]) => label.toLowerCase())
  const ticket = results.find(([, record]) => record?.knownMiss)?.[1]?.knownMiss
  const verdict = missed.length ? `Missed in ${missed.join(', ')}` : 'Met'
  return ticket ? `${verdict}, filed as ${ticket}` : verdict
}

export const parseRecords = (jsonl: string): FrameRecord[] =>
  jsonl
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as FrameRecord)
