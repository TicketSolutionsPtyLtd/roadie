import Link from 'next/link'

import type { Inline } from '@/lib/releases'

/** Changeset text: plain words, quiet monospace for code, and links. */
export function InlineText({ inline }: { inline: Inline }) {
  return inline.map((part, index) => {
    if (typeof part === 'string') return part
    if ('code' in part)
      return (
        <code key={index} className='font-mono text-[0.9em] text-strong'>
          {part.code}
        </code>
      )
    const className = 'underline underline-offset-2'
    return part.href.startsWith('/') ? (
      <Link key={index} href={part.href} className={className}>
        {part.text}
      </Link>
    ) : (
      <a
        key={index}
        href={part.href}
        target='_blank'
        rel='noopener noreferrer'
        className={className}
      >
        {part.text}
      </a>
    )
  })
}
