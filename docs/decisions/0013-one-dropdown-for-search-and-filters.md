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

Custom dates is the exception. A calendar doesn't fit in a list, so it still
opens `RecordsFilterEditor`, in a popover under the chip or a bottom drawer
on a phone. INNO-1278 picks its phone surface, the drawer or a calendar in
the dropdown, and records the pick here.

## Consequences

`RecordsFilterEditor` holds only the date range and single date pickers. A
new field type needs a value step in the dropdown, not an editor. Phones and
desktops share one set of keyboard and screen reader behaviour, which the
`Records.Search` tests cover.

## Links

- INNO-1274, the QueryField overhaul
- INNO-1277, editing chips in the dropdown
- INNO-1278, Custom dates on phones
