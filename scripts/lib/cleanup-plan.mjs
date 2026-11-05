export function parseWorktrees(porcelain) {
  return porcelain
    .trim()
    .split('\n\n')
    .map((block) => {
      const fields = Object.fromEntries(
        block.split('\n').map((line) => {
          const [key, ...rest] = line.split(' ')
          return [key, rest.join(' ') || true]
        })
      )
      return {
        path: fields.worktree,
        head: fields.HEAD,
        branch:
          typeof fields.branch === 'string'
            ? fields.branch.replace('refs/heads/', '')
            : null,
        locked: Boolean(fields.locked),
        lockReason: typeof fields.locked === 'string' ? fields.locked : null,
        lockPid: lockPid(fields.locked),
        prunable: Boolean(fields.prunable)
      }
    })
}

// Claude Code locks a session's or agent's worktree with a reason like
// "claude session x (pid 73022 start …)" and never unlocks it on exit.
function lockPid(reason) {
  const match = typeof reason === 'string' && reason.match(/\(pid (\d+)\b/)
  return match ? Number(match[1]) : null
}

// The checks run before the slow cache pass, so a session can resume into a
// stale-locked worktree and lock it again before removal reaches it.
export function changedSinceCheck(checked, current) {
  const now = current.find((tree) => tree.path === checked.path)
  if (!now) return 'gone since the check'
  if (now.lockReason === checked.lockReason) return null
  return now.locked
    ? 'locked again since the check'
    : 'lock changed since the check'
}

export function isStaleLock(tree, isRunning) {
  return tree.locked && tree.lockPid !== null && !isRunning(tree.lockPid)
}

// Squash merges leave a branch's commits off main, so a branch counts as
// merged when a merged PR's head contains its tip, not when main does.
export function mergedHead(branch, tip, merged, isAncestor) {
  return merged.find(
    (pr) => pr.headRefName === branch && isAncestor(tip, pr.headRefOid)
  )
}

function branchKeepReason(
  { name, tip },
  { checkedOut, merged, isAncestor, hasCommit }
) {
  if (checkedOut.has(name)) return 'checked out'
  const prs = merged.filter((pr) => pr.headRefName === name)
  if (!prs.length) return 'no merged PR'
  if (mergedHead(name, tip, merged, isAncestor)) return null
  if (prs.some((pr) => !hasCommit(pr.headRefOid)))
    return 'a merged PR head not fetched'
  return 'commits its merged PR lacks'
}

export function planBranches({ branches, only, prefix, ...context }) {
  const remove = []
  const kept = []
  for (const branch of branches) {
    const { name } = branch
    if (name === 'main') continue
    if (only && name !== only) continue
    if (prefix && !name.startsWith(prefix)) continue
    const reason = branchKeepReason(branch, context)
    if (reason) kept.push({ name, reason })
    else remove.push(name)
  }
  return { remove, kept }
}
