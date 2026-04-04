import Link from 'next/link'

import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

import { Card } from '@oztix/roadie-components'

type ComponentMetadata = {
  name: string
  title: string
  description: string
  status: string
  category: string
}

type CategorizedComponents = {
  [key: string]: ComponentMetadata[]
}

export async function generateStaticParams() {
  return []
}

export default async function ComponentsPage() {
  const componentsDir = join(process.cwd(), 'src/app/components')
  const entries = await readdir(componentsDir, { withFileTypes: true })

  const components = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (dir) => {
        try {
          const mdxPath = join(componentsDir, dir.name, 'page.mdx')
          const content = await readFile(mdxPath, 'utf-8')

          const metadataMatch = content.match(
            /export const metadata = ({[\s\S]*?})/m
          )
          let metadata = {
            title: dir.name,
            description: '',
            status: 'unknown',
            category: 'Other'
          }

          if (metadataMatch) {
            try {
              const parseMetadata = new Function(`return ${metadataMatch[1]}`)
              const evalMetadata = parseMetadata()
              metadata = { ...metadata, ...evalMetadata }
            } catch (e) {
              console.error(`Error parsing metadata for ${dir.name}:`, e)
            }
          }

          return { name: dir.name, ...metadata }
        } catch (e) {
          console.error(`Error processing ${dir.name}:`, e)
          return {
            name: dir.name,
            title: dir.name,
            description: '',
            status: 'unknown',
            category: 'Other'
          }
        }
      })
  )

  const categorizedComponents = components.reduce((acc, component) => {
    const category = component.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(component)
    return acc
  }, {} as CategorizedComponents)

  const categoryOrder = ['Actions', 'Inputs', 'Content', 'Text', 'Layout']

  const sortedCategories = Object.entries(categorizedComponents).sort(
    ([a], [b]) => {
      const aIndex = categoryOrder.indexOf(a)
      const bIndex = categoryOrder.indexOf(b)
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
    }
  )

  return (
    <div className='grid gap-12'>
      <div className='grid gap-4'>
        <h1 className='text-display-prose-1 text-strong'>Components</h1>
        <p className='text-lg text-subtle'>
          Accessible React components built on Base UI, styled with intent and
          emphasis.
        </p>
      </div>

      {sortedCategories.map(([category, components]) => (
        <div key={category} className='grid gap-4'>
          <h2 className='text-display-ui-3 text-strong'>{category}</h2>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3'>
            {components.map((component) => (
              <Card
                key={component.name}
                as={Link}
                href={`/components/${component.name}`}
                className='is-interactive grid grid-rows-[auto_1fr] overflow-hidden no-underline'
              >
                <div className='grid aspect-[4/3] place-content-center bg-subtle px-6'>
                  <ComponentSkeleton name={component.name} />
                </div>
                <div className='grid content-start gap-1 px-5 py-5'>
                  <h3 className='text-display-ui-5 text-strong'>
                    {component.title}
                  </h3>
                  <p className='text-sm text-subtle'>{component.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Skel({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={`rounded-sm bg-subtler ${className ?? ''}`} {...props} />
  )
}

function ComponentSkeleton({ name }: { name: string }) {
  switch (name) {
    case 'button':
      return (
        <div className='flex gap-2'>
          <div className='h-7 w-20 emphasis-strong rounded-full intent-accent' />
          <div className='h-7 w-20 emphasis-normal rounded-full' />
        </div>
      )
    case 'icon-button':
      return (
        <div className='flex gap-2'>
          <div className='grid size-8 emphasis-normal place-content-center rounded-full'>
            <Skel className='size-3.5 rounded-full' />
          </div>
          <div className='grid size-8 emphasis-normal place-content-center rounded-full'>
            <Skel className='size-3.5 rounded-full' />
          </div>
        </div>
      )
    case 'card':
      return (
        <div className='grid w-40 gap-2 rounded-lg border border-subtle bg-normal p-3'>
          <Skel className='h-2 w-16' />
          <Skel className='h-2 w-full' />
          <Skel className='h-2 w-24' />
        </div>
      )
    case 'badge':
      return (
        <div className='flex gap-2'>
          <div className='h-5 w-12 emphasis-strong rounded-full intent-accent' />
          <div className='h-5 w-12 emphasis-strong rounded-full intent-success' />
          <div className='h-5 w-12 emphasis-strong rounded-full intent-warning' />
        </div>
      )
    case 'accordion':
      return (
        <div className='grid w-44 gap-1'>
          <div className='flex items-center justify-between rounded-md bg-normal px-3 py-2'>
            <Skel className='h-2 w-16' />
            <Skel className='size-2' />
          </div>
          <div className='rounded-md border border-subtle bg-normal px-3 py-2'>
            <Skel className='mb-1.5 h-2 w-20' />
            <Skel className='h-1.5 w-full' />
            <Skel className='mt-1 h-1.5 w-24' />
          </div>
          <div className='flex items-center justify-between rounded-md bg-normal px-3 py-2'>
            <Skel className='h-2 w-20' />
            <Skel className='size-2' />
          </div>
        </div>
      )
    case 'input':
      return (
        <div className='w-40 rounded-lg border border-subtle bg-normal px-3 py-2'>
          <Skel className='h-2 w-16 opacity-50' />
        </div>
      )
    case 'textarea':
      return (
        <div className='grid w-40 gap-1.5 rounded-lg border border-subtle bg-normal px-3 py-2'>
          <Skel className='h-2 w-24' />
          <Skel className='h-2 w-16' />
          <Skel className='h-2 w-10 opacity-50' />
        </div>
      )
    case 'select':
      return (
        <div className='flex w-40 items-center justify-between rounded-lg border border-subtle bg-normal px-3 py-2'>
          <Skel className='h-2 w-16' />
          <Skel className='size-2' />
        </div>
      )
    case 'field':
      return (
        <div className='grid w-40 gap-1.5'>
          <Skel className='h-2 w-12' />
          <div className='rounded-lg border border-subtle bg-normal px-3 py-2'>
            <Skel className='h-2 w-20 opacity-50' />
          </div>
          <Skel className='h-1.5 w-24 opacity-50' />
        </div>
      )
    case 'fieldset':
      return (
        <div className='grid w-44 gap-2 rounded-lg border border-subtle p-3'>
          <Skel className='h-2 w-16' />
          <div className='grid gap-1.5'>
            <div className='rounded-md border border-subtle bg-normal px-2 py-1.5'>
              <Skel className='h-1.5 w-20 opacity-50' />
            </div>
            <div className='rounded-md border border-subtle bg-normal px-2 py-1.5'>
              <Skel className='h-1.5 w-16 opacity-50' />
            </div>
          </div>
        </div>
      )
    case 'radio-group':
      return (
        <div className='grid gap-2'>
          <div className='flex items-center gap-2'>
            <div className='size-3.5 emphasis-strong rounded-full intent-accent' />
            <Skel className='h-2 w-14' />
          </div>
          <div className='flex items-center gap-2'>
            <div className='size-3.5 rounded-full border-2 border-subtle' />
            <Skel className='h-2 w-16' />
          </div>
          <div className='flex items-center gap-2'>
            <div className='size-3.5 rounded-full border-2 border-subtle' />
            <Skel className='h-2 w-12' />
          </div>
        </div>
      )
    case 'code':
      return (
        <div className='rounded-md emphasis-subtle px-2 py-0.5 font-mono text-xs'>
          console.log()
        </div>
      )
    case 'mark':
      return (
        <div className='flex gap-1 text-sm'>
          <span className='text-subtle'>Some</span>
          <span className='rounded-sm emphasis-subtle px-0.5 intent-accent'>
            highlighted
          </span>
          <span className='text-subtle'>text</span>
        </div>
      )
    case 'highlight':
      return (
        <div className='flex gap-1 text-sm'>
          <span className='text-subtle'>Search:</span>
          <span className='rounded-sm emphasis-subtle px-0.5 font-semibold intent-warning'>
            result
          </span>
        </div>
      )
    case 'prose':
      return (
        <div className='grid w-40 gap-1.5'>
          <Skel className='h-3 w-24' />
          <Skel className='h-1.5 w-full' />
          <Skel className='h-1.5 w-32' />
          <Skel className='h-1.5 w-28' />
        </div>
      )
    case 'breadcrumb':
      return (
        <div className='flex items-center gap-1.5 text-xs'>
          <Skel className='h-2 w-10' />
          <span className='text-subtler'>/</span>
          <Skel className='h-2 w-12' />
          <span className='text-subtler'>/</span>
          <Skel className='h-2 w-14' />
        </div>
      )
    case 'separator':
      return (
        <div className='grid w-40 gap-2'>
          <Skel className='h-2 w-20' />
          <div className='h-px bg-subtle' />
          <Skel className='h-2 w-24' />
        </div>
      )
    case 'spot-illustration':
      return (
        <div className='flex gap-3'>
          <div className='grid size-10 place-content-center rounded-lg bg-normal'>
            <Skel className='size-6 rounded-md' />
          </div>
          <div className='grid size-10 place-content-center rounded-lg bg-normal'>
            <Skel className='size-6 rounded-full' />
          </div>
          <div className='grid size-10 place-content-center rounded-lg bg-normal'>
            <Skel className='size-6 rounded-md' />
          </div>
        </div>
      )
    default:
      return (
        <div className='grid w-40 gap-1.5'>
          <Skel className='h-2 w-20' />
          <Skel className='h-2 w-full' />
          <Skel className='h-2 w-16' />
        </div>
      )
  }
}
