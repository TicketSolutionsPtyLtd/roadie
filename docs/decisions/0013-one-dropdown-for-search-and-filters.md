# 0013 One dropdown for search and filters

## Context

`Records.Search` added option, boolean and date filters from QueryField's
dropdown, but a text or number filter, and editing any chip, opened
`RecordsFilterEditor` in a popover, or a bottom drawer on phones. So the
same filter was added one way and changed another, and a phone switched
surfaces mid-task. The QueryField overhaul (INNO-1274) set out to make
searching, adding, and editing one flow on every screen size.

## Decision

Search, add, and edit filters in QueryField's dropdown on every screen size.
A chip selects on a click and lists its values there, ticked; operators are a
toggle above them; text and numbers are typed and taken with Enter.

Custom dates is the exception: a calendar doesn't fit a list, so it still
opens `RecordsFilterEditor`, in a popover under the chip or a bottom drawer
on phones. INNO-1278 decides its phone surface, the drawer or a calendar
inside the dropdown, and records the pick here.

## Consequences

`RecordsFilterEditor` holds only the date range and single-date pickers, and
a new field type needs a value step in the dropdown, not an editor. Phones
and desktops share one set of keyboard and screen reader behaviour, covered
by the `Records.Search` tests.

## Links

- INNO-1274, the QueryField overhaul
- INNO-1277, editing chips in the dropdown
- INNO-1278, Custom dates on phones
