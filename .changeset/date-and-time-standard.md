---
'@oztix/roadie-core': minor
'@oztix/roadie-components': minor
'@oztix/roadie-widgets': minor
---

Add a date and time standard: a formatting module and four components.

`@oztix/roadie-core/datetime` is a new subpath export. It turns an instant into
text and is the single place dates are spelled. Every call takes an explicit
`timeZone`, with no browser fallback, because an event time rendered in the
reader's zone is silently wrong for anyone not standing at the venue.

`dateStyle` and `timeStyle` are two names for one ladder, `full` / `long` /
`medium` / `short` / `iso` and `long` / `medium` / `short` / `numeric`, with
presets for each step. Ranges join with the word `to` rather than a dash, which
screen readers skip. The meridiem closes up against the digits, so times read
`7:30pm`.

Alongside the presets: ranges, durations, countdowns, relative time, and
machine readable output. `formatMachine` carries the zone's offset so a value
identifies an instant; `formatIso` deliberately omits it, for export columns
read as local wall-clock. Instants may be a `Date` or anything carrying
`epochMilliseconds`, and durations may be milliseconds, an ISO 8601 string, or
the field object `Temporal.Duration` exposes, so Temporal values work today.

`DateTime`, `Duration` and `Countdown` are new components. They render a `time`
element and set its machine readable value, which is the part that is easy to
get wrong and wrong silently. `CalendarTile` is the exception: it abbreviates
too hard to be an accessible name, so by default it is an `aria-hidden` `div`
and the date line beside it owns the `time`. Pass `dateTime` and it becomes one
itself, which is only right where the tile is the sole date in its region. `Countdown` animates its digits
with `@number-flow/react`, which components now depends on directly rather than
asking consumers to install: the root barrel imports it, and a bundler resolves
every import before it tree shakes, so a peer would break `import { Button }`
for anyone who had not added it. `CalendarTile` ships a matching `calendar-tile`
CSS utility for templates that cannot run React.

**Four visible changes to the shipped cart widget.** Day headers no longer mix
an abbreviated weekday with a full month, so `Fri, 27 November 2026` becomes
`Fri 27 Nov 2026`. Time and date ranges join with the word `to` rather than an
en dash. Seat runs join with a hyphen rather than an en dash, matching how
number ranges are already written elsewhere, so `A1–4` becomes `A1-4`. And a
time whose timezone cannot be resolved now renders nothing rather than falling
back to the browser's own clock, because a plausible time in the wrong zone is
worse than no time at all.

Rebuilds the Intermission faces so `tnum` reaches every digit. The digits 1, 4,
6 and 9 were left proportional, so any column of numbers drifted as values
changed. The faces are served from new CDN URLs.
