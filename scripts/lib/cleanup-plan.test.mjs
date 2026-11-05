import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { parseWorktrees, planBranches } from './cleanup-plan.mjs'

describe('parseWorktrees', () => {
  test('reads branch, lock and prunable from porcelain output', () => {
    const porcelain = [
      'worktree /repo',
      'HEAD aaa',
      'branch refs/heads/main',
      '',
      'worktree /repo/.claude/worktrees/x',
      'HEAD bbb',
      'branch refs/heads/claude/x',
      'locked claude agent agent-1 (pid 42)',
      '',
      'worktree /repo-gone',
      'HEAD ccc',
      'detached',
      'prunable gitdir file points to non-existent location',
      '',
      ''
    ].join('\n')

    assert.deepEqual(parseWorktrees(porcelain), [
      {
        path: '/repo',
        head: 'aaa',
        branch: 'main',
        locked: false,
        prunable: false
      },
      {
        path: '/repo/.claude/worktrees/x',
        head: 'bbb',
        branch: 'claude/x',
        locked: true,
        prunable: false
      },
      {
        path: '/repo-gone',
        head: 'ccc',
        branch: null,
        locked: false,
        prunable: true
      }
    ])
  })
})

const merged = [
  { headRefName: 'claude/done', headRefOid: 'm1' },
  { headRefName: 'claude/redone', headRefOid: 'm2' }
]
const ancestry = new Set(['done-tip>m1', 'redone-tip>m2'])
const isAncestor = (commit, of) =>
  commit === of || ancestry.has(`${commit}>${of}`)

function plan(branches, options = {}) {
  return planBranches({
    branches,
    checkedOut: new Set(),
    merged,
    isAncestor,
    hasCommit: () => true,
    ...options
  })
}

describe('planBranches', () => {
  test('removes a branch whose tip its merged PR contains', () => {
    const { remove } = plan([{ name: 'claude/done', tip: 'done-tip' }])
    assert.deepEqual(remove, ['claude/done'])
  })

  test('keeps a branch with commits its merged PR lacks', () => {
    const { remove, kept } = plan([{ name: 'claude/done', tip: 'later' }])
    assert.deepEqual(remove, [])
    assert.deepEqual(kept, [
      { name: 'claude/done', reason: 'commits its merged PR lacks' }
    ])
  })

  test('says when it cannot tell because the PR head is not fetched', () => {
    const { remove, kept } = plan([{ name: 'claude/done', tip: 'done-tip' }], {
      isAncestor: () => false,
      hasCommit: (commit) => commit !== 'm1'
    })
    assert.deepEqual(remove, [])
    assert.deepEqual(kept, [
      { name: 'claude/done', reason: 'a merged PR head not fetched' }
    ])
  })

  test('only counts a merged PR from the same branch', () => {
    const { remove, kept } = plan([{ name: 'claude/redone', tip: 'done-tip' }])
    assert.deepEqual(remove, [])
    assert.deepEqual(kept, [
      { name: 'claude/redone', reason: 'commits its merged PR lacks' }
    ])
  })

  test('keeps a branch with no merged PR', () => {
    const { kept } = plan([{ name: 'review/123', tip: 'x' }])
    assert.deepEqual(kept, [{ name: 'review/123', reason: 'no merged PR' }])
  })

  test('keeps a branch a worktree has checked out', () => {
    const { remove, kept } = plan([{ name: 'claude/done', tip: 'done-tip' }], {
      checkedOut: new Set(['claude/done'])
    })
    assert.deepEqual(remove, [])
    assert.deepEqual(kept, [{ name: 'claude/done', reason: 'checked out' }])
  })

  test('never touches main', () => {
    const { remove, kept } = plan([{ name: 'main', tip: 'm1' }])
    assert.deepEqual(remove, [])
    assert.deepEqual(kept, [])
  })

  test('matches any of a branch name reused across merged PRs', () => {
    const reused = [...merged, { headRefName: 'claude/done', headRefOid: 'm3' }]
    const { remove } = plan([{ name: 'claude/done', tip: 'm3' }], {
      merged: reused
    })
    assert.deepEqual(remove, ['claude/done'])
  })

  test('limits the plan to one branch when asked', () => {
    const { remove, kept } = plan(
      [
        { name: 'claude/done', tip: 'done-tip' },
        { name: 'claude/redone', tip: 'redone-tip' }
      ],
      { only: 'claude/redone' }
    )
    assert.deepEqual(remove, ['claude/redone'])
    assert.deepEqual(kept, [])
  })

  test('limits the plan to a branch prefix when asked', () => {
    const { remove } = plan(
      [
        { name: 'claude/done', tip: 'done-tip' },
        { name: 'p1/done', tip: 'done-tip' }
      ],
      { prefix: 'p1/' }
    )
    assert.deepEqual(remove, [])
  })
})
