#!/usr/bin/env node
// Uploads a PR's screenshots to the repo's `screenshots` branch with `gh api`
// and prints the markdown to paste under Evidence. Nothing is committed
// locally, so no hook runs and no orphan branch is checked out.
// Usage: node scripts/pr-screenshots.mjs <pr number> <image>...
import { spawnSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'

import { markdown, planUpload, upload } from './lib/pr-screenshots.mjs'

function gh(args, input) {
  const result = spawnSync('gh', args, {
    input,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout).trim()
    const error = new Error(`gh ${args.slice(0, 3).join(' ')}: ${message}`)
    error.status = Number(message.match(/HTTP (\d{3})/)?.[1]) || undefined
    throw error
  }
  return result.stdout
}

async function api(method, path, body) {
  const args = ['api', '--method', method, path]
  if (body) args.push('--input', '-')
  const out = gh(args, body && JSON.stringify(body))
  return out.trim() ? JSON.parse(out) : {}
}

try {
  const [pr, ...paths] = process.argv.slice(2)
  const uploads = planUpload(
    pr,
    paths.map((path) => ({ path, bytes: statSync(path).size }))
  )
  const view = 'repo view --json nameWithOwner --jq .nameWithOwner'
  const repo = gh(view.split(' ')).trim()
  await upload({
    api,
    repo,
    pr,
    files: uploads.map(({ path, target }) => ({
      target,
      content: readFileSync(path).toString('base64')
    }))
  })
  console.log(markdown(repo, uploads))
} catch (error) {
  console.error(`pr-screenshots: ${error.message}`)
  process.exit(1)
}
