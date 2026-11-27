// Subpath entry for `@oztix/roadie-components/cascade`.
//
// What a package built on Roadie needs to carry the cascade onto elements of
// its own: the class for each intent, and the accent scope for a layer it
// portals out of the page, as Roadie's own popovers and dialogs do.
//
// NO `'use client'`: server-safe re-export layer.
export { intentVariants, type RoadieIntent } from './variants'
export {
  AccentScopeContext,
  useAccentScopeProps
} from './providers/AccentScopeContext'
