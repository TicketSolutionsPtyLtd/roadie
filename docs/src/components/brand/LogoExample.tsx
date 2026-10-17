import type { CSSProperties, ReactNode } from 'react'

import { Logo } from '@oztix/roadie-components/logo'
import { Pattern } from '@oztix/roadie-components/pattern'

// The misuses recolour and reorder the logo, which the Logo component can't,
// so they draw those parts themselves.
const PURPLE = { color: 'var(--color-brand-purple-9)' }
const SHADOW = { filter: 'drop-shadow(0 6px 8px var(--color-neutral-12))' }
// Fixed backgrounds the light logo is drawn for, the same in both themes.
const DARK = { backgroundColor: 'var(--color-neutral-light-12)' }
const BLUE = { backgroundColor: 'var(--color-brand-blue-light-9)' }

function Tagline() {
  return (
    <span className='text-xs leading-none font-semibold whitespace-nowrap text-normal'>
      Built on Partnerships
    </span>
  )
}

function Divider() {
  return (
    <span
      aria-hidden
      className='block h-5 w-0 shrink-0 border-s border-normal'
    />
  )
}

/** A logo example's backdrop: the page surface, or a fixed one passed as `style`. */
function Surface({
  children,
  style,
  label
}: {
  children: ReactNode
  style?: CSSProperties
  label: string
}) {
  return (
    <div
      role='img'
      aria-label={label}
      className='grid min-h-32 w-full place-items-center overflow-hidden rounded-lg border border-subtler bg-normal p-6'
      style={style}
    >
      {children}
    </div>
  )
}

const EXAMPLES = {
  clearSpace: {
    do: () => (
      <Surface label='The logo inside a dashed boundary, with clear space the height of the x in oztix on every side'>
        <span className='grid justify-items-center gap-3'>
          {/* At 48px, the x in oztix is 30px tall, so the boundary sits 30px out. */}
          <span
            className='grid border border-dashed p-7.5'
            style={{ borderColor: 'var(--color-brand-blue-9)' }}
          >
            <Logo size='xl' aria-hidden />
          </span>
          <span className='text-xs text-normal'>
            Clear space, the height of the x
          </span>
        </span>
      </Surface>
    ),
    dont: () => (
      <Surface label='Text crowding the logo inside its clear space'>
        <span className='flex items-center gap-1'>
          <Logo size='lg' aria-hidden />
          <span className='text-display-prose-5 text-strong'>
            Contact sales
          </span>
        </span>
      </Surface>
    )
  },
  colour: {
    do: () => (
      <Surface label='The logo in Spotlight blue'>
        <Logo variant='tagline' size='sm' aria-hidden />
      </Surface>
    ),
    dont: () => (
      <Surface label='The logo recoloured purple'>
        <span className='flex items-center gap-3'>
          <Logo size='sm' style={PURPLE} aria-hidden />
          <Divider />
          <Tagline />
        </span>
      </Surface>
    )
  },
  effects: {
    do: () => (
      <Surface label='The logo flat, with no effects'>
        <Logo variant='tagline' size='sm' aria-hidden />
      </Surface>
    ),
    dont: () => (
      <Surface label='The logo with a heavy drop shadow'>
        <span style={SHADOW}>
          <Logo variant='tagline' size='sm' aria-hidden />
        </span>
      </Surface>
    )
  },
  background: {
    do: () => (
      <Surface label='The light logo on the black strip' style={DARK}>
        <Logo variant='tagline' tone='light' size='sm' aria-hidden />
      </Surface>
    ),
    dont: () => (
      <div className='grid w-full overflow-hidden rounded-lg border border-subtler'>
        <Pattern crop='banner' className='col-start-1 row-start-1 h-32' />
        <div
          role='img'
          aria-label='The logo lost over the busy pattern'
          className='relative col-start-1 row-start-1 grid place-items-center'
        >
          <Logo variant='tagline' tone='light' size='sm' aria-hidden />
        </div>
      </div>
    )
  },
  stretch: {
    do: () => (
      <Surface label='The logo at its own proportions'>
        <Logo size='lg' aria-hidden />
      </Surface>
    ),
    dont: () => (
      <Surface label='The logo squashed horizontally'>
        <span className='scale-x-60'>
          <Logo size='lg' aria-hidden />
        </span>
      </Surface>
    )
  },
  rotate: {
    do: () => (
      <Surface label='The logo level'>
        <Logo size='lg' aria-hidden />
      </Surface>
    ),
    dont: () => (
      <Surface label='The logo tilted'>
        <span className='-rotate-12'>
          <Logo size='lg' aria-hidden />
        </span>
      </Surface>
    )
  },
  rearrange: {
    do: () => (
      <Surface label='The logo, then the divider, then the tagline'>
        <Logo variant='tagline' size='sm' aria-hidden />
      </Surface>
    ),
    dont: () => (
      <Surface label='The tagline placed before the logo'>
        <span className='flex items-center gap-3'>
          <Tagline />
          <Divider />
          <Logo size='sm' aria-hidden />
        </span>
      </Surface>
    )
  },
  wordmark: {
    do: () => (
      <Surface label='The full logo, with the logomark'>
        <Logo size='lg' aria-hidden />
      </Surface>
    ),
    dont: () => (
      <Surface label='The oztix wordmark on its own'>
        <Logo variant='wordmark' size='lg' aria-hidden />
      </Surface>
    )
  },
  logomark: {
    do: () => (
      <Surface label='The logomark as an app icon'>
        <span
          className='grid size-20 place-items-center rounded-2xl'
          style={BLUE}
        >
          <Logo variant='mark' size='xl' tone='light' aria-hidden />
        </span>
      </Surface>
    ),
    dont: () => (
      <Surface label='The logomark alone as the logo on a poster'>
        <span className='grid justify-items-start gap-2'>
          <Logo variant='mark' size='md' aria-hidden />
          <span className='text-display-prose-5 text-strong'>
            Explore an Oztix partnership
          </span>
        </span>
      </Surface>
    )
  }
}

/** A correct or incorrect use of the logo, drawn live from Roadie's `Logo`. */
export function LogoExample({
  kind,
  version
}: {
  kind: keyof typeof EXAMPLES
  version: 'do' | 'dont'
}) {
  return EXAMPLES[kind][version]()
}
