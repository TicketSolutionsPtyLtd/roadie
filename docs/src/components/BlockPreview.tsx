import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { catalogue } from '@oztix/roadie-marketing-blocks/catalogue'

import { Skel } from './ComponentSkeleton'

const THUMBNAILS = join(
  process.cwd(),
  'node_modules/@oztix/roadie-marketing-blocks/src/thumbnails'
)

/** A block page's art: its first preset's thumbnail, the same wireframe the Studio's block picker shows. */
export function BlockPreview({ name }: { name: string }) {
  const block = catalogue.find((entry) => entry.name === name)
  const preset = block?.presets[0]
  if (!preset) return name === 'blocks' ? <BlocksArt /> : null
  // Inlined, not an <img>, so the wireframe's colour variables follow the docs theme.
  const svg = readFileSync(join(THUMBNAILS, preset.thumbnail), 'utf8')
  return (
    <div
      aria-hidden
      className='w-56 [&_svg]:h-auto [&_svg]:w-full'
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

/** A page of stacked blocks, for the Blocks section as a whole. */
export function BlocksArt() {
  return (
    <div className='grid w-48 gap-1.5'>
      <div className='grid h-12 content-center justify-items-center gap-1.5 rounded-lg bg-subtle'>
        <Skel className='h-2 w-24' />
        <Skel className='h-1.5 w-16' />
      </div>
      <div className='grid grid-cols-3 gap-1.5'>
        <Skel className='h-8 rounded-md' />
        <Skel className='h-8 rounded-md' />
        <Skel className='h-8 rounded-md' />
      </div>
      <div className='grid h-6 content-center justify-items-center rounded-lg bg-subtle'>
        <Skel className='h-2 w-20' />
      </div>
    </div>
  )
}
