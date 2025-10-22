import { defineRecipe } from '@pandacss/dev'

export const headingRecipe = defineRecipe({
  className: 'heading',
  jsx: ['Heading'],
  base: {
    textStyle: 'display.ui',
    color: 'colorPalette.fg.strong'
  },
  variants: {
    as: {
      h1: { textStyle: 'display.xl' },
      h2: { textStyle: 'display.ui' },
      h3: { textStyle: 'display.sm' },
      h4: { textStyle: 'display.xs' },
      h5: { textStyle: 'heading.lg' },
      h6: { textStyle: 'heading.md' }
    }
  },
  defaultVariants: {
    as: 'h2'
  }
})

export const heading = headingRecipe
