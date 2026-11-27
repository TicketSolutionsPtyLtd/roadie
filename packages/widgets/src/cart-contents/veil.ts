// Over an event being removed, in both skins. Solid where transparency is
// reduced, as is-translucent goes; Tailwind has no variant for it.
export const cartRemovingVeilClass = [
  'absolute -inset-4 z-docked grid place-content-center @xl:rounded-xl',
  'bg-raised/60 backdrop-blur-sm',
  '[@media(prefers-reduced-transparency:reduce)]:bg-raised',
  '[@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none'
].join(' ')
