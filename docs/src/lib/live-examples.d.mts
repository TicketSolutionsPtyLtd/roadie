type CodeNode = {
  type: 'code'
  value: string
  lang?: string | null
  meta?: string | null
  data?: Record<string, unknown>
}

export declare const LIVE_LANGUAGE: RegExp

export type LiveExample = {
  id: string
  /** Slug of the nearest heading above, as `rehype-slug` writes it. */
  anchor: string | undefined
  heading: string | undefined
  language: string
  code: string
  eager: boolean
  /** Classes the preview lays the example out with, from `layout=`, `gap=`, and `width=`. */
  previewLayout: string | undefined
  node: CodeNode
}

export declare function parseExampleMeta(meta: string | null | undefined): {
  id: string | undefined
  eager: boolean
  previewLayout: string | undefined
}

export declare function collectLiveExamples(tree: object): LiveExample[]

export declare function pageSlugOf(path: string | undefined): string | undefined

export declare function exampleHref(page: string, id: string): string

export default function remarkLiveExamples(): (
  tree: object,
  file: { path?: string }
) => void
