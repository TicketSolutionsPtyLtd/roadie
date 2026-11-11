---
'@oztix/roadie-components': minor
---

Deprecate `@oztix/roadie-components/spot-illustrations` in favour of `@oztix/roadie-illustrations/spot`, which has all 176 spot illustrations rather than 12, with updated art. The named illustrations take the same props. Their `…Props` types, such as `HeartProps`, aren't exported there, so use `SpotIllustrationComponentProps`. `SpotIllustration` there takes `layers` in place of `illustration`, and `createSpotIllustration` isn't exported. The old subpath still works and will be removed in a future major.
