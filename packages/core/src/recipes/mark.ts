import { defineRecipe } from '@pandacss/dev'

export const markRecipe = defineRecipe({
  className: 'mark',
  jsx: ['Mark'],
  base: {
    display: 'inline-block',
    backgroundColor: 'colorPalette.surface.highlight',
    colorPalette: 'information',
    color: 'neutralSlate.12',
    px: '0.1em',
    py: '0.05em',
    '&.color-palette_neutral': {
      color: 'neutral.fg.inverted'
    },
    _hoverFocusVisible: {
      backgroundColor: 'colorPalette.surface.highlight.hover'
    },
    '&::selection': {
      backgroundColor: 'colorPalette.surface.highlight.active'
    }
  }
})

export const mark = markRecipe
