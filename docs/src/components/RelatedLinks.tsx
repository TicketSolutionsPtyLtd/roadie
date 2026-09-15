import { Fragment } from 'react'

import Link from 'next/link'

import { ArrowRightIcon } from '@phosphor-icons/react'

import type { DocLink } from '@/lib/token-families'

/** One line of cross-links, e.g. a token family's Foundations guidance. */
export function RelatedLinks({
  label,
  links,
  className
}: {
  label: string
  links: DocLink[]
  className?: string
}) {
  return (
    <p
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm ${className ?? ''}`}
    >
      <span className='font-semibold text-subtle'>{label}</span>
      {links.map((link, index) => (
        <Fragment key={link.href}>
          {index > 0 ? (
            <span aria-hidden className='text-subtler'>
              ·
            </span>
          ) : null}
          <Link
            href={link.href}
            className='inline-flex items-center gap-1 font-medium text-strong underline-offset-4 hover:underline'
          >
            {link.title}
            <ArrowRightIcon weight='bold' className='size-3' />
          </Link>
        </Fragment>
      ))}
    </p>
  )
}
