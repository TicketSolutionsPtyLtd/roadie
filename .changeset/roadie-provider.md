---
'@oztix/roadie-components': minor
---

Add `RoadieProvider`, one root provider for a Roadie app:
`<RoadieProvider link={NextLink}>{children}</RoadieProvider>`. It mounts
`RoadieLinkProvider`, `ThemeProvider`, `Toast.Provider` with a `Toast.Viewport`,
`Tooltip.Provider` and Base UI's `DirectionProvider`. Each part takes its usual
options through `theme`, `toast` (plus the viewport's `position` and
`container`), `tooltip` and `direction`, and `false` leaves it out. Every
individual provider stays exported, and a nested one still overrides its part.
In development, Roadie warns when a `RoadieProvider` sits inside another one,
or when a `ThemeProvider` or `Toast.Provider` it already mounts wraps it or
sits straight inside it.

Top toasts now clear `Pane.Header`. A `Navigator` frame tracks the bottom of
the tallest pane header along the top of the window, and keeps it in step as
the header collapses, so `top-end` and `top-center` toasts sit just below it.
`--toast-viewport-offset-top` stays yours and adds to that. Bottom positions
are unchanged.
