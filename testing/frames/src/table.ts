import type { FrameRecord } from './record'

export type LabelledRun = { label: string; records: FrameRecord[] }

const cell = (record: FrameRecord | undefined) =>
  record
    ? `${record.p95} · ${record.worst} · ${Math.round(record.droppedShare * 1000) / 10}% · ${record.longTasks ?? 'n/a'}`
    : '–'

/**
 * A Markdown table of each scenario across the runs, in the order the first
 * run met them. A cell reads p95 ms · worst ms · dropped · long tasks.
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
    runs.every((run) => find(run, scenario)?.pass !== false)
      ? 'Met'
      : `Missed in ${runs
          .filter((run) => find(run, scenario)?.pass === false)
          .map((run) => run.label.toLowerCase())
          .join(', ')}`
  ])
  return [header, header.map(() => '---'), ...rows]
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n')
}

export const parseRecords = (jsonl: string): FrameRecord[] =>
  jsonl
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as FrameRecord)
