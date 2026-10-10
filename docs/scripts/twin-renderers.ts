import { cardSizeTable } from '../src/lib/card-sizes.ts'
import { markdownTable } from '../src/lib/llms.ts'

export type Renderer = (props: Record<string, string | true>) => string

/** Markdown for each docs component marked `rendered` in `twin-components.ts`, except those the script builds itself. */
export const DATA_RENDERERS: Record<string, Renderer> = {
  CardSizes: () => {
    const { head, rows } = cardSizeTable()
    return markdownTable(
      head,
      rows.map(({ size, spans, use }) => [
        `\`${size}\``,
        ...spans.map(String),
        use
      ])
    )
  }
}
