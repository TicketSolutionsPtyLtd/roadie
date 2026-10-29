// mjml ships no types; this covers the one call renderEmail makes.
declare module 'mjml' {
  type MjmlNode = {
    tagName: string
    attributes: Record<string, string>
    children?: MjmlNode[]
    content?: string
  }
  export default function mjml2html(
    input: MjmlNode,
    options?: {
      validationLevel?: 'strict' | 'soft' | 'skip'
      fonts?: Record<string, string>
      keepComments?: boolean
    }
  ): Promise<{ html: string; errors: unknown[] }>
}
