---
'@oztix/roadie-widgets': minor
---

Cart drawer: event schedule times can render in the **venue's** timezone instead
of the viewer's browser timezone.

- The event/schedulable type gains an optional `eventTimeZone` (IANA id, e.g.
  `Australia/Brisbane`). When present, the shared `formatEventSchedule` /
  `formatTime` core helpers render the start, finish, and multi-day end times in
  venue-local time. The logic lives in core, so the React and Vue skins stay
  identical.
- **Additive & backward-compatible:** when `eventTimeZone` is omitted, times
  render in browser-local time exactly as before — existing consumers are
  unaffected.
- **Robust:** an invalid/unknown timezone id falls back to browser-local rather
  than throwing, so a bad value can never blank the time or crash the drawer.

Consumer note: backends must emit `eventTimeZone` as an **IANA** id. Sources that
store Windows timezone ids (e.g. `E. Australia Standard Time`) must convert to
IANA before passing it in — `Intl` only accepts IANA ids.
