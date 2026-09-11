---
'@oztix/roadie-core': minor
---

Refine the shadow scale so raised, floating and sunken surfaces read as
detailed rather than heavy.

Each `shadow-*` level is now a hairline ring for the edge plus a stack of
layers whose offset and blur double; higher levels add a layer and lower each
layer's opacity instead of darkening. Light-mode shadows are a shade of the
intent hue rather than near-black. Inset shadows lose their heavy dark-mode
black and gain a faint lower lip so they still read as recessed.

The `shadow-*` and `inset-shadow-*` utilities now follow dark mode and intent
tinting. Tailwind had been compiling their light values in, so they ignored
both — only the emphasis presets did. Token and utility names are unchanged.
