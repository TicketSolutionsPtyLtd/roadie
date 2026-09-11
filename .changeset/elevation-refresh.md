---
'@oztix/roadie-core': minor
'@oztix/roadie-components': patch
---

Refine the shadow scale so raised, floating and sunken surfaces read as
detailed rather than heavy, and give text fields a cleaner edge.

Each `shadow-*` level is now a hairline ring for the edge plus a stack of
layers whose offset and blur double; higher levels add a layer and lower each
layer's opacity instead of darkening. Light-mode shadows are a shade of the
intent hue rather than near-black. Inset shadows drop their ring and their
heavy dark-mode black, and gain a faint lower lip in dark mode so they still
read as recessed.

The `shadow-*` and `inset-shadow-*` utilities now follow dark mode and intent
tinting. Tailwind had been compiling their light values in, so they ignored
both — only the emphasis presets did. Token and utility names are unchanged.

New `emphasis-field` preset for text fields: a sunken fill, one translucent
border that takes the fill's tint, and a single inset line. It is plain CSS, so
server-rendered markup gets the same look with
`class="emphasis-field is-interactive-field"`. `Input`, `Textarea`, and the
`Combobox` and `Autocomplete` input groups use it in place of
`emphasis-sunken border border-subtle`.

`is-interactive-field` and `is-interactive-field-group` hover now steps to
`neutral-3` in light mode — it previously matched the resting fill — and focus
uses `accent-1` in dark mode so a focused field stays close to its resting
depth.

In dark mode every intent's sunken background moves from step 0 to step 1.
Step 0 is near-black, so sunken panels, code blocks and fields read as holes
rather than recesses.

The `Select` trigger drops its solid `border-normal`: the raised shadow's
hairline now draws its edge, and a solid border beside it read as a double
outline. Its open state uses the same fill as a focused field.
