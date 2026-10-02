// Plain ESM so the MDX loader can import it as a remark plugin without a build step.
import GithubSlugger from 'github-slugger'
import { toString } from 'mdast-util-to-string'
import { visit } from 'unist-util-visit'

export const LIVE_LANGUAGE = /^(?:tsx|jsx)-live/

const ID = /^[a-z0-9][a-z0-9-]*$/

export function parseExampleMeta(meta) {
  const words = (meta ?? '').split(/\s+/).filter(Boolean)
  const idWord = words.find((word) => word.startsWith('id='))
  const id = idWord?.slice(3)
  if (id !== undefined && !ID.test(id)) {
    throw new Error(`Live example id "${id}" must be lowercase kebab-case`)
  }
  return { id, eager: words.includes('eager') }
}

const isLiveFence = (node) =>
  node.type === 'code' && LIVE_LANGUAGE.test(node.lang ?? '')

export function collectLiveExamples(tree) {
  // Explicit ids first, so a generated id never takes one declared further down.
  const used = new Set()
  visit(tree, (node) => {
    if (!isLiveFence(node)) return
    const { id } = parseExampleMeta(node.meta)
    if (id === undefined) return
    if (used.has(id)) {
      throw new Error(`Live example id "${id}" is used twice on one page`)
    }
    used.add(id)
  })

  const slugger = new GithubSlugger()
  const examples = []
  let anchor
  let heading

  visit(tree, (node) => {
    if (node.type === 'heading') {
      heading = toString(node)
      anchor = slugger.slug(heading)
      return
    }
    if (!isLiveFence(node)) return

    const meta = parseExampleMeta(node.meta)
    let id = meta.id
    if (id === undefined) {
      const base = anchor ?? 'example'
      id = base
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`
      used.add(id)
    }
    examples.push({
      id,
      anchor,
      heading,
      language: node.lang,
      code: node.value,
      eager: meta.eager,
      node
    })
  })

  return examples
}

/** `components/number-field` for `…/src/app/components/number-field/page.mdx`; undefined for anything that isn't a page. */
export function pageSlugOf(path) {
  const match = /[\\/]src[\\/]app[\\/](.+)[\\/]page\.mdx$/.exec(path ?? '')
  return match?.[1].split(/[\\/]/).join('/')
}

export const exampleHref = (page, id) => `/examples/${page}/${id}/`

/** Tags each live fence's `<code>` with its example id and page, read by `CodePreview`. */
export default function remarkLiveExamples() {
  return (tree, file) => {
    const page = pageSlugOf(file.path)
    for (const { id, eager, node } of collectLiveExamples(tree)) {
      node.data ??= {}
      node.data.hProperties = {
        ...node.data.hProperties,
        'data-example-id': id,
        ...(page && { 'data-example-page': page }),
        ...(eager && { 'data-example-eager': '' })
      }
    }
  }
}
