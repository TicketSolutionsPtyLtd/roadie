import { describe, expect, it } from 'vitest'

import {
  mirroredStatus,
  releaseBase,
  syncStatus
} from './release-ci-status.mjs'

const base = '0b234a4911b0201c8987390e033ff3ae9fccb308'
const head = 'c7a7cc00358d46d2a561a8fce9a56006655aa89a'
const fallbackUrl = 'https://github.com/o/r/actions/workflows/ci.yml'
const runUrl = 'https://github.com/o/r/actions/runs/1'

describe('mirroredStatus', () => {
  it.each([
    ['in_progress', null, 'pending', 'running'],
    ['queued', null, 'pending', 'running'],
    ['waiting', null, 'pending', 'running'],
    ['completed', 'success', 'success', 'passed'],
    ['completed', 'failure', 'failure', 'failure'],
    ['completed', 'cancelled', 'failure', 'cancelled'],
    ['completed', 'timed_out', 'failure', 'timed_out'],
    ['completed', 'skipped', 'failure', 'skipped'],
    ['completed', 'startup_failure', 'failure', 'startup_failure'],
    ['completed', null, 'failure', 'no conclusion']
  ])('maps a %s run concluding %s to %s', (status, conclusion, state, word) => {
    expect(
      mirroredStatus({
        run: { status, conclusion, html_url: runUrl },
        base,
        fallbackUrl
      })
    ).toEqual({
      state,
      description: `Mirrors main's CI at 0b234a4: ${word}`,
      target_url: runUrl
    })
  })

  it('is pending, linking the CI workflow, when main has no run yet', () => {
    expect(mirroredStatus({ run: undefined, base, fallbackUrl })).toEqual({
      state: 'pending',
      description: "Mirrors main's CI at 0b234a4: not started",
      target_url: fallbackUrl
    })
  })
})

describe('releaseBase', () => {
  const versionCommit = {
    sha: head,
    parents: [{ sha: base }],
    author: { login: 'github-actions[bot]' },
    commit: { verification: { verified: true } }
  }

  it('returns the version commit and the main commit it sits on', () => {
    expect(
      releaseBase({
        ahead_by: 1,
        merge_base_commit: { sha: base },
        commits: [versionCommit]
      })
    ).toEqual({ head, base })
  })

  it('skips a branch with commits pushed on top of the version commit', () => {
    expect(
      releaseBase({
        ahead_by: 2,
        merge_base_commit: { sha: base },
        commits: [versionCommit, { sha: 'f00', parents: [{ sha: head }] }]
      })
    ).toBeNull()
  })

  it('skips a branch level with main', () => {
    expect(
      releaseBase({
        ahead_by: 0,
        merge_base_commit: { sha: base },
        commits: []
      })
    ).toBeNull()
  })

  it('skips a merge commit', () => {
    expect(
      releaseBase({
        ahead_by: 1,
        merge_base_commit: { sha: base },
        commits: [
          { ...versionCommit, parents: [{ sha: base }, { sha: 'f00' }] }
        ]
      })
    ).toBeNull()
  })

  it('skips a single commit someone else pushed in its place', () => {
    expect(
      releaseBase({
        ahead_by: 1,
        merge_base_commit: { sha: base },
        commits: [{ ...versionCommit, author: { login: 'someone' } }]
      })
    ).toBeNull()
  })

  it('skips an unverified commit claiming to be the bot', () => {
    expect(
      releaseBase({
        ahead_by: 1,
        merge_base_commit: { sha: base },
        commits: [
          { ...versionCommit, commit: { verification: { verified: false } } }
        ]
      })
    ).toBeNull()
  })
})

describe('syncStatus', () => {
  const pending = { state: 'pending' }
  const success = { state: 'success' }

  async function sync(reads: { state: string }[]) {
    const posted: { state: string }[] = []
    await syncStatus({
      read: async () => reads.shift(),
      post: async (status: { state: string }) => {
        posted.push(status)
      }
    })
    return posted
  }

  it('posts a finished result once', async () => {
    expect(await sync([success, pending])).toEqual([success])
  })

  it('posts the result when CI finished after the first read', async () => {
    expect(await sync([pending, success])).toEqual([pending, success])
  })

  it('posts pending once while CI is still running', async () => {
    expect(await sync([pending, pending])).toEqual([pending])
  })
})
