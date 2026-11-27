import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  MAX_BYTES,
  markdown,
  parseArgs,
  planUpload,
  upload
} from './pr-screenshots.mjs'

describe('parseArgs', () => {
  const ok = [
    ['no repo', ['5', 'a.png'], { pr: '5', paths: ['a.png'] }],
    [
      'a repo first',
      ['--repo', 'acme/roadie', '5', 'a.png'],
      { repo: 'acme/roadie', pr: '5', paths: ['a.png'] }
    ],
    [
      'a repo after the images',
      ['5', 'a.png', '--repo=acme/roadie.js'],
      { repo: 'acme/roadie.js', pr: '5', paths: ['a.png'] }
    ]
  ]
  for (const [name, argv, expected] of ok) {
    test(`reads ${name}`, () => {
      assert.deepEqual(parseArgs(argv), expected)
    })
  }

  for (const argv of [
    ['--repo'],
    ['--repo', 'roadie', '5'],
    ['--repo=a/b/c', '5'],
    ['--repo', '../..', '5'],
    ['--repo', 'acme/.', '5']
  ]) {
    test(`refuses ${argv.join(' ')}`, () => {
      assert.throws(() => parseArgs(argv), /owner\/name/)
    })
  }
})

describe('planUpload', () => {
  const ok = [
    ['1099', 'shots/Phone Light.PNG', 'pr-1099/phone-light.png'],
    ['7', 'desktop-dark.webp', 'pr-7/desktop-dark.webp'],
    ['3', '!!!.gif', 'pr-3/screenshot.gif']
  ]
  for (const [pr, path, target] of ok) {
    test(`${path} goes to ${target}`, () => {
      assert.equal(planUpload(pr, [{ path, bytes: 1 }])[0].target, target)
    })
  }

  const bad = [
    ['no PR', undefined, [{ path: 'a.png', bytes: 1 }], /PR number/],
    ['a branch for a PR', 'fix/x', [{ path: 'a.png', bytes: 1 }], /PR number/],
    ['no files', '5', [], /at least one/],
    ['not an image', '5', [{ path: 'notes.md', bytes: 1 }], /isn't an image/],
    ['too big', '5', [{ path: 'a.png', bytes: MAX_BYTES + 1 }], /over 10 MB/],
    ['one name twice', '5', [{ path: 'a/s.png' }, { path: 'b/S.png' }], /both/]
  ]
  for (const [name, pr, files, message] of bad) {
    test(`refuses ${name}`, () => {
      assert.throws(() => planUpload(pr, files), message)
    })
  }
})

test('markdown embeds each image from the branch', () => {
  assert.equal(
    markdown('o/r', planUpload('9', [{ path: 'phone-dark.png', bytes: 1 }])),
    '![phone-dark](https://github.com/o/r/blob/screenshots/pr-9/phone-dark.png?raw=true)'
  )
})

// An in-memory GitHub with just the git data endpoints upload uses.
// `race()` makes the next ref write find the branch moved by another upload.
function fakeGitHub() {
  let raceOnce = false
  const objects = new Map()
  let head = null
  let n = 0
  const calls = []
  const make = (value) => {
    const sha = `sha${++n}`
    objects.set(sha, value)
    return { sha }
  }
  const fail = (status) =>
    Object.assign(new Error(`HTTP ${status}`), { status })
  async function api(method, path, body) {
    calls.push(`${method} ${path.replace('repos/o/r/git/', '')}`)
    const route = path.replace('repos/o/r/git/', '')
    if (method === 'POST' && route === 'blobs') return make(body)
    if (method === 'GET' && route === 'ref/heads/screenshots') {
      if (!head) throw fail(404)
      return { object: { sha: head } }
    }
    if (method === 'GET' && route.startsWith('commits/')) {
      return { tree: { sha: objects.get(route.slice(8)).tree } }
    }
    if (method === 'POST' && route === 'trees') {
      const files = { ...(body.base_tree && objects.get(body.base_tree)) }
      for (const entry of body.tree) files[entry.path] = entry.sha
      return make(files)
    }
    if (method === 'POST' && route === 'commits') return make(body)
    if (raceOnce && method !== 'GET') {
      raceOnce = false
      const tree = make({ 'pr-1/other.png': 'x' }).sha
      head = make({ tree, parents: head ? [head] : [] }).sha
    }
    if (method === 'POST' && route === 'refs') {
      if (head) throw fail(422)
      head = body.sha
      return {}
    }
    if (method === 'PATCH' && route === 'refs/heads/screenshots') {
      if (objects.get(body.sha).parents[0] !== head) throw fail(422)
      head = body.sha
      return {}
    }
    throw new Error(`unexpected ${method} ${path}`)
  }
  const files = () => objects.get(objects.get(head).tree)
  const commit = () => objects.get(head)
  const race = () => {
    raceOnce = true
  }
  return { api, calls, files, commit, race, head: () => head }
}

const shot = (target) => ({ target, content: 'aGk=' })

describe('upload', () => {
  test('creates the branch as an orphan when it does not exist', async () => {
    const gh = fakeGitHub()
    const sha = await upload({
      api: gh.api,
      repo: 'o/r',
      pr: '4',
      files: [shot('pr-4/a.png')]
    })
    assert.equal(sha, gh.head())
    assert.deepEqual(gh.commit().parents, [])
    assert.equal(gh.commit().message, 'Screenshots for #4')
    assert.deepEqual(Object.keys(gh.files()), ['pr-4/a.png'])
  })

  test('adds to the branch and keeps what is there', async () => {
    const gh = fakeGitHub()
    await upload({
      api: gh.api,
      repo: 'o/r',
      pr: '4',
      files: [shot('pr-4/a.png')]
    })
    const first = gh.head()
    await upload({
      api: gh.api,
      repo: 'o/r',
      pr: '5',
      files: [shot('pr-5/a.png'), shot('pr-5/b.png')]
    })
    assert.deepEqual(gh.commit().parents, [first])
    assert.deepEqual(Object.keys(gh.files()).sort(), [
      'pr-4/a.png',
      'pr-5/a.png',
      'pr-5/b.png'
    ])
  })

  for (const [name, existing] of [
    ['moved', true],
    ['created', false]
  ]) {
    test(`retries on top when another upload ${name} the branch first`, async () => {
      const gh = fakeGitHub()
      if (existing) {
        await upload({
          api: gh.api,
          repo: 'o/r',
          pr: '2',
          files: [shot('pr-2/a.png')]
        })
      }
      gh.race()
      gh.calls.length = 0
      await upload({
        api: gh.api,
        repo: 'o/r',
        pr: '3',
        files: [shot('pr-3/a.png')]
      })
      assert.ok(Object.keys(gh.files()).includes('pr-1/other.png'))
      assert.ok(Object.keys(gh.files()).includes('pr-3/a.png'))
      assert.equal(gh.calls.filter((call) => call === 'POST blobs').length, 1)
      assert.equal(gh.calls.filter((call) => call === 'POST commits').length, 2)
    })
  }

  // [call that fails, its status, how many ref writes upload makes]
  for (const [failing, status, writes] of [
    ['GET ref/heads/screenshots', 500, 0],
    ['PATCH refs/heads/screenshots', 403, 1],
    ['PATCH refs/heads/screenshots', 422, 5]
  ]) {
    test(`stops after ${writes} ref writes on ${status} from ${failing}`, async () => {
      const gh = fakeGitHub()
      await upload({
        api: gh.api,
        repo: 'o/r',
        pr: '1',
        files: [shot('pr-1/a.png')]
      })
      const api = async (method, path, body) => {
        if (`${method} ${path.replace('repos/o/r/git/', '')}` === failing) {
          gh.calls.push(failing)
          throw Object.assign(new Error(`HTTP ${status}`), { status })
        }
        return gh.api(method, path, body)
      }
      gh.calls.length = 0
      await assert.rejects(
        upload({ api, repo: 'o/r', pr: '2', files: [shot('pr-2/a.png')] }),
        new RegExp(String(status))
      )
      assert.equal(gh.calls.filter((call) => /refs/.test(call)).length, writes)
    })
  }
})
