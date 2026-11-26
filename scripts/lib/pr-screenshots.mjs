// Puts a PR's screenshots on the repo's `screenshots` branch through GitHub's
// git data API, so no local branch, checkout, or git hook is involved.
// Each PR gets a folder (`pr-<number>/`), and every upload is one commit
// that fast-forwards the branch, retried when another upload lands first.
import { basename, extname } from 'node:path'

export const BRANCH = 'screenshots'
export const MAX_BYTES = 10 * 1024 * 1024
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp'])
const ATTEMPTS = 5

// `--repo owner/name` names the repo where `gh repo view` can't, such as a
// checkout with several remotes and no default.
export function parseArgs(argv) {
  const rest = []
  let repo
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--repo') repo = argv[++i] ?? ''
    else if (arg.startsWith('--repo=')) repo = arg.slice('--repo='.length)
    else rest.push(arg)
  }
  if (repo !== undefined && !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new Error(`--repo takes owner/name, not "${repo}".`)
  }
  const [pr, ...paths] = rest
  return { ...(repo && { repo }), pr, paths }
}

// Checks the command line and returns where each file goes on the branch,
// or throws with a message the script prints as is.
export function planUpload(pr, files) {
  if (!/^[1-9]\d*$/.test(String(pr ?? ''))) {
    throw new Error(`The first argument is the PR number, not "${pr ?? ''}".`)
  }
  if (!files.length) throw new Error('Name at least one image to upload.')
  const seen = new Map()
  return files.map(({ path, bytes }) => {
    const ext = extname(path).toLowerCase()
    if (!IMAGE_EXTENSIONS.has(ext)) {
      throw new Error(
        `${path} isn't an image GitHub shows inline (png, jpg, gif or webp).`
      )
    }
    if (bytes > MAX_BYTES) {
      throw new Error(`${path} is over 10 MB; resize or compress it first.`)
    }
    const name = basename(path, extname(path))
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const target = `pr-${pr}/${name || 'screenshot'}${ext}`
    if (seen.has(target)) {
      throw new Error(
        `${seen.get(target)} and ${path} both upload as ${target}.`
      )
    }
    seen.set(target, path)
    return { path, target, alt: name || 'screenshot' }
  })
}

// The markdown to paste under Evidence: one image per line, each embedded
// from the branch so a retake under the same name replaces it in the PR.
export function markdown(repo, uploads) {
  return uploads
    .map(
      ({ target, alt }) =>
        `![${alt}](https://github.com/${repo}/blob/${BRANCH}/${target}?raw=true)`
    )
    .join('\n')
}

// `api(method, path, body)` resolves to the parsed response or rejects with
// an error carrying `status`. `files` are `{ target, content }`, content in
// base64. Resolves to the commit the branch now points at.
export async function upload({ api, repo, pr, files }) {
  const base = `repos/${repo}/git`
  const blobs = []
  for (const { target, content } of files) {
    const { sha } = await api('POST', `${base}/blobs`, {
      content,
      encoding: 'base64'
    })
    blobs.push({ path: target, mode: '100644', type: 'blob', sha })
  }
  for (let attempt = 1; ; attempt++) {
    const head = await api('GET', `${base}/ref/heads/${BRANCH}`).catch(
      (error) => {
        if (error.status === 404) return null
        throw error
      }
    )
    const parent = head?.object.sha
    const baseTree = parent
      ? (await api('GET', `${base}/commits/${parent}`)).tree.sha
      : undefined
    const tree = await api('POST', `${base}/trees`, {
      ...(baseTree && { base_tree: baseTree }),
      tree: blobs
    })
    const commit = await api('POST', `${base}/commits`, {
      message: `Screenshots for #${pr}`,
      tree: tree.sha,
      parents: parent ? [parent] : []
    })
    try {
      if (parent) {
        await api('PATCH', `${base}/refs/heads/${BRANCH}`, {
          sha: commit.sha,
          force: false
        })
      } else {
        await api('POST', `${base}/refs`, {
          ref: `refs/heads/${BRANCH}`,
          sha: commit.sha
        })
      }
      return commit.sha
    } catch (error) {
      // 422: another upload moved the branch (or created it) first.
      if (error.status !== 422 || attempt === ATTEMPTS) throw error
    }
  }
}
