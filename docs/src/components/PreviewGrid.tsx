import type { ReactNode } from 'react'

import { Card } from '@oztix/roadie-components/card'

/** Card-scale art frame; previews are authored at roughly `w-40` and scaled to fit. */
export function PreviewThumbnail({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className='@container grid aspect-4/3 place-content-center overflow-hidden bg-subtle'
    >
      <span className='pointer-events-none grid scale-[0.8] place-items-center @[11rem]:scale-90 @[13rem]:scale-100'>
        {children}
      </span>
    </span>
  )
}

/** A linked preview tile; render inside a `PreviewSection` or another `<ul>`. */
export function PreviewCard({
  href,
  title,
  subtitle,
  children
}: {
  href: string
  title: string
  subtitle?: ReactNode
  children: ReactNode
}) {
  return (
    <li className='grid'>
      <Card href={href} className='overflow-hidden no-underline'>
        <PreviewThumbnail>{children}</PreviewThumbnail>
        <div className='grid gap-0.5 px-3 py-2.5'>
          <h3 className='text-display-ui-6 text-strong'>{title}</h3>
          {subtitle ? <p className='text-sm text-subtle'>{subtitle}</p> : null}
        </div>
      </Card>
    </li>
  )
}

/** A titled grid of `PreviewCard`s; needs an `@container` ancestor. */
export function PreviewSection({
  title,
  action,
  children
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  const headingId = title.toLowerCase().replace(/\W+/g, '-')
  return (
    <section aria-labelledby={headingId} className='grid gap-4'>
      <div className='flex items-center justify-between gap-4'>
        <h2 id={headingId} className='text-display-ui-4 text-strong'>
          {title}
        </h2>
        {action}
      </div>
      <ul className='grid grid-cols-2 gap-3 @md:grid-cols-3 @2xl:grid-cols-4 @2xl:gap-4'>
        {children}
      </ul>
    </section>
  )
}
