import { cva } from 'class-variance-authority'

export const proseVariants = cva('prose', {
  variants: {
    size: {
      sm: [
        '[--prose-size:var(--text-sm)] [--prose-flow:1em]',
        '[--prose-h1-size:var(--text-4xl)] [--prose-h1-weight:700]',
        '[--prose-h2-size:var(--text-3xl)] [--prose-h2-weight:700]',
        '[--prose-h3-size:var(--text-2xl)] [--prose-h3-weight:700]',
        '[--prose-h4-size:var(--text-xl)] [--prose-h4-weight:700]',
        '[--prose-h5-size:var(--text-lg)] [--prose-h5-weight:600]',
        '[--prose-h6-size:var(--text-base)] [--prose-h6-weight:600]'
      ],
      md: '',
      lg: '[--prose-size:var(--text-lg)]'
    }
  },
  defaultVariants: {
    size: 'md'
  }
})
