import type { BlockDefinition } from '../catalogue'

export const richTextDefinition = {
  name: 'rich-text',
  title: 'Rich text',
  description: 'A title and rich text, from a short statement to an article.',
  presets: [
    {
      name: 'statement',
      title: 'Statement',
      description:
        'A centred illustration, title, and a few large balanced paragraphs.',
      variant: 'prose'
    },
    {
      name: 'long-form',
      title: 'Long form',
      description:
        'Rich text at a reading width with an optional title, such as an article, policy or FAQ answer page.',
      variant: 'prose'
    }
  ]
} as const satisfies BlockDefinition
