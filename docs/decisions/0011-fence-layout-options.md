# 0011 Live examples take preview layout from fence options

## Context

A `tsx-live` fence is the code a reader copies, but 524 `<div className>`
lines in the component and chart pages were preview scaffolding: root stacks,
wrapping rows, chart width frames, and state labels. Copied code carried
layout that belonged to the docs, and the component template prescribed it
(INNO-1193). The other options were to keep the scaffolding, or to use
docs-only components such as `ExampleStack` inside fences, which copied code
would import without having.

## Decision

Fenced examples hold only the component, in plain Roadie and Tailwind.
CodePreview lays out the preview from fence meta, and the code panel shows
the fence as written:

- `layout=stack` or `layout=row`, with `gap=` for another gap
- `width=40`, `48`, `64`, `72`, `80`, `140`, or `180` for a width frame:
  the Tailwind spacing steps the fences' frames already used, from a fixed
  set so frames stay consistent
- a comment on its own line at column 0, `{/* Disabled */}`, captions what
  follows it, up to the next caption, in a fence with `layout=`

Captions are comments, so copied code keeps a label that reads naturally and
renders nothing. Fence code also uses plain asset URLs, and the preview adds
the base path the docs deploy under, so no docs-only helper is in scope.

The rules are
[component template rules 12 and 13](../contributing/COMPONENT_DOC_TEMPLATE.md#rules),
and the options are under its
[Live examples](../contributing/COMPONENT_DOC_TEMPLATE.md#live-examples).

## Consequences

An inline fence with `layout=` may hold sibling elements: react-live runs it
in a fragment, and the docs lint wraps it the same way. A column-0 comment in
such a fence is always a caption, of four words at most, and several elements under one caption
wrap in a row. `roadie/no-fence-layout-wrapper` fails a root layout `div` the
options can replace, on each page once it migrates.

## Links

- INNO-1193, the decision and the pilot
- INNO-1189, roadie rules for fence code
- INNO-1159, moving content pages to MDX
