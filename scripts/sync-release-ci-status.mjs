#!/usr/bin/env node
// Sets the Version Packages PR's "CI result" to main's CI result for the
// main commit the release branch is built on. Only calls the GitHub API.
// Usage: node scripts/sync-release-ci-status.mjs [--dry-run] [--head <sha>]
// --dry-run prints the status rather than posting it. --head, which needs
// --dry-run, checks a given version commit instead of the open PR's branch.
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY (owner/repo).
import {
  CONTEXT,
  RELEASE_BRANCH,
  mirroredStatus,
  releaseBase,
  syncStatus
} from '../packages/core/scripts/release-ci-status.mjs'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const headIndex = args.indexOf('--head')
const headOverride = headIndex === -1 ? undefined : args[headIndex + 1]

const repo = process.env.GITHUB_REPOSITORY
const token = process.env.GITHUB_TOKEN
const api = process.env.GITHUB_API_URL ?? 'https://api.github.com'
const server = process.env.GITHUB_SERVER_URL ?? 'https://github.com'
if (!repo || !token) {
  throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required.')
}
if (headOverride && !dryRun) throw new Error('--head needs --dry-run.')

async function github(path, init = {}) {
  const response = await fetch(`${api}/repos/${repo}/${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28'
    }
  })
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status}`)
  }
  return response.json()
}

async function openReleasePr() {
  const owner = repo.split('/')[0]
  const pulls = await github(
    `pulls?state=open&base=main&head=${owner}:${RELEASE_BRANCH}`
  )
  return pulls[0]
}

if (!headOverride && !(await openReleasePr())) {
  console.log(`No open PR from ${RELEASE_BRANCH}; nothing to sync.`)
  process.exit(0)
}

const release = headOverride ?? RELEASE_BRANCH
const compared = releaseBase(await github(`compare/main...${release}`))
if (!compared) {
  console.log(
    `${release} isn't one verified version commit on main; leaving it alone.`
  )
  process.exit(0)
}

const { head, base } = compared

async function readStatus() {
  const { workflow_runs: runs } = await github(
    `actions/workflows/ci.yml/runs?head_sha=${base}&event=push&branch=main&per_page=1`
  )
  return {
    context: CONTEXT,
    ...mirroredStatus({
      run: runs[0],
      base,
      fallbackUrl: `${server}/${repo}/actions/workflows/ci.yml`
    })
  }
}

async function postStatus(status) {
  console.log(`${head} (on main ${base}): ${JSON.stringify(status)}`)
  if (dryRun) return
  await github(`statuses/${head}`, {
    method: 'POST',
    body: JSON.stringify(status)
  })
}

await syncStatus({ read: readStatus, post: postStatus })
