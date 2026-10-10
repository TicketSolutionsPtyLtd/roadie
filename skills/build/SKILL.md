---
name: build
description: Use when building or changing a screen, page, form, dialog, list, table, card, or other UI in an app that uses Roadie (`@oztix/roadie-components` or `@oztix/roadie-core`). Use it in place of the generic frontend-design skill there. Picks a Roadie component before any markup, lays out with grid and gap, colours with intent and emphasis, writes headings as raw elements with display classes, wraps form controls in Field, links with href, puts records in RecordTable or RecordGrid, covers empty and error states with EmptyState, and writes copy in the house style. Triggers on "build a page", "build a screen", "add a form", "make a dialog", "list page", "settings page", "build UI with Roadie", "make this look like Roadie".
---

# Roadie build

Build UI from Roadie's components and utilities, so a screen reads as one
system with every other Oztix app. This skill holds the decisions agents get
wrong. The detail lives in two places:

- **The installed manifest**, which matches the version in the app:
  `node_modules/@oztix/roadie-components/dist/roadie.manifest.json`, and the
  same file in `@oztix/roadie-core`. It lists every subpath, component, prop,
  and deprecation, with a link to each docs page. Read it before you write
  markup or guess a prop. Older releases don't ship it; read the package's
  `exports` and `.d.ts` files instead.
- **The docs index**, `https://ticketsolutionsptyltd.github.io/roadie/llms.txt`.
  Links ending in `.md` are markdown with props. Read a component's page
  before you use it for the first time, and the foundations page for the area
  you touch.

Hand off the rest: app setup to `/roadie:setup`, and any chart, stat tile,
KPI row, or dashboard to `/roadie:charts`.

## 0. Check the setup

If any of this is missing, run `/roadie:setup` first.

- `@oztix/roadie-components` and `@oztix/roadie-core` are installed, and the
  main CSS file imports `@oztix/roadie-core/css` and
  `@oztix/roadie-components/css`.
- One `RoadieProvider`, given the router's Link, wraps the app at the root.
- Import each component from its own subpath
  (`@oztix/roadie-components/button`), never the root barrel.
  `RoadieProvider` is the one root import.

## 1. Pick a component before writing markup

Before you write a `div` with classes, look for the component in the
manifest. If one fits, use it, even when a few classes look quicker. A
hand-rolled version misses the states, keyboard support, and dark mode the
component already has.

| You need                               | Use                                                     |
| -------------------------------------- | ------------------------------------------------------- |
| An action                              | `Button`, or `IconButton` with `aria-label`             |
| A surface for content in a page        | `Card`, with `Card.Header`, `Card.Content`, and so on   |
| A column of an app frame               | `Pane` inside `Navigator`, never as a box in a page     |
| Records to search, filter, sort, page  | `RecordTable`, or `RecordGrid` when an image leads      |
| A few records to open, or settings     | `List` with `List.Item`                                 |
| A status or a tag                      | `Badge`                                                 |
| A message about the page or a section  | `Callout`                                               |
| Nothing to show, or a failed load      | `EmptyState`                                            |
| A short task or a confirmation         | `Dialog`, or `Drawer` for a longer one                  |
| A menu of actions                      | `Menu`                                                  |
| One of a few views or options          | `Tabs`, `ToggleGroup`, or `RadioGroup`                  |
| A date, time, range, or countdown      | `DateTime`, `Duration`, `Countdown`, `CalendarTile`     |
| Feedback after an action               | A toast from `useToastManager` (`/toast`)               |
| A loading placeholder                  | `Skeleton`                                              |
| Markdown or CMS content                | `Prose`                                                 |

There are no `Text`, `Heading`, `Stack`, `Box`, or `Container` components.
Use raw elements and utilities for those (sections 3 and 5).

When nothing fits, compose existing components and utilities. Don't copy a
component's source into the app, and don't add a second UI library beside
Roadie.

## 2. Records go through Records

A list people work through (events, orders, attendees, and customers) is a
`RecordTable` or a `RecordGrid`. Read
[Tables](https://ticketsolutionsptyltd.github.io/roadie/foundations/tables/)
to pick the right one, and
[Records model](https://ticketsolutionsptyltd.github.io/roadie/foundations/records/)
for fields and views.

- **The toolbar is the filter bar.** `Records.Toolbar` holds the search,
  which turns typed text into filter chips ("melb this weekend"), and the
  Configure button for sort and columns. Don't build a row of `Select`s,
  date pickers, or a columns menu above the table.
- **Describe the records once, at module scope.** Build fields with
  `recordFields<Row>()` (`@oztix/roadie-core/records`) and columns with
  `tableColumns<Row>(fields)` (`@oztix/roadie-components/record-table`)
  outside the component. An option field with a `status` map shows a
  `Badge` in each value's intent. A date field takes `moment` and, for events,
  `timeZoneKey`, so dates read in the venue's zone.
- **Pin one title column** with `pin: true`.
- **Render it in a client component** (`'use client'`), since fields and
  columns hold functions. Fetch on the server, inside a `<Suspense>`
  boundary, and pass the rows in.
- **Let it show its own states.** Pass `recordName`, and the table shows the
  empty and no match states itself, with a Clear search and filters action.
  While the server fetches, the Suspense fallback is a `Skeleton` shaped
  like the table. For a failed fetch, render the table in the route's
  `error.tsx` with `error` and `onRetry={reset}`. Fetching in the browser,
  pass `loading`, `error`, and `onRetry` straight from the query. Never swap the
  table for your own message.
- **In a Pane**, wrap the pane in `Records.Provider`: `Pane.Title` in
  `Pane.Header`, `Records.Toolbar` and `Records.Content` in `Pane.Body`, and
  `Records.Pagination` in `Pane.Footer`. Keep the search in the toolbar,
  never in `Pane.Search`.
- **What the page is about** (one venue's events) is `scope`, not a filter
  in `defaultView`.
- **Actions.** `tableActions` act on every match, `bulkActions` on a
  selection, and `rowActions` on one row. `getRowHref` links each row.

Use `DataTable` for a read-only summary of about 25 rows or fewer, and `List`
for a few records to open.

`RecordTable`, `RecordGrid`, and `Records` are newer than some installs.
Check the package's `exports` for `./record-table`, not the version number.
If it's missing, upgrade. If no release has it yet, build the stopgap and
switch when you can:

- `Table` inside an `overflow-x-auto` wrapper, since `Table` has none.
- Filters as `Field`-wrapped controls in a `flex flex-wrap items-end gap-2`
  row.
- Two empty states in place of the table: "No events yet" with a create
  action when there are no records, and "No events match" with Clear search
  and filters when the filters hide them all.

## 3. Layout is grid first, with gap

Read [Layout](https://ticketsolutionsptyltd.github.io/roadie/foundations/layout/).

- `grid gap-*` is the default, vertical stacks included. The parent sizes its
  children. Never write `flex flex-col`.
- `flex` only when children size themselves: a row of buttons, tags, or a
  toolbar, usually `flex flex-wrap items-center gap-2`.
- Space siblings with the parent's `gap`, never margins or `space-y-*`.
- Set constraints, not sizes: `max-w-*`, `min-h-*`, `minmax(0, 1fr)`, and
  `w-fit`. Don't add `w-full` to block elements or fix a `h-[…]`.
- Centre a page's content with `container-*` (`container-5xl`), not
  `mx-auto max-w-*`.
- Responsive by constraints: a grid that fits as many columns as it can
  (`grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]`), or container queries
  (`@container` with `@md:grid-cols-2`) for a component that sits in columns
  of different widths. Use viewport breakpoints (`md:`) for page layout only.
- Check every screen at 390px wide. Nothing scrolls sideways except a table.

## 4. Intent and emphasis, never colours

Read [Colors](https://ticketsolutionsptyltd.github.io/roadie/foundations/colors/).

- Never write a colour: no hex, no `rgb()`, no Tailwind palette class such as
  `bg-gray-100` or `text-red-600` (the palette is off, so they do nothing),
  and no `dark:` variant (`.dark` swaps the scales).
- Text: `text-strong` for headings, `text-normal` (the default), `text-subtle`
  for secondary text, and `text-subtler` for hints. Surfaces: `bg-normal`,
  `bg-raised`, and `bg-sunken`. Borders: `border-subtle` and
  `border-normal`. There's no `text-danger`; use `intent-danger` with a text
  utility.
- **Intent** picks the palette and children inherit it: `neutral` (the
  default), `brand`, `brand-secondary`, `accent`, `danger`, `success`,
  `warning`, and `info`.
  Set it on a component (`<Button intent='danger'>`) or a container
  (`intent-danger`). Don't set an intent just to restate the default, and
  choose intent by meaning, never for decoration.
- **Emphasis** presets set background, text, border, and states together:
  `strong` (solid fill), `normal` (a border), `subtle` (a tint), `subtler`,
  `raised`, `sunken`, and `floating`. Use the component's `emphasis` prop, or
  the `emphasis-*` class on your own element.
- **One strong action per view or dialog**: `intent='accent'
  emphasis='strong'`, or `intent='danger'` for a destructive one. The rest
  stay at the default emphasis. Never use `subtle` for dialog actions.
- **Portals don't inherit.** A dialog renders outside the trigger's
  cascade, so set `intent` on `Dialog.Content`, not on the trigger.
- **Selected items.** The chosen item of a quiet control gets `is-selected`
  on `emphasis-subtle`, paired with an icon, since the fill alone is faint.

## 5. Text is raw elements with display classes

Read [Typography](https://ticketsolutionsptyltd.github.io/roadie/foundations/typography/).

- Headings are `<h1>` to `<h6>` with a `text-display-ui-*` class and
  `text-strong`: `<h1 className='text-display-ui-2 text-strong'>`. Match the
  element to the outline and the class to the context. `text-display-prose-*`
  is for articles and marketing pages, not app UI.
- Body text is a `<p>` with no class. Secondary text is
  `<p className='text-sm text-subtle'>`.
- Don't use raw `text-2xl font-bold` for a heading; the display class sets
  size, weight, line height, and tracking together.
- `Prose` renders markdown or CMS content. Don't style that HTML by hand.

## 6. Icons are Phosphor bold

Read [Iconography](https://ticketsolutionsptyltd.github.io/roadie/foundations/iconography/).

- `@phosphor-icons/react`, with the `Icon` suffix (`CalendarIcon`).
- In a server component (no `'use client'`), import from
  `@phosphor-icons/react/ssr`. The plain import is for client files only.
- Bold everywhere, which is the default inside Roadie components.
  `weight='fill'` only for a selected or active state, and `duotone` only
  in a tile or graphic above 48px, such as an `IconTile` above `lg` or an
  `EmptyState` tile.
- Size with classes, `size-4` by default, never the `size` prop. Inside a
  `Button`, `Badge`, or menu item, pass a bare icon; the component sizes it.
- An icon-only action is an `IconButton` with an `aria-label`.

## 7. Field wraps every form control

Read [Forms](https://ticketsolutionsptyltd.github.io/roadie/foundations/forms.md).

```tsx
<Field required invalid={Boolean(errors.name)}>
  <Field.Label showIndicator>Event name</Field.Label>
  <Field.Input name='name' autoComplete='off' />
  <Field.ErrorText>{errors.name}</Field.ErrorText>
</Field>
```

- `Field` wraps every control: `Input`, `Textarea`, `Select`, `RadioGroup`,
  `Combobox`, `Autocomplete`, `DatePicker`, and `NumberField`. Set
  `invalid`, `required`, and `disabled` on `Field`, never on the control.
- `Field.Label showIndicator` marks required or optional for you.
- Always render `Field.ErrorText`; it shows only when `invalid`. Don't wrap
  it in a condition.
- `Select.Content`, not `Select.Portal` with `Positioner` and `Popup`.
- Group related fields in `Fieldset` with `Fieldset.Legend`. Field already
  spaces its parts, so add no wrapper `div`.
- Keep submit enabled. Validate on submit, show each error under its field,
  and focus the first one. Field sets `aria-invalid` only after React
  renders the errors, so commit them first:

  ```tsx
  flushSync(() => setErrors(next))
  form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  ```

- Clear the errors when the dialog or form resets. Set `name` and
  `autoComplete` on every input.
- A placeholder shows the format ("e.g. 0412 345 678"), never the label.

A form in a dialog:

```tsx
<Dialog.Content size='sm'>
  <form onSubmit={onSubmit} className='contents'>
    <Dialog.Header>
      <Dialog.Title>Add event</Dialog.Title>
    </Dialog.Header>
    <Dialog.Body>{/* Fields */}</Dialog.Body>
    <Dialog.Footer>
      <Dialog.Close render={<Button>Cancel</Button>} />
      <Button type='submit' intent='accent' emphasis='strong'>
        Add event
      </Button>
    </Dialog.Footer>
  </form>
</Dialog.Content>
```

Use `role='alertdialog'` on `Dialog` for a destructive or blocking
confirmation, with `intent='danger'` on `Dialog.Content`.

## 8. Links take href

Read [Linking](https://ticketsolutionsptyltd.github.io/roadie/foundations/linking/).

- Every link-bearing component takes `href`: `Button`, `IconButton`, `Card`,
  `List.Item`, `Menu.Item`, `Breadcrumb.Link`, and `Tabs.Tab`. Internal
  hrefs route through the provider's Link, external ones open in a new tab
  with a safe `rel`, and no `href` renders a `<button>`.
- Never wrap a Roadie component in `<Link>`, and never navigate from
  `onClick` with `router.push`. Use `href`.
- Don't add `target` or `rel` to a Roadie component; it sets them.
- `render` is the escape hatch for a custom element, and it wins over `href`.

## 9. Empty, loading, and error states

Every view that loads data has all three. Read the
[EmptyState](https://ticketsolutionsptyltd.github.io/roadie/components/empty-state.md)
page.

- `EmptyState` with a title, a one-line description, and an action that
  moves people on. "Nothing yet" and "nothing matches" are different states
  with different actions: create one, or clear the filters.
- `size='sm'` inside a card or section, `md` on its own, and `lg` for a
  whole page or 404, with `EmptyState.Title render={<h1 />}`.
- A failed load is `<EmptyState intent='danger'>` with a Retry action. Set
  the intent once on the root.
- EmptyState has no surface. Put it in a `Card` when it needs one.
- Await data inside `<Suspense>`, not at the top of the page, with a
  `Skeleton` fallback shaped like the content. Roadie reads no clock on the
  server, so `DateTime` and `RecordTable` prerender under Next's
  `cacheComponents` outside Suspense and inside a fallback alike.
- A failed fetch on the server is the route's `error.tsx`, with an
  `EmptyState intent='danger'` and a Retry that calls `reset`.
- A `RecordTable` handles all of this itself (section 2).

## 10. Shape and elevation

- Radius tiers only: `rounded-lg` for fields, `rounded-xl` for cards and
  popovers, `rounded-2xl` for dialogs, and `rounded-full` for pills. Never
  `rounded-[…]`. A child's radius is never larger than its parent's.
- Components set their own radius; don't override it.
- Depth comes from emphasis (`emphasis-raised`, `emphasis-floating`), not
  raw `shadow-*`. Layers use the named tiers (`z-sticky`, `z-popover`), never
  `z-50`.

## 11. Interaction

- `is-interactive` on anything clickable you build yourself, and
  `is-interactive-field` with `emphasis-field` on a custom field. Never
  hand-roll `hover:`, `focus:`, or `active:` states.
- Nothing clickable is a `div` or `span` with `onClick`. Use `Button` or a
  `<button>`.

## 12. Dates and times

Read [Date and time](https://ticketsolutionsptyltd.github.io/roadie/foundations/date-and-time/).

- Render every date with `<DateTime at={startsAt} timeZone={venue.timeZone} />`,
  never `toLocaleDateString()` or a date library's `format`. `at` takes a
  `Date`, so wrap an ISO string in `new Date()`. An event's time is in the
  venue's zone, not the viewer's.
- A range is `<DateTime at={start} to={end} timeZone={tz} />`, which reads
  "Fri 27 to Sun 29 Nov".
- Times read `7:30pm` (`timeStyle='medium'`). Use `timeStyle='numeric'`
  (`19:30`) only in a dense table column or an export.

## 13. Copy

- **Sentence case** for every title, label, button, menu item, and column
  header: "Add event", not "Add Event".
- **Plain, active, short.** Buttons name the action and its object ("Save
  changes", "Cancel event"), never "OK", "Submit", or "Yes". A dialog title
  states the decision ("Cancel Marzipan Thunderclap?"), not "Are you sure?".
- **No dashes as punctuation.** Ranges use "to": "$50 to $100". A middot
  separates facts: "Fri 27 Nov · Kazoo Hollow Room".
- **Australian spelling**: colour, organise, cancelled, and favourite.
- **Numbers**: numerals, commas for thousands, `$1,200`, and `68%`. Format
  them with `formatValue` from `@oztix/roadie-core/dataviz`, not
  `toLocaleString`. Record fields format their own.
- **Errors** say what happened and what to do: "Enter an event name", not
  "Invalid input".
- **Sample data** never uses a real venue, event, or promoter, because
  Oztix's clients run the real ones. Use the invented names in Roadie's
  [example data](https://github.com/TicketSolutionsPtyLtd/roadie/blob/main/docs/contributing/EXAMPLE_DATA.md),
  with real Australian cities.

## 14. Before you hand off

- The app typechecks and builds, with no hydration warnings in the console.
- Every file without `'use client'` that imports Phosphor uses the `/ssr`
  path.
- The screen works at 390px and in dark mode, and every action works from the
  keyboard.
- Run `/roadie:audit` on the files you touched, then `/roadie:review`.
