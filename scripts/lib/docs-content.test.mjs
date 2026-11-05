import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  EM_DASH_FILES,
  IMAGE_FILES,
  emDashFindings,
  externalImageFindings,
  trackedFiles
} from './docs-content.mjs'

const lines = (findings) => findings.map(({ line }) => line)

describe('emDashFindings', () => {
  test('flags each line with an em dash', () => {
    const source = 'Doors open at 7pm.\nDoors open — 7pm.\nRows 1-10'
    assert.deepEqual(lines(emDashFindings('a.md', source)), [2])
  })

  test('passes en dashes, hyphens, and the &mdash; entity', () => {
    const source = 'rows 1–10, early-bird, 7pm &mdash; 8pm'
    assert.deepEqual(emDashFindings('a.mdx', source), [])
  })

  test('covers changesets, contributing docs, and skills', () => {
    const files = trackedFiles(EM_DASH_FILES)
    for (const file of [
      'AGENTS.md',
      'docs/contributing/PR_WORKFLOW.md',
      'skills/review/SKILL.md'
    ])
      assert.ok(files.includes(file), file)
    assert.ok(!files.some((file) => file.endsWith('CHANGELOG.md')))
  })

  test('covers package READMEs and markdown in package source', () => {
    const files = trackedFiles(EM_DASH_FILES)
    for (const file of [
      'packages/widgets/README.md',
      'packages/core/src/fonts/README.md'
    ])
      assert.ok(files.includes(file), file)
  })
})

describe('externalImageFindings', () => {
  const check = (source) => lines(externalImageFindings('page.mdx', source))

  test('flags a third-party src in JSX, data, and markdown', () => {
    assert.deepEqual(check("<Image src='https://example.com/a.png' />"), [1])
    assert.deepEqual(check('<img src={"//cdn.example.com/a.png"} />'), [1])
    assert.deepEqual(check("{ src: 'https://images.example.com/a.jpg' }"), [1])
    assert.deepEqual(check('![Crowd](https://example.com/crowd.jpg)'), [1])
    assert.deepEqual(
      check("srcSet='/a.png 1x, https://example.com/a@2x.png 2x'"),
      [1]
    )
    assert.deepEqual(check("<img src='https://' />"), [1])
  })

  test('passes relative paths and the Oztix asset host', () => {
    assert.deepEqual(
      check(
        [
          "<Image src='/images/crowd.jpg' />",
          "<Image src='https://assets.oztix.com.au/image/a.png' />",
          '![Logo](./logo.svg)',
          "<Link href='https://example.com'>Example</Link>"
        ].join('\n')
      ),
      []
    )
  })

  test('skips test files, which hold external URLs as fixtures', () => {
    const files = trackedFiles(IMAGE_FILES)
    assert.ok(files.some((file) => file.endsWith('page.mdx')))
    assert.ok(!files.some((file) => /\.test\./.test(file)))
  })
})
