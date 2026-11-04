import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { runStep } from './pre-push-run.mjs'

const outlasting = (ms) => ['node', '-e', `setTimeout(() => {}, ${ms})`]

describe('runStep', () => {
  test('stops a step that passes its budget', async () => {
    const started = Date.now()
    const { outcome } = await runStep({
      commands: [outlasting(10_000)],
      budgetS: 0.1
    })
    assert.equal(outcome, 'unfinished')
    assert.ok(Date.now() - started < 5_000, 'stopped, not waited out')
  })

  test('lets a step with no budget finish', async () => {
    const { outcome } = await runStep({
      commands: [outlasting(300)],
      budgetS: null
    })
    assert.equal(outcome, 'passed')
  })

  test('reports a failing command with its output', async () => {
    const failing = ['node', '-e', 'console.error("broken"); process.exit(2)']
    const { outcome, failure } = await runStep({
      commands: [failing],
      budgetS: 10
    })
    assert.equal(outcome, 'failed')
    assert.deepEqual(failure.command, failing)
    assert.match(failure.output, /broken/)
  })
})
