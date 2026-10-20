// The Version Packages commit carries [skip ci], so its PR never runs CI.
// The release branch is one version commit on top of a main commit, so the
// PR's required "CI result" mirrors main's CI run for that commit.
// docs/solutions/best-practices/release-pr-mirrors-main-ci.md has the why.

export const CONTEXT = 'CI result'
export const RELEASE_BRANCH = 'changeset-release/main'
const RELEASE_BOT = 'github-actions[bot]'

/**
 * The release head and the main commit it's built on, from GitHub's compare
 * of main...<release head>. Null unless the branch is exactly one verified
 * commit by the Actions bot on top of main: anything else wasn't made by
 * changesets/action, so main's CI says nothing about it.
 */
export function releaseBase(compare) {
  if (compare.ahead_by !== 1 || compare.commits?.length !== 1) return null
  const [head] = compare.commits
  const base = compare.merge_base_commit.sha
  if (head.parents.length !== 1 || head.parents[0].sha !== base) return null
  if (head.author?.login !== RELEASE_BOT) return null
  if (head.commit?.verification?.verified !== true) return null
  return { head: head.sha, base }
}

/**
 * The commit status that mirrors main's CI run (a workflow run, or undefined
 * when none has started). Only a run that concluded success passes.
 */
export function mirroredStatus({ run, base, fallbackUrl }) {
  const at = `Mirrors main's CI at ${base.slice(0, 7)}`
  if (!run) {
    return {
      state: 'pending',
      description: `${at}: not started`,
      target_url: fallbackUrl
    }
  }
  const target_url = run.html_url
  if (run.status !== 'completed') {
    return { state: 'pending', description: `${at}: running`, target_url }
  }
  if (run.conclusion === 'success') {
    return { state: 'success', description: `${at}: passed`, target_url }
  }
  return {
    state: 'failure',
    description: `${at}: ${run.conclusion ?? 'no conclusion'}`,
    target_url
  }
}

/**
 * Posts the status `read` returns. Syncs run unserialised, so a pending one
 * can land after a sync that posted CI's result; reading again after posting
 * catches that. If CI is still running then, its completion starts a later
 * sync, which posts after this one.
 */
export async function syncStatus({ read, post }) {
  const status = await read()
  await post(status)
  if (status.state !== 'pending') return status
  const settled = await read()
  if (settled.state !== 'pending') await post(settled)
  return settled
}
