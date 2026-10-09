# 0012 Base UI focus guards stay nameless buttons in WebKit

## Context

Base UI wraps open popups, such as DatePicker's and DashboardPeriod's, in
visually hidden focus guards (`span[data-base-ui-focus-guard]`,
`tabindex="0"`). In WebKit on Apple platforms, Base UI 1.8.0 gives them
`role="button"` and drops `aria-hidden`, so VoiceOver's virtual cursor
focuses them and the focus trap can send it back into the popup. Everywhere
else the guards are `aria-hidden`. The buttons have no name, so axe's
`aria-command-name` (serious) fails on them in WebKit (INNO-1184).

Base UI takes no prop that names or hides the guards, and 1.9.0 doesn't
change them. Its maintainer calls the role intentional and says
`aria-hidden` would break VoiceOver
([mui/base-ui#5237](https://github.com/mui/base-ui/issues/5237)). Patching
the guards from Roadie would fight Base UI's renders and could break the trap.

## Decision

Keep Base UI's guards as they are. The a11y checks accept
`aria-command-name` on `[data-base-ui-focus-guard][role="button"]` in WebKit
only, listed in `acceptedViolations` in
`packages/components/src/checks/testUtils.tsx`. Any other unnamed button
still fails.

What VoiceOver announces is inferred, not heard: from the DOM and the role
and name Testing Library computes, a guard reads as an unnamed button at
each edge of the popup.

## Consequences

`focusGuards.browser.test.tsx` asserts the guards are nameless buttons in
WebKit on Apple platforms and hidden elsewhere. When Base UI names or hides
them, it fails: remove the exception and this record's entry then. Linux
WebKit in CI gets no role, so the exception only matters on a Mac.

## Links

- INNO-1184, the decision
- INNO-1132, the axe checks that found it
- [mui/base-ui#5237](https://github.com/mui/base-ui/issues/5237), upstream
