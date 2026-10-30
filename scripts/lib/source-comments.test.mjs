import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { trackedFiles } from './docs-content.mjs'
import {
  SOURCE_COMMENT_FILES,
  commentEmDashFindings
} from './source-comments.mjs'

const DASH = '—'
const lines = (file, source) =>
  commentEmDashFindings(file, source).map(({ line }) => line)

describe('commentEmDashFindings', () => {
  test('flags line, block, and JSDoc comments in TypeScript', () => {
    const source = [
      `// Line ${DASH} comment`,
      `/** Prop ${DASH} description */`,
      'const a = 1',
      `/* Block`,
      `   ${DASH} continued */`
    ].join('\n')
    assert.deepEqual(lines('a.ts', source), [1, 2, 5])
  })

  test('flags JSX comments but not JSX text, strings, or regexes', () => {
    const source = [
      `const a = '${DASH}'`,
      `const b = /[${DASH}]/`,
      `it('reads well ${DASH} always', () => {})`,
      `const c = <p>Text ${DASH} here</p>`,
      `const d = <div>{/* note ${DASH} here */}</div>`
    ].join('\n')
    assert.deepEqual(lines('a.tsx', source), [5])
  })

  test('flags CSS comments but not values', () => {
    const source = `/* Elevation ${DASH} shadows */\n.a { content: '${DASH}'; }`
    assert.deepEqual(lines('a.css', source), [1])
  })

  test('flags Vue template, script, and style comments only', () => {
    const source = [
      `<template><!-- slot ${DASH} here --><p>${DASH}</p></template>`,
      `<script setup lang="ts">`,
      `// Script ${DASH} comment`,
      `const a = '${DASH}'`,
      `</script>`,
      `<style>/* Style ${DASH} comment */</style>`
    ].join('\n')
    assert.deepEqual(lines('a.vue', source), [1, 3, 6])
  })

  test('reads package source, not package scripts', () => {
    const files = trackedFiles(SOURCE_COMMENT_FILES)
    for (const file of [
      'packages/components/src/components/Badge/index.tsx',
      'packages/core/src/css/roadie.css',
      'packages/lint-plugin/src/phosphor.js',
      'packages/widgets/src/cart-drawer/vue/CartDrawer.vue'
    ])
      assert.ok(files.includes(file), file)
    assert.ok(!files.some((file) => file.startsWith('packages/core/scripts/')))
  })
})
