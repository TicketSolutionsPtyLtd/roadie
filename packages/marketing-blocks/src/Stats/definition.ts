import type { BlockDefinition } from '../catalogue'

export const statsDefinition: BlockDefinition = {
  name: 'stats',
  title: 'Stats',
  description:
    'Key numbers as they were written, each with a spot illustration and a label.',
  presets: [
    {
      name: 'company-facts',
      title: 'Company facts',
      description:
        'A heading over a wrapping row of numbers, such as tickets sold and organisers served.',
      variant: 'typed-in'
    }
  ]
}
