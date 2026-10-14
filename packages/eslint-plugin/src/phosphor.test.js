import { runRuleCases } from '../test/ruleCases.js'

runRuleCases({
  'phosphor-icon-suffix': {
    valid: [
      "import { HeartIcon, IconContext } from '@phosphor-icons/react'",
      "import type { Heart } from '@phosphor-icons/react'",
      "import { type Heart, HeartIcon } from '@phosphor-icons/react'",
      "import { Heart } from 'somewhere-else'"
    ],
    invalid: [
      "import { Heart } from '@phosphor-icons/react'",
      "import { Heart as HeartIcon } from '@phosphor-icons/react/ssr'"
    ]
  },
  'phosphor-icon-size-prop': {
    valid: [
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon className='size-4' />",
      "import { StarIcon } from '@phosphor-icons/react'; <svg><StarIcon size='100%' /></svg>",
      '<Avatar size="sm" />'
    ],
    invalid: [
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon size={16} />",
      {
        code: '<HeartIcon size={16} />',
        settings: { roadie: { phosphorIcons: ['HeartIcon'] } }
      }
    ]
  }
})
