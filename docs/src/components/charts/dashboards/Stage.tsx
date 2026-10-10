import type { ReactNode } from 'react'

/** Frames a full-width example, such as a whole dashboard, from the tablet width up. */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <div
      data-not-prose
      className='grid sm:rounded-xl sm:border sm:border-subtler sm:p-6'
    >
      {children}
    </div>
  )
}
