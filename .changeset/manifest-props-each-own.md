---
'@oztix/roadie-components': patch
'@oztix/roadie-charts': patch
---

Fix props in `roadie.manifest.json` that came from another component. Props a component redeclares over a DOM or Base UI prop are now listed: `aria-label` on `Carousel` and `Toast.Close`, `rel` on `Tabs.Tab`, `Carousel.Next`, `Carousel.Previous`, `Carousel.PlayPause`, `CommandPalette.Trigger`, `ImageCrop.Reset`, `ImageCrop.Rotate`, and `Pane.InspectorTrigger`, `children` on `CommandPalette.Status`, and `autoFocus` on `OTPField`. `rel` is gone from the `DataCard`, `FileUpload`, and `Toolbar` parts that never took Button's link props, and `nativeButton` gives each part's own default. `Slider`'s `locale` now says it defaults to `'en-AU'`, not the runtime locale.
