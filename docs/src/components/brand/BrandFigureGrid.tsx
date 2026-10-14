import type { ReactNode } from 'react'

const COLUMNS = {
  '2': '@lg:grid-cols-2',
  '3': '@lg:grid-cols-2 @3xl:grid-cols-3'
}

/** Lays `BrandFigure`s or `DownloadCard`s out in columns that drop to one on a phone. */
export function BrandFigureGrid({
  columns = '2',
  children
}: {
  columns?: keyof typeof COLUMNS
  children: ReactNode
}) {
  return (
    <div data-not-prose data-slot='brand-figure-grid' className='@container'>
      <div className={`grid gap-4 ${COLUMNS[columns]}`}>{children}</div>
    </div>
  )
}
