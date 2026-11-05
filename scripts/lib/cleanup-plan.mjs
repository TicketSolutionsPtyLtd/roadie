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
        prunable: Boolean(fields.prunable)
      }
    })
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
  only,
  prefix
}) {
  const remove = []
  const kept = []
  for (const { name, tip } of branches) {
    if (name === 'main') continue
    if (only && name !== only) continue
    if (prefix && !name.startsWith(prefix)) continue
    const hasMergedPr = merged.some((pr) => pr.headRefName === name)
    const reason = checkedOut.has(name)
      ? 'checked out'
      : !hasMergedPr
        ? 'no merged PR'
        : !mergedHead(name, tip, merged, isAncestor)
          ? 'commits after its PR merged'
          : null
    if (reason) kept.push({ name, reason })
    else remove.push(name)
  }
  return { remove, kept }
}
