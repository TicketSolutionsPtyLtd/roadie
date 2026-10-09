import type { ReactNode } from 'react'

function DiagramBox({
  name,
  caption,
  className,
  children
}: {
  name: string
  caption: string
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      data-slot='model-part'
      className={`grid content-start gap-2 rounded-xl border border-normal p-3 ${className ?? ''}`}
    >
      <p className='grid gap-0.5'>
        <span className='font-mono text-xs text-strong'>{name}</span>
        <span className='text-xs text-subtle'>{caption}</span>
      </p>
      {children}
    </div>
  )
}

function Chips({ labels }: { labels: string[] }) {
  return (
    <ul className='flex flex-wrap gap-1'>
      {labels.map((label) => (
        <li
          key={label}
          className='rounded-full emphasis-subtle px-2 py-0.5 text-xs'
        >
          {label}
        </li>
      ))}
    </ul>
  )
}

/** Navigator's four parts, nested as an app renders them, with one pane per URL level. */
export function ModelDiagram() {
  return (
    <figure
      data-not-prose
      data-slot='navigation-model'
      className='@container grid gap-3'
    >
      <DiagramBox
        name='Navigator'
        caption='The app frame. You give it the current route.'
        className='bg-sunken'
      >
        <div className='grid gap-3 @xl:grid-cols-[minmax(0,15rem)_1fr]'>
          <DiagramBox
            name='Navigator.Primary'
            caption='The top-level destinations'
            className='bg-raised'
          >
            <Chips labels={['Tickets', 'Orders', 'Settings']} />
            <DiagramBox
              name='Navigator.Secondary'
              caption='The pages inside one destination'
            >
              <Chips labels={['Profile', 'Payment']} />
            </DiagramBox>
          </DiagramBox>
          <div className='grid grid-cols-3 gap-2'>
            {['Tickets', 'An event', 'A ticket'].map((label) => (
              <DiagramBox
                key={label}
                name='Pane'
                caption={label}
                className='min-h-24 bg-raised'
              />
            ))}
          </div>
        </div>
      </DiagramBox>
      <figcaption className='text-sm text-subtle'>
        Navigator holds the destinations and the panes. Each URL level adds one
        pane beside the last.
      </figcaption>
    </figure>
  )
}
