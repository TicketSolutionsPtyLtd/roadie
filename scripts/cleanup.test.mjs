import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const scripts = dirname(fileURLToPath(import.meta.url))
const roots = []
after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

// The script finds its repo from its own path, so each fixture gets a copy,
// plus a gh that reports the fixture's merged PRs and a pnpm that does nothing.
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'roadie-cleanup-')))
  roots.push(root)
  const repo = join(root, 'repo')
  mkdirSync(join(repo, 'scripts', 'lib'), { recursive: true })
  for (const file of ['cleanup.mjs', 'lib/cleanup-plan.mjs', 'lib/machine.mjs'])
    cpSync(join(scripts, file), join(repo, 'scripts', file))
  writeFileSync(join(repo, '.gitignore'), 'node_modules\n')

  const bin = join(root, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'gh'), '#!/bin/sh\nprintf "%s" "$FAKE_GH_PRS"\n')
  writeFileSync(join(bin, 'pnpm'), '#!/bin/sh\nexit 0\n')
  chmodSync(join(bin, 'gh'), 0o755)
  chmodSync(join(bin, 'pnpm'), 0o755)

  const git = (cwd, ...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'config', 'user.email', 'test@example.com')
  git(repo, 'config', 'user.name', 'Test')
  git(repo, 'config', 'commit.gpgsign', 'false')
  git(repo, 'config', 'core.hooksPath', join(root, 'no-hooks'))
  git(repo, 'add', '-A')
  git(repo, 'commit', '-qm', 'init')

  const prs = []
  return {
    worktree(branch) {
      const path = join(root, branch.replaceAll('/', '-'))
      git(repo, 'worktree', 'add', '-q', '-b', branch, path)
      writeFileSync(join(path, `${branch.replaceAll('/', '-')}.txt`), branch)
      git(path, 'add', '-A')
      git(path, 'commit', '-qm', branch)
      return path
    },
    commit(path, file) {
      writeFileSync(join(path, file), file)
      git(path, 'add', '-A')
      git(path, 'commit', '-qm', file)
    },
    // A clean worktree that `git worktree remove` still refuses.
    addSubmodule(path) {
      git(
        path,
        '-c',
        'protocol.file.allow=always',
        'submodule',
        'add',
        '-q',
        repo,
        'sub'
      )
      git(path, 'commit', '-qm', 'sub')
    },
    lock(path, pid) {
      git(
        repo,
        'worktree',
        'lock',
        '--reason',
        `claude session x (pid ${pid})`,
        path
      )
    },
    merge(branch, headRefOid = git(repo, 'rev-parse', branch)) {
      prs.push({ headRefName: branch, headRefOid })
    },
    cleanup(args, env = {}) {
      const result = spawnSync(
        process.execPath,
        ['scripts/cleanup.mjs', ...args],
        {
          cwd: repo,
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH}`,
            FAKE_GH_PRS: JSON.stringify(prs),
            ROADIE_BRANCH_PREFIX: '',
            ...env
          }
        }
      )
      return { ...result, output: result.stdout + result.stderr }
    },
    branches: () =>
      git(repo, 'branch', '--format=%(refname:short)').split('\n'),
    worktreeList: () => git(repo, 'worktree', 'list', '--porcelain')
  }
}

describe('pnpm cleanup', { skip: process.platform === 'win32' }, () => {
  test('removes a merged, clean worktree and its branch', () => {
    const f = fixture()
    const path = f.worktree('claude/done')
    f.merge('claude/done')

    const { status, output } = f.cleanup([
      '--delete',
      '--branch',
      'claude/done'
    ])

    assert.equal(status, 0, output)
    assert.equal(existsSync(path), false)
    assert.deepEqual(f.branches(), ['main'])
  })

  test('removes a merged worktree whose locking session has exited', () => {
    const f = fixture()
    const path = f.worktree('claude/ended')
    f.merge('claude/ended')
    f.lock(path, spawnSync('true').pid)

    const { status, output } = f.cleanup([
      '--delete',
      '--branch',
      'claude/ended'
    ])

    assert.equal(status, 0, output)
    assert.equal(existsSync(path), false)
    assert.deepEqual(f.branches(), ['main'])
  })

  test('keeps a merged worktree while its locking session runs', () => {
    const f = fixture()
    const path = f.worktree('claude/live')
    f.merge('claude/live')
    f.lock(path, process.pid)

    const { status, output } = f.cleanup([
      '--delete',
      '--branch',
      'claude/live'
    ])

    assert.equal(status, 0, output)
    assert.match(output, /claude-live \(locked\)/)
    assert.deepEqual(f.branches(), ['claude/live', 'main'])
  })

  test('locks a worktree again when git refuses to remove it', () => {
    const f = fixture()
    const path = f.worktree('claude/stuck')
    f.addSubmodule(path)
    f.merge('claude/stuck')
    const pid = spawnSync('true').pid
    f.lock(path, pid)

    const { status, output } = f.cleanup([
      '--delete',
      '--branch',
      'claude/stuck'
    ])

    assert.notEqual(status, 0, output)
    assert.equal(existsSync(path), true)
    assert.match(
      f.worktreeList(),
      new RegExp(`locked claude session x \\(pid ${pid}\\)`)
    )
  })

  test('keeps a worktree locked by a process it may not signal', () => {
    const f = fixture()
    const path = f.worktree('claude/root')
    f.merge('claude/root')
    f.lock(path, 1)

    const { status, output } = f.cleanup([
      '--delete',
      '--branch',
      'claude/root'
    ])

    assert.equal(status, 0, output)
    assert.match(output, /claude-root \(locked\)/)
    assert.equal(existsSync(path), true)
  })

  test('keeps a worktree with uncommitted work, and its branch', () => {
    const f = fixture()
    const path = f.worktree('claude/dirty')
    f.merge('claude/dirty')
    writeFileSync(join(path, 'notes.txt'), 'unsaved')

    const { status, output } = f.cleanup([
      '--delete',
      '--branch',
      'claude/dirty'
    ])

    assert.equal(status, 0, output)
    assert.match(output, /uncommitted changes/)
    assert.equal(existsSync(join(path, 'notes.txt')), true)
    assert.deepEqual(f.branches(), ['claude/dirty', 'main'])
  })

  test('keeps a branch with a commit its merged PR lacks', () => {
    const f = fixture()
    const path = f.worktree('claude/later')
    f.merge('claude/later')
    f.commit(path, 'later.txt')
    rmSync(path, { recursive: true })

    const { status, output } = f.cleanup([
      '--delete',
      '--branch',
      'claude/later'
    ])

    assert.equal(status, 0, output)
    assert.match(output, /with commits its merged PR lacks\n.*claude\/later/)
    assert.deepEqual(f.branches(), ['claude/later', 'main'])
  })

  test('keeps a branch whose merged PR head was never fetched', () => {
    const f = fixture()
    const path = f.worktree('claude/updated')
    f.merge('claude/updated', 'f'.repeat(40))
    rmSync(path, { recursive: true })

    const { status, output } = f.cleanup([
      '--delete',
      '--branch',
      'claude/updated'
    ])

    assert.equal(status, 0, output)
    assert.match(output, /with a merged PR head not fetched\n.*claude\/updated/)
    assert.deepEqual(f.branches(), ['claude/updated', 'main'])
  })

  test('with --branch, removes a merged branch whose worktree folder is gone', () => {
    const f = fixture()
    const path = f.worktree('claude/gone')
    f.merge('claude/gone')
    rmSync(path, { recursive: true })

    const { status, output } = f.cleanup([
      '--delete',
      '--branch',
      'claude/gone'
    ])

    assert.equal(status, 0, output)
    assert.deepEqual(f.branches(), ['main'])
    assert.doesNotMatch(f.worktreeList(), /claude\/gone/)
  })

  test('leaves gone worktree entries outside the branch prefix', () => {
    const f = fixture()
    const mine = f.worktree('p1/gone')
    const theirs = f.worktree('p2/gone')
    rmSync(mine, { recursive: true })
    rmSync(theirs, { recursive: true })

    const { status, output } = f.cleanup(['--delete'], {
      ROADIE_BRANCH_PREFIX: 'p1/'
    })

    assert.equal(status, 0, output)
    assert.doesNotMatch(f.worktreeList(), /p1\/gone/)
    assert.match(f.worktreeList(), /p2\/gone/)
  })

  test('takes --branch=<name> as well as --branch <name>', () => {
    const f = fixture()
    const one = f.worktree('claude/one')
    const other = f.worktree('claude/other')
    f.merge('claude/one')
    f.merge('claude/other')

    const { status, output } = f.cleanup(['--delete', '--branch=claude/one'])

    assert.equal(status, 0, output)
    assert.equal(existsSync(one), false)
    assert.equal(existsSync(other), true)
  })

  test('a dry run with --branch names the command that deletes it', () => {
    const f = fixture()
    f.worktree('claude/done')
    f.merge('claude/done')

    const { status, output } = f.cleanup(['--branch', 'claude/done'])

    assert.equal(status, 0, output)
    assert.match(output, /pnpm cleanup --delete --branch claude\/done/)
    assert.deepEqual(f.branches(), ['claude/done', 'main'])
  })

  test('takes the flags after a leading --, as pnpm passes them', () => {
    const f = fixture()
    const path = f.worktree('claude/done')
    f.merge('claude/done')

    const { status, output } = f.cleanup([
      '--',
      '--delete',
      '--branch',
      'claude/done'
    ])

    assert.equal(status, 0, output)
    assert.equal(existsSync(path), false)
  })

  test('refuses an unknown flag and deletes nothing', () => {
    const f = fixture()
    const path = f.worktree('claude/done')
    f.merge('claude/done')

    const { status } = f.cleanup(['--delete', '--brnach', 'claude/done'])

    assert.notEqual(status, 0)
    assert.equal(existsSync(path), true)
    assert.deepEqual(f.branches(), ['claude/done', 'main'])
  })
})
