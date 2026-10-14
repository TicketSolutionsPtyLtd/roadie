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
  },
  'phosphor-icon-weight': {
    valid: [
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight='bold' />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight='fill' />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={selected ? 'fill' : 'bold'} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={iconWeight} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon {...iconProps} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <Navigator.Item icon={<HeartIcon />} />"
    ],
    invalid: [
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight='regular' />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={'regular'} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={`thin`} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={selected ? 'fill' : 'regular'} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={iconWeight ?? 'thin'} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon />",
      "import { HeartIcon } from '@phosphor-icons/react'; <Navigator.MenuItem icon={<HeartIcon />} />"
    ]
  }
})
