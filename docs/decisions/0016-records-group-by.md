# 0016 Records group by one ordered list in every layout

## Context

A list grouped by one field and a board made its columns from one field, each
with its own `groupBy`, and tables and grids couldn't group. Product Design
needed board swimlanes for a story map, and grouping should mean the same in
every layout rather than a board-only `laneBy`. Notion, Linear and ClickUp
group with one setting, making a board's columns from the first level and its
rows from the second. GitHub Projects and monday.com give a board a separate
column field, and Airtable groups each layout its own way.

## Decision

A view's `layout.groupBy` is a list of fields, outermost first, up to three,
on table, grid, list and board. A board draws the first level as its columns
and the second as lanes, as Linear does, and keeps a third for the other
layouts. A board move reports the grouping fields that changed, by field.
A group heading's own content comes from the field, so it follows the field
into every layout and level. Grouping stays over the loaded rows.

## Consequences

Read grouping from `layout.groupBy` in every layout, and never add a
layout-specific grouping key. Switching a list to a board turns its first
level into columns, so a field with many options makes many columns; the board
guidelines steer away from that. Grouping on the server, with counts across
pages, needs a `RecordsRequest` change and reopens this. So does a fourth
level.

## Links

- INNO-1738 to INNO-1745, the series under INNO-1428
- `packages/core/src/records/types.ts`, `RecordLayout`
- [Records foundations, URL format](../src/app/foundations/records/page.mdx)
