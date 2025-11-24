import { buttonRecipe } from './button'
import { codeRecipe } from './code'
import { headingRecipe } from './heading'
import { markRecipe } from './mark'
import { textRecipe } from './text'

export const recipes = {
  button: buttonRecipe,
  code: codeRecipe,
  heading: headingRecipe,
  mark: markRecipe,
  text: textRecipe
}

export * from './button'
export * from './code'
export * from './heading'
export * from './mark'
export * from './text'
