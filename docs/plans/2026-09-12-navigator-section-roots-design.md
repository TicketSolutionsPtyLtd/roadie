# Navigator section roots — design

Approved in conversation on 2026-09-12. Extends
`2026-09-11-navigator-redesign-design.md` §4 (Sections, panes and Menu) and
supersedes D15 (the home page lives outside every section).

## Goal

A clear rule for top-level pages. Home lives under a house icon and a "Home"
label with its own sub-pages, and any page can show a section's items in the
layout it needs, while the items are still declared once, in
`Navigator.Secondary`.

## 1. Section roots

Every section keeps its own route (D7). A section now chooses what that route
shows:

```tsx
<Navigator.Item value='/' href='/' icon={<HouseIcon />}>
  Home
  <Navigator.Secondary aria-label='Home' root='page'>
    <Navigator.Item value='/overview/installation' href='/overview/installation'>
      Installation
    </Navigator.Item>
    …
  </Navigator.Secondary>
</Navigator.Item>
```

`root?: 'list' | 'page'` on `Navigator.Secondary`, default `'list'`.

| | Section route | Sub-page |
| --- | --- | --- |
| `root='list'` (today) | Phones and `md`: the generated list on top. `lg`: list column beside the page. | Phones and `md`: the page on top, Back to the section route. `lg`: list column beside the page. |
| `root='page'` | Every size: the page, full width. No generated list pane, no Back. | Same as `'list'`. |

- **Tab tap on phones.** For a page-first section, tapping its tab on a sub-page
  goes to the section route (pop to root, like iOS). Tapping it on the root
  scrolls the page to the top. For a list-first section the behaviour doesn't
  change: with `onShowListChange` wired it toggles the list over the sub-page,
  and without it it links to the section route.
- **`showList` (`?nav`).** It still shows the list over a sub-page in either
  kind of section. On a page-first root it has no effect, because the page
  already shows the items.
- **Server render.** The root kind is known during render, from the same walk
  that finds the active section, so the server HTML already has the right
  panes and stack positions.
- **A consumer `Navigator.SecondaryPane`** override applies only where a list
  pane would show, which for page-first sections means sub-pages.

**Guideline (docs):** use a page root when the section has an overview worth
reading, such as Home or a dashboard. Use a list root when the section is a
catalogue you pick from, such as Components.

## 2. Items inside a page

### `useNavigatorSection(value?)`

Returns a section's declared items, or `null`:

```ts
type NavigatorSectionData = {
  value: string
  label: ReactNode
  href?: string
  groups: {
    title?: ReactNode
    items: {
      value: string
      label: ReactNode
      href?: string
      icon?: ReactElement
      description?: string
      badge?: ReactElement<BadgeProps>
      current: boolean
    }[]
  }[]
}
```

- With no argument it returns the active section. With a `value`, it returns
  any section by its item value, so the home page could feature the
  Components catalogue, for example.
- Loose items (outside a `Group`) come back as a group with no title, in source
  order.
- It's computed during render from the walk Root already does, so it works in
  the server render. It's a client hook (`'use client'`).

### `Navigator.SectionItems`

The default rendering is a grouped `List` with chevrons and badges, the same
rows as the generated list pane, and it shows `description` as secondary text.

- Props: `value?` (as for the hook), `className`, and the usual list props.
  It renders nothing when the section isn't found.
- Anything richer, such as cards, uses the hook.

### `description?: string` on `Navigator.Item`

- Shown only by `SectionItems` and returned by the hook.
- Never shown by the navigation itself: not on tiles, the bar, the list pane
  or More.

## 3. Docs site

- Home becomes a section at `/`, with `HouseIcon` and the label "Home",
  `root='page'`. The Get started pages move under it: Installation, Philosophy,
  Migration and the external Changelog.
- `/get-started` is deleted, along with its page. The hero's "Get started"
  button links to the first Home sub-page.
- The home page renders its items as `Card`s through the hook, each with a
  description.
- Phone bar: Home, Foundations, Components, More (Tokens, Widgets), and the
  Appearance circle.
- `FooterNav` treats `/` like any section route.

## 4. Edge cases

- **An unknown `value`:** the hook and `SectionItems` return `null` or render
  nothing. There's no warning, because a page may render before its section
  exists.
- **`root='page'` on a section with no `href`:** it gets the existing
  routeless-section warning and is treated as `'list'`.
- **Wrapped `Primary`** (not a direct child): the hook falls back to the
  effect-published section after mount, like the rest of Navigator. This is
  documented.
- **Expanded vertical navigation:** unaffected. Section roots only change panes.

## 5. Testing

- Unit tests:
  - `root='page'` stack positions on the root and on sub-pages, for phone and
    `lg` classes;
  - no Back on the root;
  - tab tap from a sub-page goes to the root, and on the root scrolls to top;
  - `showList` is ignored on a page root;
  - the hook's shape, including loose items, `current` and `value` lookup;
  - `SectionItems` rows, descriptions and chevrons;
  - `description` is absent from the navigation.
- A server-render test: a page-first root has no list pane, and the page is
  `top`.
- Browser checks on the docs site at 390, 900 and 1440:
  - `/` is the home page with its cards and no list;
  - `/overview/philosophy` has a list column at `lg` and Back to `/` on phones;
  - the tab-tap rules hold;
  - Components still behaves as before.
- Docs: the Navigator page gets a "Section roots" section with the guideline,
  and an example for each of the hook and `SectionItems`.
