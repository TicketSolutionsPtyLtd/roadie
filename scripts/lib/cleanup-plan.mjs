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

export function planBranches({
  branches,
  checkedOut,
  merged,
  isAncestor,
  hasCommit,
  only,
  prefix
}) {
  const remove = []
  const kept = []
  for (const { name, tip } of branches) {
    if (name === 'main') continue
    if (only && name !== only) continue
    if (prefix && !name.startsWith(prefix)) continue
    const prs = merged.filter((pr) => pr.headRefName === name)
    const reason = checkedOut.has(name)
      ? 'checked out'
      : !prs.length
        ? 'no merged PR'
        : mergedHead(name, tip, merged, isAncestor)
          ? null
          : prs.some((pr) => !hasCommit(pr.headRefOid))
            ? 'a merged PR head not fetched'
            : 'commits its merged PR lacks'
    if (reason) kept.push({ name, reason })
    else remove.push(name)
  }
  return { remove, kept }
}
