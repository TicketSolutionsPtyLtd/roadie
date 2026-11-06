import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const scripts = dirname(fileURLToPath(import.meta.url))
const realDu = execFileSync('sh', ['-c', 'command -v du'], {
  encoding: 'utf8'
}).trim()
const roots = []

// The pre-push hook runs these tests with GIT_DIR and friends pointing at the
// repo being pushed. Left in, they sent the fixture's `git init` and
// `git config` to the real repo and made it bare. Read at call time so the
// decoy test below can prove it.
const gitFreeEnv = () =>
  Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))
  )
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
    execFileSync('git', ['-C', cwd, ...args], {
      cwd,
      encoding: 'utf8',
      env: gitFreeEnv()
    }).trim()
  git(repo, 'init', '-q', '-b', 'main')
  const gitDir = git(repo, 'rev-parse', '--absolute-git-dir')
  if (gitDir !== join(repo, '.git'))
    throw new Error(`Fixture git resolved to ${gitDir}, outside ${root}`)
  git(repo, 'config', 'user.email', 'test@example.com')
  git(repo, 'config', 'user.name', 'Test')
  git(repo, 'config', 'commit.gpgsign', 'false')
  git(repo, 'config', 'core.hooksPath', join(root, 'no-hooks'))
  git(repo, 'add', '-A')
  git(repo, 'commit', '-qm', 'init')

  const prs = []
  return {
    repo,
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
    // A du that runs `shell` while it sizes `sized`, to act in the gap
    // between cleanup's checks and its removals.
    whileSizing(sized, shell) {
      writeFileSync(
        join(bin, 'du'),
        `#!/bin/sh\nif [ "$2" = "${sized}" ]; then\n${shell}\nfi\nexec ${realDu} "$@"\n`
      )
      chmodSync(join(bin, 'du'), 0o755)
    },
    // Replaces the lock the way a session resuming into the worktree does.
    lockWhileSizing(sized, path, pid) {
      this.whileSizing(
        sized,
        `git -C "${repo}" worktree unlock "${path}"
git -C "${repo}" worktree lock --reason "claude session y (pid ${pid})" "${path}"`
      )
    },
    merge(branch, headRefOid = git(repo, 'rev-parse', branch)) {
      prs.push({ headRefName: branch, headRefOid })
    },
    cleanup(args, extraEnv = {}) {
      const base = gitFreeEnv()
      const result = spawnSync(
        process.execPath,
        ['scripts/cleanup.mjs', ...args],
        {
          cwd: repo,
          encoding: 'utf8',
          env: {
            ...base,
            PATH: `${bin}:${base.PATH}`,
            FAKE_GH_PRS: JSON.stringify(prs),
            ROADIE_BRANCH_PREFIX: '',
            ...extraEnv
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
  test('never touches the repo a hook points GIT_DIR at', () => {
    const decoyRoot = realpathSync(mkdtempSync(join(tmpdir(), 'roadie-decoy-')))
    roots.push(decoyRoot)
    execFileSync('git', ['init', '-q', decoyRoot], { env: gitFreeEnv() })
    const decoyConfig = join(decoyRoot, '.git', 'config')
    const before = readFileSync(decoyConfig, 'utf8')
    const saved = {
      GIT_DIR: process.env.GIT_DIR,
      GIT_WORK_TREE: process.env.GIT_WORK_TREE
    }
    process.env.GIT_DIR = join(decoyRoot, '.git')
    process.env.GIT_WORK_TREE = decoyRoot
    try {
      const f = fixture()
      f.worktree('claude/done')
      f.merge('claude/done')
      const { status, output } = f.cleanup([
        '--delete',
        '--branch',
        'claude/done'
      ])
      assert.equal(status, 0, output)
    } finally {
      for (const [key, value] of Object.entries(saved))
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
    }
    assert.equal(readFileSync(decoyConfig, 'utf8'), before)
  })

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

  test('keeps a worktree a session locks again during the cache pass', () => {
    const f = fixture()
    const path = f.worktree('claude/resumed')
    f.merge('claude/resumed')
    f.lock(path, spawnSync('true').pid)
    const cache = join(f.repo, 'docs', '.next')
    mkdirSync(cache, { recursive: true })
    f.lockWhileSizing(cache, path, process.pid)

    const { status, output } = f.cleanup(['--delete'])

    assert.equal(status, 0, output)
    assert.match(output, /claude-resumed \(locked since the check\)/)
    assert.match(
      f.worktreeList(),
      new RegExp(`locked claude session y \\(pid ${process.pid}\\)`)
    )
    assert.deepEqual(f.branches(), ['claude/resumed', 'main'])
  })

  test('keeps a worktree a session locks again while it is sized', () => {
    const f = fixture()
    const path = f.worktree('claude/resumed')
    f.merge('claude/resumed')
    f.lock(path, spawnSync('true').pid)
    f.lockWhileSizing(path, path, process.pid)

    const { status, output } = f.cleanup([
      '--delete',
      '--branch',
      'claude/resumed'
    ])

    assert.equal(status, 0, output)
    assert.equal(existsSync(path), true)
    assert.match(
      f.worktreeList(),
      new RegExp(`locked claude session y \\(pid ${process.pid}\\)`)
    )
  })

  test('finishes the run when a worktree folder is deleted while it is sized', () => {
    const f = fixture()
    const path = f.worktree('claude/vanished')
    f.merge('claude/vanished')
    f.whileSizing(path, `rm -rf "${path}"`)

    const { status, output } = f.cleanup([
      '--delete',
      '--branch',
      'claude/vanished'
    ])

    assert.equal(status, 0, output)
    assert.match(output, /\(folder gone since the check\)/)
  })

  test('keeps the branch a worktree switches to while it is sized', () => {
    const f = fixture()
    const path = f.worktree('claude/switched')
    f.merge('claude/switched')
    execFileSync('git', ['-C', f.repo, 'branch', 'claude/other'], {
      env: gitFreeEnv()
    })
    f.merge('claude/other')
    f.whileSizing(path, `git -C "${path}" switch -q claude/other`)

    const { status, output } = f.cleanup(['--delete'])

    assert.equal(status, 0, output)
    assert.match(output, /\(moved since the check\)/)
    assert.equal(existsSync(path), true)
    assert.deepEqual(f.branches(), ['claude/other', 'main'])
  })

  test('keeps a worktree a process starts in while it is sized', () => {
    const f = fixture()
    const path = f.worktree('claude/reopened')
    f.merge('claude/reopened')
    const pidFile = join(dirname(f.repo), 'started.pid')
    // Forked after the cd, so it is in the worktree before du returns.
    f.whileSizing(
      path,
      `cd "${path}"\nsleep 60 >/dev/null 2>&1 &\necho $! > "${pidFile}"`
    )

    try {
      const { status, output } = f.cleanup([
        '--delete',
        '--branch',
        'claude/reopened'
      ])

      assert.equal(status, 0, output)
      assert.match(output, /\(a process started in it since the check\)/)
      assert.equal(existsSync(path), true)
      assert.deepEqual(f.branches(), ['claude/reopened', 'main'])
    } finally {
      if (existsSync(pidFile))
        process.kill(Number(readFileSync(pidFile, 'utf8')))
    }
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
