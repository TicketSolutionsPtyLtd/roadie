import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, test } from 'node:test'

import { bundle, checkBudget, jsSubpaths, serialise } from './size-budget.mjs'

const sizes = (bytes) => ({ own: bytes, full: bytes, initial: bytes })

describe('jsSubpaths', () => {
  test('lists the JavaScript an import of each subpath loads', () => {
    const subpaths = jsSubpaths({
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
      './css': { style: './src/css/a.css', default: './src/css/a.css' },
      './badge': { types: './dist/Badge.d.ts', default: './dist/Badge.js' },
      './vue': './dist/vue.js',
      './roadie.manifest.json': './dist/roadie.manifest.json',
      './icons/*': { import: './dist/icons/*.js' }
    })
    assert.deepEqual(subpaths, [
      { subpath: '.', file: './dist/index.js' },
      { subpath: './badge', file: './dist/Badge.js' },
      { subpath: './vue', file: './dist/vue.js' }
    ])
  })
})

describe('bundle', () => {
  const root = mkdtempSync(join(tmpdir(), 'roadie-size-budget-'))
  after(() => rmSync(root, { recursive: true, force: true }))
  const write = (path, contents) => {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), contents)
  }
  const install = (name, exports, code) => {
    const manifest = { name, type: 'module', exports }
    write(`node_modules/${name}/package.json`, JSON.stringify(manifest))
    write(`node_modules/${name}/index.js`, code)
  }
  install('dep', './index.js', `export const dep = ['DEP_CODE']\n`)
  install(
    'react',
    { '.': './index.js', './jsx-runtime': './index.js' },
    `export const useState = ['REACT_CODE']\nexport const jsx = useState\n`
  )
  write('dist/shared.js', `export const shared = ['SHARED_CODE']\n`)
  write(
    'dist/lazy.js',
    `import { shared } from './shared.js'\nexport const lazy = ['LAZY_CODE', shared]\n`
  )
  write(
    'dist/index.js',
    [
      `import { useState } from 'react'`,
      `import { jsx } from 'react/jsx-runtime'`,
      // Not installed here, so bundling fails unless they are left to the app.
      `import 'react-dom/client'\nimport 'vue'\nimport 'mjml'`,
      `import { dep } from 'dep'`,
      `import { shared } from './shared.js'`,
      `export const own = ['OWN_CODE', dep, shared, useState, jsx]`,
      `export const load = () => import('./lazy.js')`
    ].join('\n')
  )
  const entry = join(root, 'dist/index.js')
  const has = (code) =>
    ['OWN_CODE', 'SHARED_CODE', 'DEP_CODE', 'LAZY_CODE', 'REACT_CODE']
      .filter((mark) => code.includes(mark))
      .join(' ')

  for (const [metric, expected] of [
    ['own', 'OWN_CODE SHARED_CODE LAZY_CODE'],
    ['full', 'OWN_CODE SHARED_CODE DEP_CODE LAZY_CODE'],
    ['initial', 'OWN_CODE SHARED_CODE DEP_CODE']
  ])
    test(`${metric} holds ${expected}`, async () => {
      assert.equal(has(await bundle(entry, metric)), expected)
    })

  write('dist/broken.js', `export { gone } from 'not-installed'\n`)
  const broken = join(root, 'dist/broken.js')

  for (const metric of ['full', 'initial'])
    test(`${metric} fails on a dependency that is not installed`, async () => {
      await assert.rejects(bundle(broken, metric), /not-installed/)
    })
})

describe('checkBudget', () => {
  const check = (budget, measured) =>
    checkBudget('@oztix/roadie-components', budget, measured)

  for (const [title, budget, measured, ok] of [
    ['a small subpath may grow 300 B', 1000, 1300, true],
    ['a small subpath fails at 301 B', 1000, 1301, false],
    ['a large subpath may grow 3%', 100_000, 103_000, true],
    ['a large subpath fails past 3%', 100_000, 103_001, false],
    ['a subpath may shrink', 100_000, 50_000, true]
  ])
    test(title, () => {
      const report = check(
        { './menu': { ...sizes(500), full: budget } },
        { './menu': { ...sizes(500), full: measured } }
      )
      assert.equal(report.ok, ok)
    })

  for (const [title, budget, measured, line] of [
    ['a new subpath', {}, { './new': sizes(500) }, /\.\/new +no budget in/],
    [
      'a budget missing a number',
      { './tabs': { own: 500 } },
      { './tabs': sizes(500) },
      /\.\/tabs +no budget in size-budget\.json/
    ],
    [
      'a budget for a subpath that is gone',
      { './gone': sizes(500) },
      {},
      /\.\/gone +no longer exported/
    ]
  ])
    test(`fails ${title}`, () => {
      const report = check(budget, measured)
      assert.equal(report.ok, false)
      assert.match(report.message, line)
    })

  test('says what grew, by how much, and the command that accepts it', () => {
    const { message } = check(
      { './menu': sizes(57_204) },
      { './menu': { ...sizes(57_204), full: 60_100 } }
    )
    assert.match(
      message,
      /menu +full +57,204 B to 60,100 B \(\+2,896 B, \+5\.1%\)/
    )
    assert.doesNotMatch(message, /menu +(own|initial)/)
    assert.match(message, /pnpm --filter @oztix\/roadie-components size:update/)
  })

  test('passes a subpath that shrank past the tolerance, and says so', () => {
    const report = check(
      { './menu': sizes(10_000), './tabs': sizes(10_000) },
      { './menu': sizes(9_700), './tabs': { ...sizes(10_000), own: 9_699 } }
    )
    assert.equal(report.ok, true)
    assert.match(
      report.message,
      /tabs +own +10,000 B to 9,699 B \(-301 B, -3\.0%\)/
    )
    assert.doesNotMatch(report.message, /menu|tabs +(full|initial)/)
    assert.match(report.message, /size:update/)
  })
})

describe('serialise', () => {
  test('writes one subpath a line, so a change is a one-line diff', () => {
    assert.equal(
      serialise({ '.': sizes(2000), './menu': sizes(500) }),
      [
        '{',
        '  ".": { "own": 2000, "full": 2000, "initial": 2000 },',
        '  "./menu": { "own": 500, "full": 500, "initial": 500 }',
        '}',
        ''
      ].join('\n')
    )
  })
})
