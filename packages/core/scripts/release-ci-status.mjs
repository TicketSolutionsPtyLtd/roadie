// The Version Packages commit carries [skip ci], so its PR never runs CI.
// The release branch is one version commit on top of a main commit, so the
// PR's required "CI result" mirrors main's CI run for that commit.
// docs/solutions/best-practices/release-pr-mirrors-main-ci.md has the why.

export const CONTEXT = 'CI result'
export const RELEASE_BRANCH = 'changeset-release/main'

/**
 * The release head and the main commit it's built on, from GitHub's compare
 * of main...<release head>. Null when the branch holds anything beyond the
 * one version commit, since a pushed commit runs CI and reports for itself.
 */
export function releaseBase(compare) {
  if (compare.ahead_by !== 1 || compare.commits?.length !== 1) return null
  const [head] = compare.commits
  const base = compare.merge_base_commit.sha
  if (head.parents.length !== 1 || head.parents[0].sha !== base) return null
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
