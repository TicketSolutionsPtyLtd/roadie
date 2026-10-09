import { readFileSync } from 'node:fs'

let command = ''
try {
  command = String(JSON.parse(readFileSync(0, 'utf8')).tool_input?.command)
} catch {
  process.exit(0)
}

const createsPr = /(^|[\s;&|(`$])gh\s[^\n]*?\bpr\s+(create|new)\b/m
const isDraft = /\s(--draft|-d)(\s|=|$)/

if (createsPr.test(command) && !isDraft.test(command)) {
  console.error(
    'Open PRs as drafts: add --draft. Run gh pr ready once local checks pass and the local review is clean (docs/contributing/PR_WORKFLOW.md, section 7).'
  )
  process.exit(2)
}
