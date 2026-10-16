# 0013 One dropdown for search and filters

## Context

`Records.Search` added option, boolean, and date filters in QueryField's
dropdown. A text or number filter, and editing any chip, opened
`RecordsFilterEditor` in a popover, or a bottom drawer on a phone. A filter
was added one way and changed another, and a phone switched surfaces partway
through. The QueryField overhaul (INNO-1274) set out to make searching,
adding, and editing one flow at every screen size.

## Decision

Search, add, and edit filters in QueryField's dropdown at every screen size.
A click or Enter on a chip selects it and lists its values in the dropdown,
ticked. The operators are a toggle above the values. Text and numbers are
typed, and Enter takes them.

Dates too. A date field's toggle reads is relative, is, is before, is after,
and is between. Is relative lists the quick dates. The others show a calendar
under the values, through QueryField's `pendingChip.content`, with typed dates
as suggestions above it. Picking a day, or a range's second day, adds the
chip. There's no popover or drawer, on a phone or a desktop. Times are left
off, so a timestamp field filters by whole days (INNO-1278).

## Consequences

`RecordsFilterEditor` and Custom dates are gone. A new field type needs a
value step in the dropdown, not an editor, and anything a list can't hold
goes in `pendingChip.content`. The dropdown is never wider than the field, so
that content has to fit the field on a phone, about 300px. Phones and
desktops share one set of keyboard and screen reader behaviour, which the
`Records.Search` tests cover.

## Links

- INNO-1274, the QueryField overhaul
- INNO-1277, editing chips in the dropdown
- INNO-1278, dates in the dropdown
