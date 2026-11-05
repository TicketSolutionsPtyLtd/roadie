import type { ImportedEmail } from '../schema'

type Losses = Pick<ImportedEmail, 'dropped' | 'restyled' | 'unknownMergeTags'>

const counted = (count: number, one: string, many: string) =>
  count === 0 ? [] : [count === 1 ? `1 ${one}` : `${count} ${many}`]

/** What an import loses, a line each, from the most to the least noticed. */
export function importLosses({
  dropped,
  restyled,
  unknownMergeTags
}: Losses): string[] {
  const count = (...kinds: string[]) =>
    dropped.filter(({ kind }) => kinds.includes(kind)).length
  const tags = [
    ...new Set(
      dropped.flatMap(({ kind, tag }) =>
        kind === 'element' && tag ? [tag] : []
      )
    )
  ]
  const merged = unknownMergeTags.join(', ')
  return [
    ...counted(
      count('image'),
      'image that isn’t on https',
      'images that aren’t on https'
    ),
    ...counted(count('embed', 'media'), 'video or embed', 'videos or embeds'),
    ...counted(count('link'), 'link on an image', 'links on images'),
    ...(tags.length > 0
      ? [
          `The look of ${new Intl.ListFormat('en-AU').format(tags)}, keeping ${tags.length === 1 ? 'its' : 'their'} text`
        ]
      : []),
    ...counted(
      unknownMergeTags.length,
      `merge tag this editor doesn’t know, kept as text: ${merged}`,
      `merge tags this editor doesn’t know, kept as text: ${merged}`
    ),
    ...counted(
      restyled.tables,
      'table’s layout, keeping its text',
      'tables’ layouts, keeping their text'
    ),
    ...counted(
      restyled.styles,
      'style, such as a font or colour',
      'styles, such as fonts and colours'
    ),
    ...counted(
      count('hidden'),
      'piece of hidden text, such as a preheader',
      'pieces of hidden text, such as a preheader'
    )
  ]
}
