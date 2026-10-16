import { cva } from 'class-variance-authority'

export const toolbarVariants = cva(
  [
    'flex min-w-0 flex-wrap items-center gap-1',
    'data-[orientation=vertical]:w-fit data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:*:w-auto'
  ],
  {
    variants: {
      // A pill on one row, and a rounded box once it wraps or stands up.
      emphasis: {
        normal: 'emphasis-normal rounded-3xl p-1',
        subtle: 'emphasis-subtle rounded-3xl p-1',
        subtler: '',
        raised: 'emphasis-raised is-translucent rounded-3xl border p-1',
        floating: 'emphasis-floating is-translucent rounded-3xl border p-1'
      }
    },
    defaultVariants: { emphasis: 'normal' }
  }
)
