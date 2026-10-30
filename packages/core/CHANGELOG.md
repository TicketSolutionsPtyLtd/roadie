# @oztix/roadie-core

## 2.13.0

### Minor Changes

- 700daba: Add `alignComparison` to `@oztix/roadie-core/dashboard`. It takes this period's rows, the comparison's rows, and the dashboard period, and returns this period's rows with the comparison's value under a field you name, at the same time of day. The previous period of a month, quarter, or year keeps the day of the month, so 1 March meets 1 December, and a day the earlier month lacks, such as 31 October against September, gets `null`. The previous year keeps its dates or, with `alignWeekday`, its weekdays. Weeks, days, rolling ranges, and fixed dates line up day by day from each range's start. `series` lines each series up with its own, and a day the comparison doesn't cover, or one before `dataStart`, gets `null`. Where comparison rows repeat a day and series, the first one counts. A period or comparison with times, such as the past 6 hours, gives every row `null` and warns in development.
- 8682b82: Add `comparison` to `BarChart` and the dashboard `bar` plot, so daily bars can show last period. Pass `comparison: { y, label? }`, a field on the same rows, and the chart draws it as a quiet bar to the left of each bar, both from zero, and textured apart from the bars in print and under forced colours. A legend names the two bars when there's a comparison value, and the tooltip, the Table view, and the words read out for each bar show the value. Rows that share an x add it up, like the bars. A comparison with no values, or one naming the chart's own `x` or `y`, is left out everywhere, and `validateDashboard` warns on the second.
- 1b02fc5: Add `chartDocumentSchema` and `validateChartDocument` to `@oztix/roadie-core/dashboard`, in beta. A chart document is one chart card without the dashboard around it, `{ version: 1, kind: 'chart', label, source, plot }`, with an optional headline value or takeaway, and the `table` behind the plot, which a `static` plot needs. `validateChartDocument(input)` returns `{ ok, problems }` like `validateDashboard`, runs the same plot and copy checks, with paths from the document's root such as `plot.y`, and rejects `selectsPeriod`, since a document has no period. The shape may change until the documents package agrees with it.
- 18b7674: Add `other` and `sort` to `RankedBars` and the dashboard `ranked-bars` plot. `other={false}` leaves the bars past `limit` off instead of rolling them into Other, for a label that already says "Top 5 of 40". A highlighted bar past `limit` then takes the place of the last bar that isn't highlighted, so it never drops off. `sort={false}` keeps the data's order, for categories such as age bands. `Scatter` now titles both axes with their field names, so a reader knows what each counts.
- 1ddb0e9: Update `currency` to show cents on every amount, so `formatValue(1200, 'currency')` and `currencyFormat()` read `$1,200.00`, not `$1,200`, and figures line up in charts and tables. It reaches chart tooltips, value labels, and tables, `DataTable` and record table cells, CSV exports, and the `StatTile`, `DataCard`, and `Delta` values, and a money field in another currency reads `NZD 12,500.00`. For the old reading, pass `trailingZeroDisplay: 'stripIfInteger'` to `formatValue`, a chart, a card, a `Delta`, a table column, or a record field. Axis ticks, `compactCurrency` under $1,000, and filter descriptions such as "Gross is more than $2,000" still drop the cents from whole amounts.
- b596cb6: Add `@oztix/roadie-core/number` with `currencyFormat`. It returns the `Intl.NumberFormatOptions` for money in the house style, for text and for NumberFlow's `format`: `$` for dollars and, in `en-AU`, the code for any other currency, the currency's own decimal places or `decimals` from none to four, `trailingZeroDisplay: 'stripIfInteger'` to drop the cents from a round amount, and an optional compact form, which Intl reads as `$1.2M` where `formatValue` reads `$1.2m`. Chart values, record values, and filter sentences now all read money through it, with no change to what they show, except that where they drop the cents from a round amount, one within half a cent (or half the currency's smallest unit) of it now reads `$1,200` instead of `$1,200.00`.
- ba2a0a5: Add period comparisons to dashboard charts. A line or bar card whose plot has a `comparison`, small multiples' panels too, now follows the dashboard's period, the way a delta with `comparison: true` does. It's drawn only while the period compares with Roadie's previous period, previous year or custom dates and the history isn't unavailable, and it's named by that comparison, such as "Previous period", or "Custom dates" when the dates are too long for a series label. `cardActions` gets each card as drawn, so a CSV from `cardTable(card)` matches its Table view. The portfolio example dashboard draws its daily sales this way, with the rows lined up by `alignComparison`. `validateDashboard` checks every field a small-multiples panel names, such as its `comparison`, `band`, or `line`, and warns on a line panel with both `comparison` and `series`, as it does for a line card. Like a comparison delta, a plot's `comparison` needs a period on the dashboard, and `validateDashboard` warns when an app's own comparison means it's never drawn.
- 2de86a6: Add the `is-focusable-overlay` utility, which draws the focus ring inset on an element's `::after` overlay instead of on the element. Use it on a link whose overlay covers a surface that can't show its own ring, such as a table row, so a line clamp or a clipping cell can't cut the ring. It's still an outline, from the same tokens, so forced colours keep it.
- 4775892: Add `comparison` to `LineChart` and the dashboard `line` plot, so a single series can show last period as context. Pass `comparison: { y, label? }`, a field on the same rows, and the chart draws it as a quiet line behind the series, named in the tooltip, the end label, the legend, the Table view, and the words read out for each day. A cumulative line adds it up too. With `series` set the chart leaves it out, and `validateDashboard` warns. A comparison with no values, or one naming the chart's own `x` or `y`, is left out everywhere, and `validateDashboard` warns on the second.
- 149f822: Add `plainDateParts` to `@oztix/roadie-core/datetime`, which reads an ISO date's year, month and day as numbers and throws on anything that isn't one.
- 1ddb0e9: Add `decimals` and `trailingZeroDisplay` options to `formatValue`, `formatDelta`, and `describeDelta`, as `formatValue(0.0127, 'percent', { decimals: 2 })` for `1.27%`. `decimals` fixes the places for `number`, `percent`, `points`, and `currency`, from none to four. `trailingZeroDisplay: 'stripIfInteger'` drops the decimals from a whole value, so `$1,200` instead of `$1,200.00`. Compact formats and `index` ignore both. Number and money record fields, dashboard card values and deltas, plot specs (including a bar chart's `line`), and table columns take them too, and `ValueFormatOptions` types them. `points` now says "pt" only when the value reads as 1: 1 at two places reads `1.00 pts`, and 0.96 reads `1 pt`.
- 4766b86: Add `zonedInstant` to `@oztix/roadie-core/datetime`. It turns a venue's wall-clock time and its zone into a `Date`, which every formatter and `<DateTime>` take as it is: `zonedInstant('2026-11-28T19:30', 'Australia/Brisbane')`. It takes `YYYY-MM-DDTHH:mm`, with seconds optional. Any other string, including one with an offset or `Z`, throws a `RangeError`. A time daylight saving skips moves on by the size of the jump, and a repeated time takes the first.

### Patch Changes

- b0f142f: Update `DataCard` labels to wrap to two lines, then truncate, so a chart card's title such as "Tickets sold by ticket type" fits beside the Chart/Table switch and More. Actions sit on the label's first line, so they line up across a row of cards. A `stat` label still truncates on one line, so the values in a row of stat tiles line up. `COPY_LIMITS` labels grow to 60 characters at `sm` and `md` and 72 at `lg` and `full`, `CHART_LABEL_LIMITS` to 42 and 50, and `ACTIONS_LABEL_LIMITS` to 29 and 42, so `validateDashboard` warns about a card label only past two lines. Stat labels and context lines keep their one-line limits.
- ef4073a: Fix three chart gaps found on the prototype's insights dashboards. `StackedBars` keeps an ordered category whose values are all zero or missing, such as an empty age band, as an empty slot and an empty Table row instead of dropping it, says "in every band with data" rather than "in every band" when a band is empty, and draws no legend for a single series. `Heatmap` takes its row and column order from the data, so empty cells at the start no longer reorder the axes, and a row or column with no values draws as an empty band, matching its Table view. An annotation outside a line or stacked area chart's data now warns once in development, in the same words as `validateDashboard`, instead of disappearing silently. `validateDashboard` now warns about a stacked area annotation at a time whose only rows have no value, which the chart drops. It also warns about a small multiples annotation that no panel places, such as one in a gap between panels' dates, which the chart now warns about too.
- 7258634: Fix `cn()` keeping both classes when `z-alert` meets another z-index tier, such as `cn('z-modal', 'z-alert')`, so a consumer's `z-alert` couldn't override a component's tier.
- 6652cd3: Fix `parseDatePhrase` reading nothing for days joined by a dash. `oct 22-24`, `22-24 oct`, and `1st–14th mar` now read as the days between, as `22 to 24 oct` does, so `Records.Search` suggests them too.
- d10c7ea: Fix `parseDatePhrase` offering nothing for a month name. A month name now suggests the closer of the coming and the last one, then the other, as a date with no year takes the closest. This month's name suggests this month, and "may 2027" that month. A rolling month from a date the far month lacks now ends on that month's last day, so "next 1 month" from 31 January runs to 28 February, not 27 February. The month's label follows the locale's order, "May 2026" in English and "2026年5月" in Japanese. A typed year 0 now reads nothing, so `jan 0000` and `14 jan 0000` offer no suggestion.
- 903a9c9: Fix the date formatters naming the wrong month in locales whose default calendar isn't Gregorian, such as `fa` and `ps`, which showed a Persian month beside a Gregorian day and year. They also drop Japanese's 月, so `ja` read `27 11 2026`; it now reads `27 11月 2026`.
- f744bdf: Fix `currencyFormat` caching every currency code it's given, including bad codes read from row data, so its cache could grow without limit. Number, currency and relative-time formatters now share one bounded cache, keyed by constructor like the date formatters, and `formatRelative` no longer builds a formatter on every call.
- 2e680e2: Reword prop descriptions and code comments without em dashes, so the props tables and editor hints follow the house punctuation. No behaviour changes.
- d89065e: Fix `parseRecordQuery` reading values joined by "or" as two filters. `city melb or syd` now suggests one filter, "City is in Melbourne or Sydney", first, as a chip's values OR, and `venue is not walrus or kettle` one that rules out both. Values joined by "and" still read as a filter each.
- 4766b86: `resolveDateRange` now reads a range end with no offset that daylight saving skips as the moment the clocks jump, as records filters do. Before, it moved the end on by the size of the jump. A range from 2:30am on the morning Sydney's clocks go forward now starts at 3am, so it no longer misses the half hour after the jump. A range from 2:59am to 3am no longer throws a `RangeError`. `resolveComparison` reads a previous-year start or end that lands in the gap the same way, so a year-earlier window no longer starts late.
- a30fd81: Fix two records edge cases. `formatRecordValue` keeps a range's end when a plain-date start has an end held as an instant, reading it as a date in the row's zone, where it showed the start alone. `sortRecords` sorts booleans held as `"true"` and `"false"`, as Meilisearch stores them and filters already read them, where they sorted as empty.
- 8bb10ff: Fix four records edge cases. A field keyed `constructor` or `toString` no longer matches the inherited member of a row that lacks it, and a `null` in a list no longer matches the option `"null"`. `validateRecordView` now warns of a value with an unpaired backslash before a quote or at the end, which Meilisearch can't hold and `toMeilisearch` throws on, so a Meilisearch app can catch it before query time. The view stays valid for every other backend. On a seconds index, `toMeilisearch` writes a window shorter than a second as that second instead of an empty range.
- 64ae958: Fix a table's totals row adding up fields a row inherits from its prototype. It now sums only a row's own fields, as its cells do.

## 2.12.0

### Minor Changes

- 574a12a: Add `selectsPeriod` to the `line`, `bar`, and `stacked-area` plots of a dashboard description, so a drag across that card, or Shift with an arrow key and then Enter, sets the dashboard's period. `DashboardView` passes the range to `onPeriodChange` with the current comparison, and `validateDashboard` warns when x isn't dated or there's no period. Dashboards without it don't change.
- 15435ad: Add `groupBy` and `defaultExpanded` to `DataTable`. Rows group by one or more text or status columns, outermost first. Each group gets a row that sums its number columns the way `totals` does, which opens and closes like an Accordion when anywhere on it is pressed, and every level's label sits indented in the title column, or the first column without a sum when there's no text column. Groups start closed: `defaultExpanded` opens them all, or the groups at the paths of values you give. Sorting orders groups by their sums, or by label, at every level. Dashboard `table` cards take the same two fields, `DashboardView` passes them on, and `validateDashboard` checks them.
- 6115664: Show the total of a number column that comes first in `DataTable`. The totals label, each group's label, and the grouped header now go in the title column, the pinned text column or else the first text column, as in `RecordTable`. A table with no text column puts them in the first column without a sum, so the label never covers a total. `validateDashboard` follows the same rule: it warns about a totals row only when every column has a sum, or when `values` gives one for the label's column, and about grouped rows only when there's no text column and the label's column isn't status. In core, `tableLabelIndex(columns)` finds the label's column, `tableTitleColumn(columns)` the title, and `labelColumnIndex` applies the rule to columns of another shape; `totalsLabel(count, recordName, exact)` writes "Totals for 1,234 shows", with a + after a count that's a floor.
- b15d667: Add `xFormat` to LineChart and the dashboard `line` plot, with a `daysOut` format for comparing events by days to the event. Ticks read "30d", and tooltips, tables and screen readers say "30 days before" and "Event day". Core adds `XFormat` and `formatX` to `@oztix/roadie-core/dataviz`.
- 7835e36: Add an `eventTime` x format to LineChart and the dashboard `line` plot, for comparing events on their own clock. `x` is hours from midnight starting the first event day, and a day runs to 6am. Ticks read "Day 2" and "19:00", and tooltips, tables and screen readers say "Day 2, 7:15pm". Core exports `END_OF_NIGHT_HOUR` from `@oztix/roadie-core/datetime`, the 6am cutoff that both a late show's night and an `eventTime` day share.
- 4d0f1bb: Add `toElasticsearch` on `@oztix/roadie-core/records/elasticsearch`, which turns a records request into Elasticsearch query DSL (`query`, `sort`, `from`, and `size`) that means the same as `matchesRecordQuery`. `paths` maps a field to the path filters and sort read, such as a `keyword` sub-field, and `searchFields` sets what search reads. `except` leaves out one field's chips, so a page can count that field's values against every other filter. It needs Elasticsearch 7.10 or later, or OpenSearch.
- 764944f: Add `mode`, `today` and `annotations` to StackedArea and the dashboard `stacked-area` plot. `mode='share'` stacks every time to 100%, `today` marks the top of the stack with a dot that reads the total, and annotations work as on LineChart.
- 6483954: Add `StackedArea` (`@oztix/roadie-charts/stacked-area`), a chart for part of a whole over time, such as scans by gate. The largest layer stacks at the bottom, past 6 the smallest roll into Other on top, and the tooltip opens with the total. Dashboards take it as plot kind `stacked-area`, with `/static` and `/tables` support. `ChartTooltip` rows take `shape: 'none'` for a row with no key, such as a total.

### Patch Changes

- 0e0bd9a: Fix an `is-interactive-within` surface taking the hover, press and focus ring of a nested surface's target. A `Card` around a grouped `DataTable`, linked `DataTable` rows or `RecordTable` list rows now stays still when one of those rows is hovered, pressed or focused, and a subtler card keeps its tint. A target now belongs to the nearest `is-interactive-within` around it.

## 2.11.0

### Minor Changes

- 9196e9a: Add colour variables that name the brand scales by hue, to match the brand intents. Each one is a `var()` of the scale it names, so it follows dark mode with that scale. There are no new utility classes.

  - `--color-brand-blue-0` to `--color-brand-blue-13` are `--color-brand-0` to `--color-brand-13`.
  - `--color-brand-purple-0` to `--color-brand-purple-13` are `--color-info-0` to `--color-info-13`.
  - `--color-brand-orange-0` to `--color-brand-orange-13` are `--color-brand-secondary-0` to `--color-brand-secondary-13`.
  - `--color-brand-blue-light-{5|9|12|13}`, `--color-brand-purple-light-{5|9|12|13}`, and `--color-brand-orange-light-{5|9|12|13}` are the fixed light steps of the same scales, which keep their light colour in dark mode.

- 0fe97b2: Add brand intents named by hue. `intent-brand-purple` is a new brand intent on the purple scale that `info` also uses, with white labels on its strong fill. `intent-brand-blue` and `intent-brand-orange` are aliases of `intent-brand` and `intent-brand-secondary`, which stay. Every component `intent` prop accepts `brand-blue`, `brand-orange`, and `brand-purple`, and `cn()` treats them as one intent group.

  Add a fixed `--color-{scale}-light-9` token for every scale. Like the light 0, 5, 12, and 13 steps, `.dark` doesn't override it, so brand artwork keeps its step 9 colour in dark mode.

  `text-display-prose-2` is now weight 700 (Bold), down from 800.

- 4c9bc5c: `getContrastColor` from `@oztix/roadie-core/colors` now picks white or black
  text by APCA instead of the WCAG 2 contrast ratio, following decision 0010.
  Some mid-tone backgrounds return the other colour, always `'white'` where
  they used to return `'black'`. For example, `getContrastColor('#0091EB')`
  returned `'black'` and now returns `'white'` (white measures Lc 65.7 there,
  black Lc 43.8). The shipped scales that flip are step 9 of neutral (light),
  accent, brand, danger, and info, step 10 of every scale except success and
  warning, and step 8 of info (light). Light and dark backgrounds are unchanged.
- 5e9a8bd: `@oztix/roadie-core/theme` exports `DEFAULT_ACCENT_COLOR`, so components, widgets, and apps share one default accent. Its value is `#0191eb`, the accent step 9 that tokens.css ships. `@oztix/roadie-components` re-exports it, and its value changes from `#0091EB` to `#0191eb`, one step of red apart, so the default matches the tokens. The Vue cart drawer theme reads the same constant.
- e7e4efb: Add `isUnsafeHref` to `@oztix/roadie-core/utils`. It returns true for an `href` that uses `javascript:`, `data:`, `vbscript:`, `blob:`, or `file:`, ignoring case and leading whitespace, so editors and server renderers can refuse the same links Roadie's link components do.
- d52ab01: Add `link-normal`, `link-strong`, and `link-subtle`, the text link styles
  `Link` uses, animated on hover and focus-visible with the motion tokens.
  Each includes `is-focusable`'s ring, so a bare link needs no other class.
  Every emphasis draws the same 1/16em underline. `link-normal` grows a tint up
  from it and keeps a plain underline in forced colours. `link-strong` takes its text from `--intent-link-text` and its
  underline from `--intent-border-strong`, then fills from the left with `emphasis-strong`'s
  colours after a short pause on hover, recolouring each letter as the fill
  reaches it; it falls back to plain underlined system colours in forced
  colours. In both, the underline blends into the fill as it completes, so they
  read as one shape. `link-subtle` raises its underline and fades it in, leaving
  after a short delay. Backgrounds clone per line, so a wrapped link animates on
  each one, hover only changes where a pointer can hover, and reduced motion
  jumps to the end state. `normal` and `subtle` are accent unless the element
  has its own intent class, which sets the non-inheriting `--intent-link-own`
  (neutral's own grey for `intent-neutral`);
  `strong` follows the surrounding intent, neutral included. `.prose` links use
  `link-normal`, motion included, and `cn()` lets one link style replace
  another.
- bf0ec67: Add the `.prose` class, which typesets raw HTML from a CMS, Markdown, or MDX:
  headings, paragraphs, lists, tables, code, quotes, rules, figures, and keys.
  It caps each direct child at a 65ch measure, spaces blocks from one
  `--prose-flow` variable, and draws every colour from intent tokens. The flow
  is a registered length that resolves once, at the body size, so the space
  around a heading follows the body text rather than the heading's size. Add
  `.prose-bleed` to a child to lift the measure, wrap a wide table in
  `.prose-scroll` to scroll it, and use `.not-prose` or `data-not-prose` to opt a
  subtree out. Each column of a table in `.prose-scroll` stays at least 9em
  wide, so the table scrolls rather than squeezing its text, and a long cell
  wraps at the measure. The `--prose-*` variables adjust size, leading, rhythm,
  measure, and heading sizes and weights.

  The `Prose` component in `@oztix/roadie-components` moves onto it in this
  release; its release note lists what changes on the page.

- 54c87b2: Add `@oztix/roadie-core/records`, the model behind Roadie's record lists: fields, saved views, and the request a server reads, as plain TypeScript.

  - `recordFields<Row>()` builds an entity's `RecordField`s with typed row keys: `text`, `option`, `location`, `number`, `money`, `date`, and `boolean`. A field says how it filters, sorts, and searches, how its dates compare (`event`, `access`, `timestamp`, or `date`), and its currency or format. A `location` field's places nest by `parent`, so is and is not mean is in and is not in.
  - A `RecordView` saves a search, filters, sort, and layout as JSON under a `version`. `validateRecordView` checks one against its fields, and `equalRecordViews` tells whether one was modified.
  - `resolveRecordQuery` fixes relative dates at a moment. `matchesRecordQuery` and `compileRecordQuery` filter rows in the browser, `sortRecords` sorts them, and `formatRecordValue` and `describeRecordFilter` write values and chips as a table shows them.
  - `parseRecordQuery` reads typed text, such as "melb this weekend", "not sold out", or "capacity > 100", into ranked suggestions for `QueryField`.
  - `recordViewToSearchParams` and `recordViewFromSearchParams` write and read a view and position as a versioned URL.
  - A server reads a `RecordsRequest`, never a view: the query with relative dates fixed, the page's scope first, and its paging. `toRecordsRequest` builds one. `@oztix/roadie-core/records/json-schema`, `records/records-request.schema.json`, and `records/record-view.schema.json` give its JSON Schema, for servers that generate models.
  - `@oztix/roadie-core/records/meilisearch` exports `toMeilisearch`, which turns a request into Meilisearch `q`, `filter`, `sort`, and paging. It needs Meilisearch 1.15 or later.
  - `recordsToCsv` writes records as CSV and neutralises formula-like text. `recordPlaces` and `recordPlaceReader` list a record's places for a search index.

  `RECORD_VIEW_VERSION`, `RECORD_URL_VERSION`, and `RECORDS_REQUEST_VERSION` name the three formats.

- 1336d18: Dark mode chart colours now meet APCA Lc 45 against the page, the minimum for
  non-text UI in decision 0010. `--chart-3` turns pale teal, `--chart-5`
  lightens, `--chart-7` mutes to a dusty rose so it stays clear of
  `--chart-status-critical`, `--chart-2` darkens a little, and `--chart-1` and
  `--chart-6` shift slightly. The dark `--chart-highlight` follows slot 1.
  `--chart-context` and `--chart-other` mix toward neutral step 11 in dark mode,
  so they're easier to see. Browsers without `color-mix` get a fixed hex.

  `validatePalette()` measures the `darkMarkContrast` and `darkGreyContrast`
  checks as APCA Lc, with a target of 45 instead of a 3:1 ratio, so their
  `score` and `target` read in Lc. `chartHex('dark')` returns the new values,
  and `paletteScores().dark.slotsUnderLc45` is now empty. In `palette.greys`,
  the dark context and other greys move to step 10 with a new optional `mix`
  toward step 11, so read them with `chartHex()` rather than the step alone.
  Light mode is unchanged.

- 7fe7954: Dark mode delta text now meets APCA Lc 60 on a data card, the tier decision
  0010 sets for delta text. Two dark status colours change, so `Delta`, and any
  chart mark or text that uses them, looks different in dark mode:

  - `--chart-status-good` follows `--color-success-11` instead of
    `--color-success-9`, a lighter aqua (Lc 81.0, was 57.4).
  - `--chart-status-critical` is a fixed `oklch(0.798 0.116 20)`, a lighter coral
    red (Lc 63.3, was 47.5), instead of following `--color-danger-9`.

  `chartHex('dark')` and `palette.status` return the new values. Light mode and
  the warning and serious statuses are unchanged.

- 0b234a4: Update dark mode so raised and floating surfaces, fields, and neutral borders
  stand out more, since shadows barely show on a dark page. Light mode is
  unchanged.

  - Neutral `bg-raised` and `emphasis-raised` move from step 3 to step 4.
  - A new `--intent-bg-floating` variable holds the floating fill: the raised
    fill in light mode, lifted 20% toward step 9 in dark mode.
    `emphasis-floating` uses it, and so does an `emphasis-raised` surface inside
    another raised one, such as a selected tab or a search field in a `Pane`.
    A raised surface inside a floating one lifts 20% again.
  - On dark raised and floating surfaces, `text-subtle` moves 40% toward step 12,
    so it keeps APCA Lc 75 on the lighter fills, and so does an intent set
    inside one.
  - `emphasis-subtle`, `emphasis-subtler`, `bg-subtle`, `bg-subtler`, and their
    hover and pressed tints mix more of step 9 in dark mode, so a subtle surface
    stands off the page in every intent: subtle is 18% for neutral, 15% for
    brand and accent, 13% for danger and info, and 12% for success, with the
    rest of each ladder in proportion. Warning and brand-secondary keep theirs.
  - An `emphasis-subtle` track with an `emphasis-raised` pill in it, such as the
    `Tabs` list at its default emphasis, takes the sunken fill in dark mode, so
    the chosen tab stands out from its track.
  - Neutral `border-subtle`, `border-normal`, and `border-strong` move one step
    lighter, to neutral steps 7, 8, and 10. `border-subtler` and the other
    intents keep their steps. Anything drawn with them, such as
    `emphasis-normal` cards, table headers, separators, and chart axes, is a
    little lighter.
  - `emphasis-field` keeps its sunken fill, with its edge at 50% of step 9 in
    dark mode instead of 22%, so the field shows on the page.

- 99111f3: Dashboards gain a period and a comparison.

  `@oztix/roadie-core/dashboard`: a description can carry `period: { range,
  compare?, history? }` (`DashboardPeriodSpec`), where `range` is a
  `DateRangeValue`, `compare` a `Comparison` or the app's own, such as
  `'similar'`, and `history` what `resolveComparison` said about the data. A
  delta marked `comparison: true` follows it. `validateDashboard` checks the
  period, and rejects a comparison delta on a dashboard with no period.

  `@oztix/roadie-components`: add `DashboardPeriod`
  (`@oztix/roadie-components/dashboard-period`), one `DateRangePicker` button
  that shows the period and the dates it compares with. Under the range, a
  Compare switch turns the comparison on, and a toggle group picks previous
  period, previous year, custom dates, or the app's own options from
  `compareOptions`. Apply sends both together. Its value is
  `DashboardPeriodValue`, `{ range, compare? }`, and its presets default to
  `dashboardPeriodPresets`. `dataStart`, `dataEnd`, and `alignWeekday` match the
  app's `resolveComparison`, so the comparison shows the dates the app fetches.
  It's a large control, 48px tall, so pair it with large Buttons and Selects.

  `@oztix/roadie-charts`: `DashboardView` shows a description's `period` above its
  sections, and `onPeriodChange` receives the new `{ range, compare? }`; without
  it the period shows read-only. `periodProps` (`DashboardViewPeriodProps`)
  passes the toolbar's other props. A delta marked `comparison: true` names the
  comparison on its context line, such as "vs previous period", and gives way to
  "Not enough history" or "Nothing to compare" when the period's `history` says
  so.

- ff2f04d: `DataTable` takes a totals row with `totals`, rendered in a new `Table.Foot`:
  strong text over a rule, its label in the first column as a row header. `true`
  or `'sum'` adds up the number columns over every row, labelled "Totals for 12
  records", or the `recordName` you pass. Shares, indexes, points and columns with
  `total: false` stay blank, and currency sums round to the cent. Give
  `{ label, values }` to show your own figures, such as the server's totals for a
  paged report or an average; with `values`, nothing is summed, and without a
  label the row reads "Totals". The first column holds the label, so it never
  hides while the totals show. `DataTableTotals` types the prop, `true`
  included, and `tableCellClass(align)` gives a body cell's classes, for a `th`
  that heads a row.

  A dashboard table card takes the same `totals`, and columns take `total: false`.
  `validateDashboard` checks them: values need a label and must name a column,
  `'sum'` warns when there's nothing to sum, and either warns when the first
  column, which holds the label, has a total that would never show.
  `cardTable(card)` returns the totals summed, and a `Chart` table view shows a
  `ChartTable`'s totals. In core,
  `resolveTableTotals(columns, rows, totals)`, `isSummable(column)` and the
  `RecordName` and `ResolvedTotals` types come from
  `@oztix/roadie-core/dashboard` and the Zod-free `/dashboard-layout`.

- 156ca60: `validatePalette` now checks every pair of categorical slots for normal vision,
  not just neighbours, and fails any pair under ΔE 8 as `allPairsNormal`.
  `paletteScores` gains an `allPairsNormal` field with the closest pair in each
  mode: 17.2 in light and 8.5 in dark (slots 1 and 8). No colours change.
- f57dfba: Add date ranges and typed date phrases to `@oztix/roadie-core/datetime`.

  - A `DateRangeValue` is two inclusive ends or a `RelativeRange` with one fixed meaning, such as today, this weekend, the next 7 days, month to date, or this financial year. Each meaning has one form, which `canonicalDateRange` writes: `{ period: 'month', offset: -1 }` becomes `'last-month'`.
  - `resolveDateRange` works out what a range covers on a given day in a given zone, and `describeDateRange` returns the words to show and the dates they stand for.
  - `resolveComparison` finds the previous period or previous year to compare with, by date or, with `alignWeekday`, by weekday. Given the data's `dataStart` and `dataEnd`, it says whether the data covers the comparison: `partial` or `unavailable`. `describeComparison` writes the context line under a delta, and `Comparison<App>` adds an app's own comparison, such as `'similar'`.
  - `parseDatePhrase` turns typed text, such as "this weekend", "next 7 days", "14 mar", "1/12", "Fri 27 Nov 2026", "after 1 dec", or "7:30pm", into ranked suggestions with explicit values.
  - Plain-date helpers come with it: `plainDateOf`, `addDays`, `addMonths`, `compareDates`, `dayOfWeek`, `startOfWeek`, and `monthGrid`, plus the `isAbsoluteRange`, `isRollingRange`, and `isPeriodRange` guards.

- 94c5e81: Shadows and the loading shimmer now tint by the nearest intent, as the Elevation and Skeleton docs describe. The `shadow-*` and `inset-shadow-*` utilities, the `--shadow-*` and `--inset-shadow-*` tokens, and `emphasis-raised`, `emphasis-floating`, `emphasis-sunken`, and `emphasis-field` take the hue of the closest `intent-*` class, on the surface or any ancestor, in light and dark mode. So do `animate-shimmer` and the `--sheen-shade` and `--sheen-highlight` tokens, which Skeleton uses. Before, they all kept the root intent everywhere. A raised card inside `intent-danger` now casts a faintly red shadow.

  To keep a neutral shadow inside another intent, add `intent-neutral` to the surface or a wrapper. That also resets its fill and text to neutral. Browsers without `oklch()` keep the untinted fallback shadow, as before.

  The dark mode and `oklch()` declarations of the shadow, rim light, and sheen tokens now sit in the `base` layer rather than outside any layer. A `--shadow-*` value you set on an element, with a utility or unlayered CSS, still wins there. One you set on an ancestor is reset at each element below it whose class contains `intent-`, as the other intent tokens are at each `intent-*` element.

- c324014: Add `is-focusable`, the focus ring of `is-interactive` with no pointer cursor, press, or disabled state, for an element that takes focus but isn't clicked, such as a scroll region or a `tabIndex={-1}` landing target. Its ring comes from `--focus-ring-width`, `--focus-ring-opacity`, and `--focus-ring-opacity-dark`, so it matches every other Roadie ring. `is-interactive` is now built on it, so the two compose on one element. The reset's native focus ring is unchanged.
- 0a72e40: Every focus ring now has the same shape: 4px wide with no gap, from the `--focus-ring-width`, `--focus-ring-opacity`, and `--focus-ring-opacity-dark` tokens. Plain links and buttons with no Roadie class, such as links in CMS content, now get a 4px ring with no gap, where they had a 2px ring with a 2px gap. The ring's colour is unchanged: it still follows the nearest intent, and fields still use accent, or danger when invalid.

  Components that drew their own ring now use the base ring, so they follow the nearest intent too: a focused chart plot, Toast, and ScrollArea's viewport. The bare NumberField stepper's ring loses its 2px gap. ScrollArea's viewport and the `subtler` Tabs keep the ring inset by its width so their container doesn't clip it.

- 83e9966: `paletteScores()` from `@oztix/roadie-core/dataviz` measures low-contrast
  slots with APCA. The new `slotsUnderLc45` field lists the categorical slots
  under Lc 45, APCA's minimum for non-text UI, against each mode's page
  surface. The old `lightSlotsUnder3` field is deprecated and now returns the
  same slots: light mode goes from 2, 4, 6, and 8 to 4 and 8, and dark mode
  from none to 3, 5, and 7. `validatePalette()` is unchanged.
- e3b095a: Each package now ships `roadie.manifest.json`, a machine-readable catalogue for coding agents and tools. Import it from `@oztix/roadie-core/roadie.manifest.json`, `@oztix/roadie-components/roadie.manifest.json`, or `@oztix/roadie-charts/roadie.manifest.json`. It lists every export path with the values and types it exports, every component with its props in the order its source declares them, compound parts, and, where it has them, its docs page and first live example, every deprecated export and prop with its replacement, and, in core, the design tokens. The build generates it from the same source it publishes, so it always matches the installed version.
- a9a6b8a: Add selection utilities, so a set of choices takes its label colours from the system rather than from each component. `is-unselected` marks an unchosen item: subtle text that lifts to normal text on hover. `is-selected-label` and `is-selected-label-on-strong` give a chosen item the label of `is-selected` or `emphasis-strong` when an indicator behind it draws the fill.

  `Toggle`, `ToggleGroup` and `Tabs` now compose these utilities. An unpressed `subtler` `Toggle` now lifts its label to normal text on hover, as `ToggleGroup` and `Tabs` items already did. A `text-*` class passed to a subtler `Toggle`, a `ToggleGroup` item or a tab no longer changes its label colour, because these utilities now set it.

- ff2f04d: Tables take a `status` column kind. The value is a status key, and the column's
  `status` map gives each key an intent and an optional label, which defaults to
  the key in sentence case, so `on_sale` reads "On sale". A key the map lacks
  shows as neutral, in its raw text.

  `DataTable` shows it as a small `Badge` in normal emphasis, or as the label in
  a `plain` table. It sorts by label, or by each key's `order` when the map gives
  one, with keys that have no order last. An empty status shows the column's
  `emptyText` and sorts last. A `secondaryKey` adds a line under the badge, or
  under the label in a `plain` table, styled and wrapped as it is on a text
  column. An empty secondary value adds no line, on either kind.

  In core, `TableColumn` takes `kind: 'status'` and `status`, and
  `validateDashboard` rejects an unknown intent and warns about keys a map lacks.
  `columnStatus(column, key)` resolves a key's intent and label, and
  `cellText(column, value)` gives any cell as the plain text its table shows,
  and `humaniseStatus(key)` gives a key's default label. They come with the
  `STATUS_INTENTS`, `StatusIntent`, `TableStatus` and `ResolvedStatus` types, and
  also from the Zod-free `@oztix/roadie-core/dashboard-layout`. A `status` map on
  a column of another kind gets a warning, as does a `secondaryKey` on a column
  that is neither text nor status. `COLUMN_KINDS` gains `'status'`, so an
  exhaustive `switch` over a column's `kind` needs a case for it.

- fad898f: A nested `ThemeProvider` scopes its accent to its own subtree. It sets `--accent-hue` and `--accent-chroma` on a `display: contents` wrapper marked `data-accent-scope`, which renders on the server too, and Roadie's CSS declares the accent and neutral scales, the default intent, the shadows, and the chart ink again on that wrapper. Before, a nested provider wrote its accent to `:root`: it lost to the root's on a cold load, took over the whole page when it mounted later, and kept the page on its accent after it unmounted. Now the root's accent stays on everything outside the nested provider, and the portals of `Dialog`, `Drawer`, `Popover`, `Menu`, `Tooltip`, `Select`, `Combobox`, and `Autocomplete` carry the nested accent to popups that open from inside it. A parent's selectors for its direct children, such as `*:` variants, now see the wrapper instead of the nested provider's children. A nested provider's subtree starts at the neutral intent, and browsers without OKLCH keep the root's accent inside it. A nested provider with `accentColor={null}`, no accent, or an invalid one, and no `defaultAccentColor`, inherits the accent around it, whether the root's or an enclosing nested provider's, and so do its popups. It sets no scope, so its subtree also keeps the intent around it, and the subtree doesn't remount when an accent arrives. The root provider still falls back to Oztix blue.

  The root provider keeps a server-injected accent style that already holds its accent (from `getAccentStyleSync`, `getAccentStyleTagSync`, or `getBootstrapScript`) instead of rewriting it on hydration, and writes the accent in the same form. `RoadieProvider`'s warning for a `RoadieProvider` inside a `ThemeProvider` now says the inner theme is scoped to its subtree.

  Update `@oztix/roadie-core` together with `@oztix/roadie-components`, since the wrapper needs core's scoped selectors to change the scales.

### Patch Changes

- ddcad84: Buttons now follow their parent's alignment. The `btn` utility set
  `place-self: start`, which overrode a flex row's `items-center` and a grid's
  `justify-items`, so every `Button`, `IconButton` and `Toggle` in a taller row
  sat at the top. It now sets `width: fit-content` instead. With a size class
  (every `Button`, `IconButton` and `Toggle` has one), a button keeps its own
  size in a grid cell or a flex column and takes the row's `align-items`
  (including `items-baseline` and `items-end`), a grid's `justify-items`, or a
  flex column's `items-center`, as in a horizontal `Card`'s side-column footer.

  To widen a button, use `w-full`. `self-stretch`, `justify-self-stretch` and
  `place-self-stretch` no longer widen it. To undo `w-full` at a breakpoint, use
  `w-fit` rather than `w-auto`, which now lets a grid or flex column stretch it.
  If you load `@oztix/roadie-core/css/compiled` beside your own Tailwind build,
  import it before your utilities so `w-*` on a button still wins.

- e2007ba: `CalendarTile` no longer puts its month or weekday in capitals, because the
  writing rule keeps all caps for acronyms. The tile shows `Nov`, not `NOV`, and
  the band drops the wide letter spacing that only suited capitals.

  Mixed case reads smaller than capitals, so the band's text is one size bigger
  and still scales with the tile: 10px at `sm` (was 9px), `text-xs` (12px) at
  `md` (was 10px), and `text-sm` (14px) at `lg` (was 11px). The band also has a
  set height, about a third of the tile: 14px at `sm`, 16px at `md`, and 18px at
  `lg`, with 2px of vertical padding and the text centred.

  The `calendar-tile-top` utility changes the same way. The React tile now uses
  that utility for its band, and marks its size with `data-size`, so the two
  render an identical band.

  `formatGlyph` now returns `month` and `weekday` as the locale abbreviates them
  (`Nov` and `Fri` in English) rather than uppercased. Some locales abbreviate
  in lowercase, such as `nov.` in French, and the tile shows that as given. If
  you pass your own strings, pass them in sentence case.

- cc39346: `cn()` treats `ease-spring-lively` and every Roadie `animate-*` utility (`animate-fade-in`, `-scale-in`, `-pop-in`, `-shake`, `-nudge`, `-pop`, and `-pop-tap`) as one group each, so a later easing or animation class replaces an earlier one instead of both staying.
- 9596020: A raised or floating surface inside a field group, such as a toolbar in an editor, keeps its rim light while the field is hovered, focused, or invalid. Before, the field cleared the rim for everything inside it, not just its own.
- e7e4efb: `isUnsafeHref`, and so every Roadie link component, now catches unsafe links hidden with a tab, line break, or control character, such as `java\tscript:` or a leading null character. Browsers ignore those characters and would still run the link.
- b74a7bd: Requires `zod` 4.6.7, which fixes a denial-of-service issue in 4.6.5.
- c09a86a: Date formatting reuses its `Intl.DateTimeFormat` instances, and `formatValue`
  reuses its `Intl.NumberFormat` instances. Each formatted date used to build
  three to five new formatters, which dominated the cost of tables and lists
  that show a date on every row. The date cache holds at most 200 formatters
  and drops the oldest first, so many locales or time zones cannot grow it
  without limit.
- eb8cb85: Large pages in Chromium no longer restyle every element when something small
  changes, such as opening a menu, ticking a row, hovering a list row, or typing
  in a search. On a large page inside `Navigator` or `Pane` that took up to 3
  seconds of style work at 4x CPU. The styles for `List` dividers and contained
  rows, `Navigator.Brand` and `Navigator.Item`, the ticket `Card` fill, the
  disabled `Switch` label, `DataTable`'s Show all columns, and
  `is-interactive-within` now select only what they style. Nothing looks
  different.

  `listItemVariants()` now carries the classes that square a row inside a
  contained `List`, so a custom row built from it still matches `List.Item`.

- 60bebfd: `text-subtle` now meets APCA Lc 75 for body text on every intent, in light and
  dark mode, on the neutral surfaces and on the intent's own, including its subtle
  fill. For accent this holds at the default accent hue.

  - **Light mode:** step 11 is darker on brand and accent (oklch L 0.547 to
    0.431), brand-secondary (0.569 to 0.463), danger (0.569 to 0.445), success
    (0.508 to 0.44), warning (0.576 to 0.465) and info (0.505 to 0.457).
  - **Dark mode:** step 11 is lighter on every intent but neutral, and step 12
    is lighter on brand, brand-secondary, accent, danger, success and info (L 0.90
    to 0.91, now 0.95, the same as neutral). That changes `text-normal` in those
    intents in dark mode, so subtle text can reach Lc 75 and still read a step
    quieter than normal text. Step 13 rises on brand, brand-secondary, accent,
    danger, success and info (L 0.96 to 0.99; 0.993 on brand and accent, 0.997 on
    success), so `text-strong` stays distinct from the lighter `text-normal`.

  Everything else on those steps moves with them: `--intent-11`, `--intent-12` and
  `--intent-13`, `bg-inverted` and `border-inverted` in dark mode, the light
  strong fill's hover on brand, accent, danger and info, the dark strong fill's
  hover and pressed states on browsers without `color-mix`, and the light chart
  status colours for good, warning and serious. `--chart-status-critical` no
  longer follows danger step 11 in light mode; it keeps its value.

- d72d07b: Example data uses invented venue, event and promoter names from the contributing guide's vetted list, so no example reads as a real Oztix client. Affects the chart examples from `@oztix/roadie-charts/examples` and JSDoc in core records and QueryField.
- 8b5de45: The token manifest lists the `color-mix()` strong fills that brand-secondary, success, and warning render, in both modes, instead of the plain steps meant only for browsers without `color-mix()`. Multi-line values also lose the spaces their line breaks left inside parentheses.
- 0c67df7: The token manifest gives the chart ink tokens (`--chart-grid`, `--chart-axis`, `--chart-label`, `--chart-value`, and `--chart-gap`) a light value as well as a dark one, and lists `--chart-highlight`'s `oklch()` value in light mode, with the hex as its fallback. A rule on a selector list such as `:root, .dark` now counts for both modes.
- 853d76c: Add each component's status to `roadie.manifest.json` even when another page documents it, such as `CheckboxGroup` on the Checkbox page or `Records` on Records model, and add `docs` and `status` to core's records subpaths. Status is one of `alpha`, `beta`, `stable`, or `deprecated`, as the docs define them: alpha can break in a minor release, beta is settling and marks a breaking change as Breaking, stable follows semver, and deprecated is being removed. Many long-standing components are now `stable`, and `RecordTable`, `RecordGrid`, `QueryField`, and the records model are `alpha`.
- 230a991: `DateTime` no longer reads the clock while rendering on the server, so it
  prerenders under Next's `cacheComponents` without a `Suspense` boundary,
  including as a `Suspense` fallback.

  The date formatters read the clock only when the words depend on it: a
  standalone date's year, or relative text. A `DateTime` with
  `context='standalone'` renders its year on the server, then drops it after
  mount when the date is in the current year. Client-rendered output is
  unchanged.

- fe925b2: `emphasis-overlay` and `emphasis-overlay-subtle` now take a fixed white label,
  like their fixed dark fill. In dark mode they took the page's flipped text
  colour, which is dark on that fill.
- ed68775: `em`, `i`, and `cite` inside `.prose` (and so `Prose`) now show
  in Intermission's italic face. Before, the reset's `font-style: normal` on every
  element left emphasis upright. This changes `.prose` output: CMS or markdown
  content with emphasis now renders italic. Outside `.prose`, and in `.not-prose`,
  these elements stay upright as before.
- ba7ede5: The reduced-motion reset now sets `animation-delay` and `transition-delay` to
  `0s` on every element and its `::before` and `::after`, as well as shortening
  durations. For a user who prefers reduced motion, a staggered list or any other
  delayed CSS animation or transition now starts at once instead of waiting out
  its delay. Delays timed in JavaScript, such as Tooltip's `delay`, still wait.
- 1ae382b: `text-subtle` on the neutral intent now meets APCA Lc 75 for body text. The
  neutral scale's step 11 (`--color-neutral-11`) is darker in light mode
  (oklch L 0.503 to 0.45) and lighter in dark mode (0.769 to 0.87), so
  secondary copy, placeholders and weekday labels read at Lc 75 or more on the
  neutral surfaces. It stays lighter than `text-normal` (step 12).

  Everything else on neutral step 11 moves with it: the neutral strong fill's
  hover, `--intent-11`, chart labels and axis text, and the dark chart band.

## 2.10.0

### Minor Changes

- 97854ae: Add `Collapsible`, a single panel that a trigger shows and hides.
  `Collapsible.Trigger` shows a trailing caret that turns when open (`showCaret={false}`
  hides it) and renders onto a Roadie `Button` through `render`.
  `Collapsible.Panel` passes `keepMounted` and `hiddenUntilFound` through.
  `Collapsible.Text`, placed inside a `Collapsible`, clamps a paragraph to `lines` (3 by default) and ends the
  last line with an inline "…more" that fades the text behind it. The trigger shows
  only when the text overflows; `lessLabel={null}` makes it expand only. The
  `Collapsible` root now owns the open state and shares it with its parts.

  `is-disclosure-animated` now also animates Base UI panels that aren't `<details>`,
  by height from `--collapsible-panel-height`.

- 200dbed: Add dashboard support. `@oztix/roadie-core/dashboard` describes a dashboard as
  JSON, with a Zod schema, a JSON Schema export for tool inputs, and
  `validateDashboard`, which reports every problem with its path, including rows
  that leave gaps, copy that will truncate, and unknown keys. A zod-free
  `@oztix/roadie-core/dashboard-layout` subpath exposes the card sizes, spans,
  tracks, `findRowGaps` and `COPY_LIMITS` for UI code that must not load Zod.
  `@oztix/roadie-core/dataviz` gains `formatValue` and delta helpers in the
  house number formats, and `chartHex` now returns chrome colours for static
  renderers. Chart ink now follows nested `.dark` and `intent-*` sections, the
  highlight's hex fallback uses the default accent hue, and chart marks get
  texture patterns under forced colours and print.
- b4ca530: Add data visualisation colours. Charts get `--chart-1` to `--chart-8` for
  series, `--chart-heat-*` for amounts, `--chart-diverge-*` for ahead of or
  behind a benchmark, `--chart-status-*` for meaning, and `--chart-highlight`,
  which follows `--accent-hue`. Each comes with `bg-`, `fill-`, `stroke-` and
  `text-chart-*` utilities, in light and dark. Canvas, SVG and PDF renderers can
  read the same values as hex from `@oztix/roadie-core/dataviz`, with the greys
  tinted by the accent hue as the CSS ones are, and
  `chartColorVar(i)` gives a CSS variable when the slot is dynamic. The palette
  is checked for colour-blind separation in CI.
- e0371c6: Nine chart types for event and ticketing insights, built on TanStack Charts:
  `LineChart` (with band, median, forecast, target, today and annotations),
  `BarChart`, `RankedBars`, `StackedBars`, `Histogram`, `Funnel`, `Heatmap`,
  `Scatter` and `SmallMultiples`. Each renders live with Roadie tokens, on the
  server, and as standalone SVG through `renderChartSvg` in
  `@oztix/roadie-charts/static`, which also exports each chart's definition.
  Each chart's Table view rows come from `@oztix/roadie-charts/tables`, which a
  server can call without the chart engine. A chart inside a `Chart` card now
  supplies the card's table and summary, so `table` is optional, and a chart
  that can't draw puts its card in the error state.

  The `Chart` card's Chart and Table switch is now an icon-only `ToggleGroup`,
  because both are views of the same data. Each item is a button with
  `aria-pressed` and `aria-controls`, and the hidden view is `inert` but keeps its
  box, so the card height holds across the switch. There are no `tab` or
  `tabpanel` roles any more. `ToggleGroup` keeps focus on the item you left when
  the window regains focus, instead of moving it to the pressed item.

  Cards take actions at the top right. `Chart` has an `actions` prop that sits
  after the Chart and Table switch, and `DashboardView` has a `cardActions` render
  prop that adds actions to every card kind described as data.
  `DataCard.MoreButton` is the More button that ends a card's actions. It passes
  its props and ref through, so it is the trigger of the card's `Menu`, passed to
  `Menu.Trigger` as its `render`. `@oztix/roadie-charts/tables` adds `plotTable`,
  the Table view rows for any chart plot in a dashboard description, and
  `cardTable`, the table behind any card, for actions such as Download CSV.
  `DataCard` now shows its actions in every state, so a refresh works on a card
  that failed to load; `Chart` hides only its view switch without data. Repeated
  `BarChart` x values add up their bars, and the `line` keeps the first value it
  has.

  In core, a chart card's `plot` accepts every chart kind, each with its own
  schema exported from `@oztix/roadie-core/dashboard`, and `validateDashboard`
  checks plot fields, annotations outside the data and repeated names. A legend
  item takes `median: true` to draw a dashed median through a `band` key, in
  `ChartLegend` and in a dashboard description alike, and `validateDashboard`
  warns when a median sits on any other shape. `parseWallTime` in
  `@oztix/roadie-core/dataviz` reads an ISO string as venue wall time, and
  `isWallTime` says whether a value is one. Both accept a space in place of the
  `T`, as in `2026-11-14 19:30`, read the whole string and refuse a date that
  doesn't exist, such as 31 February. `--chart-highlight` now follows nested
  accent, dark and intent sections. Inline `code` no longer splits a short name
  across lines; it breaks mid-token only when the token can't fit a line.

- 6ec114f: Add `Progress`, a bar for a task underway.
  `<Progress value={40} label='Uploading' />` renders the label, the value and
  the track; `valueText` swaps the percentage for text such as "120 of 400" and
  reads it to screen readers. Pass `value={null}` while the length is unknown
  and the bar sweeps across the track. The parts (`Label`, `Value`, `Track`,
  `Indicator`) compose for custom layouts. The fill is the accent by default,
  like `Meter`, and takes the intent when you pass `intent`, such as `success`
  or `danger` once a task has ended. Core gains the `animate-indeterminate`
  utility behind the sweep, which holds a still, soft bar under reduced motion.
- b67cf46: Add `text-on-strong` (`--intent-text-on-strong`), the label colour for strong
  fills. Each intent takes whichever text colour reads better on its fill, and
  reaches APCA Lc 60 in both modes, at rest, on hover and when pressed, in
  browsers that support `color-mix()`. `emphasis-strong`, CalendarTile's strong
  band, and the strong Tabs and ToggleGroup pills use it.

  - White on brand, accent, info and danger, in both modes. Danger's strong fill
    moves one step deeper, to step 10. In dark mode, hover and press darken the
    fill to steps 8 and 7.
  - Dark text on success, warning and brand-secondary: step 13 in light mode, step
    0 in dark mode. Success and brand-secondary lift their fill 10% toward white.
    Hover and press lighten the fill further in both modes.

  `text-inverted` is unchanged: it's still the page's text colour flipped, and
  pairs with `bg-inverted`. To migrate, use `text-on-strong` for labels on
  `bg-strong` or `emphasis-strong` fills where you used `text-inverted`.

  A custom accent keeps its white text too. The new `getAccentChromaSync(hex)`
  caps an accent's chroma to what sRGB can show at step 9, because browsers clip
  a more saturated fill and the clip makes it lighter. `getBootstrapScript` and
  `generateAccentScale`, which writes the hex fallback scale, now use it, so a
  saturated green or cyan accent no longer renders too light.

  Browsers that draw `oklch()` but not `color-mix()` (Safari 15.4 to 16.1) get
  step 9 for the lifted strong fills and steps 7 and 6 for hover and press, so
  the fills stay solid there. Success and brand-secondary read at about Lc 57 to
  58 at rest in those browsers.

  `generateAccentScale` now reports `fgOnStrong` by APCA, so it matches
  `text-on-strong`: `white` for Oztix blue, where it used to say `black`. It also
  no longer lifts a grey accent to chroma 0.1, so the hex fallback matches the
  CSS.

  White labels on brand, accent, info and danger are 3.2 to 3.5:1 by WCAG 2. That
  meets 3:1, not the 4.5:1 WCAG 2 asks of normal-size text. The accessibility
  page now names strong-fill labels as the APCA exception.

  Hover and press use the new `--intent-bg-strong-hover` and
  `--intent-bg-strong-active` tokens. Neutral is unchanged.

  This is a minor bump because it adds a utility and tokens, and some strong fills
  and their label colours change.

- e0371c6: Make the selected item of a `subtler` `Toggle` or `ToggleGroup` easier to see.
  A pressed `subtler` toggle or group item now takes a soft fill with no border
  and a strong icon or label. The fill alone stays under 3:1 against the
  surface, so the fill and the icon carry the state together: use `subtler` for
  quiet controls, and `subtle` or `normal` when the state must stand out. On the
  unpressed side, a `subtler` `Toggle` now rests in subtle text rather than
  normal text, like the items of a group. Core adds the `is-selected` utility
  that carries this look, with a system highlight edge under forced colours.
  The `subtler` `Tabs` underline keeps its look and now takes the highlight
  colour under forced colours, where it used to disappear. The chart card's
  Chart and Table switch moves up to `md`, so each item is 32px, the size of the
  card's More button.
- 47c7147: Add `Toast`, a brief message that confirms an action or reports its result.
  Mount `Toast.Provider` with a `Toast.Viewport` once at the app root, then call
  `useToastManager().add({ title, description, intent, actionProps })` from any
  component, or `createToastManager()` from outside React. `intent` (`success`,
  `danger`, `warning` or `info`) colours the toast and leads it with a matching
  icon, `actionProps` adds a small button such as Undo or Retry, and `promise`
  shows a spinner until the work settles. A thin `Toast.Progress` bar along the
  bottom of timed toasts shows how long they have left, pausing whenever their
  timer pauses (hover, focus, a background window). `Toast.Viewport` takes a `position`
  (`bottom-end` by default, `bottom-center`, `top-end` or `top-center`); small
  screens always span the chosen edge. Set `--toast-viewport-offset-bottom` (or
  `-top`) to clear fixed UI such as a checkout bar. Toasts fan out on hover or
  focus and swipe away towards their edge. Core adds the `motion-toast` utility
  that stacks and animates them from either edge: toasts enter, restack and
  snap back on a spring and leave quickly. Core also adds `--ease-spring-lively`,
  a spring with a visible bounce (about 9% overshoot) for transforms that should
  catch the eye.

  The `@base-ui/react` peer range rises to `^1.8.0`. Toast relies on 1.8 for
  `update(id, previous => …)` and for timers that keep their remaining time
  across repeated pauses, which the progress bar follows.

### Patch Changes

- f898797: Emphasis and field hover states now only apply on devices that can hover. On a
  touch screen the last button tapped kept its hover colour and lift, so it looked
  stuck or half disabled until something else was tapped. A tapped raised field
  also keeps its rim light, and a translucent field stays see-through. Focus and
  press states are unchanged.

## 2.9.0

### Minor Changes

- dba660b: Add `is-interactive-within`, for a surface whose main link sits inside it,
  such as a card that also holds other actions. Mark the link with
  `data-interactive-target`. Its overlay covers the surface, so a click anywhere
  follows it, and other links, buttons and fields sit above it and stay
  clickable. The surface takes the same hover, press and focus states as
  `is-interactive` while its main link is hovered, pressed or focused, from the
  same emphasis rules, so the values live in one place. It does nothing until a
  target is present.

  `is-interactive` now reads its transition list from `--interactive-transition`,
  which both utilities share.

- dba660b: Add `emphasis` to `Drawer` and `Dialog`: how much the overlay takes over the
  page behind it. `normal` dims and blurs the page, `subtle` tints it and leaves
  it readable, and `subtler` leaves it clear while a click outside still
  dismisses. A small (`size='sm'`) top or bottom drawer defaults to `subtle`,
  because it peeks over its page; every other drawer and every dialog defaults
  to `normal`.

  Core adds `emphasis-overlay-subtle`, and `emphasis-overlay` now drops its blur
  under `prefers-reduced-transparency` and carries the `-webkit-` prefix.

### Patch Changes

- dba660b: Top and bottom drawers now run edge to edge on a phone and, from `sm` up, stop
  at `max-w-xl`, centred, floating `--spacing(2)` off their edge with every
  corner rounded: the same shape as the cart drawer. Remove any width, margin or
  radius classes an app added to get this.

  Every drawer now rounds at `rounded-4xl`, the new Sheet tier on the Shape
  foundation, whichever side it comes from. The edge it's attached to stays
  square.

  `Drawer.Body` now scrolls in `ScrollArea`, so drawers use Roadie's scrollbar.
  It is still Base UI's drawer content, so a drag in a scrolled body scrolls it
  rather than dismissing. A `className` on it still styles the content, as
  before.

  Core's `motion-drawer` reads `--drawer-float`, so a surface held off its edge
  slides fully clear.

## 2.8.0

### Minor Changes

- f3990bd: Add `animate-pop-tap` — a 200ms tap response, where `animate-pop` at 600ms reads
  as a notification.

  Add the `navigator-expanded` variant, which Navigator's expanded vertical
  navigation is styled with, plus `@oztix/roadie-core/navigator`.

  `@oztix/roadie-core/navigator` also exports `getNavigatorExpandedScript`, an
  optional head script that lets a static site paint a persisted expanded vertical
  navigation before hydration, with the cookie name it reads and a serializer to
  write it.

  Add `is-translucent`, which lets content show through a raised or floating
  surface's fill under a backdrop blur. It pairs with `emphasis-raised`,
  `emphasis-floating` or `bg-raised`, keeps their rim light and shadow, and falls
  back to the solid fill without `backdrop-filter` support or under
  `prefers-reduced-transparency: reduce`. On an `is-interactive-field`, the
  field's hover, focus and invalid fills still win.

- 65ba926: Add `Drawer`, a surface that slides in from any edge and swipes away, built on
  Base UI's drawer primitive. Core gains the `motion-drawer` utility, which drives
  a drawer's edge transition and tracks Base UI's live swipe offset.
- 8c2ca73: One rule for the two motion prefixes: `animate-*` plays now, once, as a
  keyframe animation; `motion-*` is state-driven enter/exit only, a transition
  on Base UI's `data-starting-style` / `data-ending-style`.

  Renamed the keyframe mount animations to match:

  - `motion-fade-in` → `animate-fade-in`
  - `motion-scale-in` → `animate-scale-in`
  - `motion-pop-in` → `animate-pop-in`

  `motion-fade-out` and `motion-scale-out` are deprecated with no replacement —
  use `motion-scale` or `motion-slide` for the exit instead.

  All five old names remain as deprecated aliases until v3.

- 5363c7a: Add `Skeleton`, a placeholder that holds the space content will occupy while it
  loads. One component with a `shape` variant: `text` is a line at the inherited
  line height, `block` is a panel, `circle` is an avatar. Width and height come
  from Tailwind utilities, so a paragraph or a list row is several Skeletons in a
  grid. The root is `aria-hidden` and carries `data-slot='skeleton'`.

  Core adds the `--duration-ambient` (1800ms) and `--duration-sweep` (2400ms)
  tokens, the `--sheen-shade` and `--sheen-highlight` colours, the
  `animate-pulse-subtle` utility, and `animate-shimmer`, which crosses a surface
  with a highlight over that pulse. The highlight is anchored to the viewport, so
  every element wearing the class shares one sweep whatever its size, and it is
  the lighter of the two tones in both themes. Under `prefers-reduced-motion` the
  highlight is dropped and the pulse resolves to a static tint.

### Patch Changes

- f3990bd: `roadie.compiled.css` now ships `motion-scale`, `motion-slide`, `animate-shake`, `animate-nudge` and `animate-pop`, which the precompiled sheet had been dropping.
- 4deb856: - Named `duration-*` utilities set `--tw-duration`, so a variant-scoped `transition-[…]` keeps their duration, and they now ship in `roadie.compiled.css`.
  - `cn` merges `emphasis-field` with the other emphasis presets.

## 2.7.0

### Minor Changes

- 8c8b666: Refine the shadow scale so raised, floating and sunken surfaces read as
  detailed rather than heavy, and give text fields a cleaner edge.

  Each `shadow-*` level is now a hairline ring for the edge plus a stack of
  layers whose offset and blur double; higher levels add a layer and lower each
  layer's opacity instead of darkening. Light-mode shadows are a shade of the
  intent hue rather than near-black. Inset shadows drop their ring and their
  heavy dark-mode black, and gain a faint lower lip in dark mode so they still
  read as recessed.

  The `shadow-*` and `inset-shadow-*` utilities now follow dark mode and intent
  tinting. Tailwind had been compiling their light values in, so they ignored
  both — only the emphasis presets did. Token and utility names are unchanged.

  New `emphasis-field` preset for text fields: a sunken fill, one translucent
  border that takes the fill's tint, and a single inset line. It is plain CSS, so
  server-rendered markup gets the same look with
  `class="emphasis-field is-interactive-field"`. `Input`, `Textarea`, and the
  `Combobox` and `Autocomplete` input groups use it in place of
  `emphasis-sunken border border-subtle`.

  `is-interactive-field` and `is-interactive-field-group` hover now steps to
  `neutral-3` in light mode — it previously matched the resting fill — and focus
  uses `accent-1` in dark mode so a focused field stays close to its resting
  depth.

  The `Select` trigger drops its solid `border-normal`: the raised shadow's
  hairline now draws its edge, and a solid border beside it read as a double
  outline. Its open state uses the same fill as a focused field.
  While a field state colours its border, `is-interactive-field` switches off
  the raised rim light, which otherwise showed as a white gap inside the border.

## 2.6.0

### Minor Changes

- c989b7e: Add a date and time standard: a formatting module and four components.

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

## 2.5.0

### Minor Changes

- 5d05bd1: - **New `Image` component** (`@oztix/roadie-components`) — a size-aware `<img>`
  wrapper. Pass `width` and it requests a right-sized WebP from the Oztix CDN's
  ImageSharp.Web proxy plus a 1x/2x `srcSet`, cutting download bytes and
  decoded-bitmap memory (the Safari-mobile crash class). Non-Oztix URLs, and
  calls without a `width`, pass through as a plain `<img>`. `alt` is required.
  Supports `widths`, `sizes` (when set, builds a responsive small→2x `srcSet`
  ladder so smaller screens download smaller files — fixed-size images without
  `sizes` get 1x/2x), `height` (layout reservation + `aspect-ratio`, and sent to
  the proxy to crop to a fixed box — scaled across the `srcSet`), `priority`
  (eager + `fetchpriority="high"`), `format`, `quality`, `autotrim` (crop
  transparent padding server-side), a `params` escape hatch for any other
  ImageSharp.Web command (`rmode`, `ranchor`, `bgcolor`, …), `placeholder='blur'`
  (blur-up LQIP that fades in on load, auto-derived from the proxy with a
  `blurDataURL` override), `sources` (art direction — a `<picture>` with a
  different URL/crop per breakpoint), and `defer` (IntersectionObserver loading
  for off-screen carousel slides). Every image shows a subtle `bg-subtle` tint as a
  placeholder until it loads, then drops it (override with a semantic background
  utility).
  - **New `@oztix/roadie-core/image` entry point** — pure URL helpers
    `isOztixImageUrl`, `oztixImageAtWidth`, `oztixSrcSet`, and `oztixWidthLadder`
    (the responsive ladder the component uses), plus `OZTIX_IMAGE_HOSTS` /
    `OZTIX_DEVICE_WIDTHS`. For consumers building custom compositions (Vue,
    server-rendered `srcSet`) without the React component.
  - **`Card.Image` is now size-aware** — its inner `<img>` is an `<Image>`, so it
    inherits the full `Image` API (`width`/`height`/`widths`/`sizes`/`quality`/
    `autotrim`/`params`/`placeholder`/`sources`/`priority`/`defer`, the responsive
    ladder, and the `bg-subtle` placeholder).
    - **Behavior change:** card images now default to `loading='lazy'` (and
      `decoding='async'`), where the old bare `<img>` eager-loaded. Mark any
      above-the-fold card image `priority` to restore eager loading and protect
      LCP.
    - **Type narrowing:** `Card.Image` now requires `src` and `alt`, and
      `width`/`height` are `number`-only (previously `string | number` via
      `ImgHTMLAttributes`). Numeric call sites with alt text are unaffected.
  - **`render` on `Mark`, `Prose`, and `Carousel.Title`** — these still exposed the
    legacy polymorphic `as` prop. They now accept the standard Roadie `render`
    escape hatch (e.g. `<Mark render={<h2 />}>`, `<Prose render={<article />}>`,
    `<Carousel.Title render={<h3 />}>`), matching `Card`, `Breadcrumb.Link`, and
    `Carousel.TitleLink`. `as` is now `@deprecated` and will be removed in v3.0.0;
    it keeps working until then.
  - **`Breadcrumb` truncates instead of wrapping** — items no longer wrap. When the
    row runs out of room each item truncates with an ellipsis (`min-w-0` +
    `truncate` on the link/current text), while separators stay put (`shrink-0`).

## 2.4.0

### Minor Changes

- 5e3b922: `emphasis-overlay` now adapts to the active intent. Its scrim is built from the
  intent hue (`oklch(0.1 0.04 var(--intent-hue) / 0.55)`) instead of a fixed
  `rgba(0,0,0,0.5)`, so `intent-danger emphasis-overlay` reads as a dark red glass,
  `intent-accent` as a dark accent glass, etc. — while `neutral` stays a near-black
  scrim. The lightness is fixed so it remains a proper scrim in both light and dark
  themes (the intent scale flips between them).

## 2.3.0

### Minor Changes

- 82ae89b: Add generalized motion utilities to `motion.css`: `animate-nudge` and
  `animate-pop` (one-shot attention cues) plus `motion-pop-in` (fade + slide-up +
  scale entrance, pair with `origin-*`). Token-driven for duration/easing and
  covered by the global `prefers-reduced-motion` reset. These replace the
  cart-drawer widget's bespoke keyframes.
- 0ba959a: Add a `z-alert` layering tier and let `Dialog` pick its z-index from the ARIA `role`.
  - **core**: new `--z-index-alert` (80) tier above `tooltip`, for blocking alert dialogs that must stack over an open modal or drawer.
  - **components**: `Dialog.Root` accepts `role='dialog' | 'alertdialog'` (default `dialog`). `alertdialog` sets `role="alertdialog"` on the surface and raises the backdrop + surface to `z-alert`.
  - **widgets**: cart-drawer expiry modal uses `role='alertdialog'`; cart-drawer layering migrated to named z-index tiers and footer shadow tinted via `--intent-hue`.

## 2.2.0

### Minor Changes

- 2a43e97: Add Dialog, Popover, and IconTile components.
  - **Dialog** / **Popover** — `@base-ui/react` compounds with `*.Content` shortcuts, `Header`/`Body`/`Footer`, and an `intent` variant on the popup. Dialog adds `sm`/`md`/`lg` sizes; Popover adds `Arrow`, `positionerProps` placement, and `openOnHover`.
  - **IconTile** — a tile that frames a single Phosphor icon, with `xs`–`3xl` sizes, `intent`/`emphasis` variants, and `square` (default) / `circle` shapes.
  - **core**: new `layering.css` z-index scale emitting named utilities (`z-overlay`, `z-modal`, `z-popover`, …), reusable `motion-scale` / `motion-slide` enter/exit utilities in `motion.css`, and a `--rim-light-edge` token in `elevation.css`.

## 2.1.0

### Minor Changes

- 225ce2c: **Sync sRGB→OKLCH converter + unified bootstrap script + extended radius scale**

  **New sync colour utilities in `@oztix/roadie-core/colors`:**
  - `hexToOklch(hex)` — convert a hex string to `{ l, c, h }` using
    Björn Ottosson's reference sRGB→Oklab→OKLCH pipeline. Zero
    dependencies (the existing async helpers still use `colorjs.io`).
  - `getOklchHueSync(hex)` / `getOklchChromaSync(hex)` — synchronous
    siblings of the existing async helpers. Match the async output to
    four decimal places across a 20-hex representative palette.
  - `Oklch` type export.

  These unblock pre-hydration accent bootstrap: the hot path that the
  `ThemeProvider` accent effect uses (setting just `--accent-hue` and
  `--accent-chroma`) no longer needs an async `colorjs.io` import, so
  consumers can inject the accent style tag before the first paint.
  The existing async `generateAccentScale` / `generateNeutralScale`
  pipeline is unchanged — those still use `colorjs.io` for the full
  14-step hex fallback output.

  **New `getBootstrapScript` helper in `@oztix/roadie-core/theme`:**

  ```ts
  import { getBootstrapScript } from '@oztix/roadie-core/theme'

  const html = getBootstrapScript({
    followSystem: true,
    accentColor: collection?.themeColour // optional
  })
  ```

  Returns a single HTML string combining the theme script (dark-mode
  flash prevention) and an optional accent style tag. Framework-agnostic
  — drop it into `<head>` via `dangerouslySetInnerHTML`, Astro's
  `set:html`, or a plain HTML template. When `accentColor` is omitted
  or `null`, only the theme script is emitted. Invalid hex input throws
  synchronously with a clear error message.

  **Extended radius scale:**

  Tailwind v4's default radius scale stops at `rounded-4xl` (2rem), so
  `rounded-5xl` and beyond silently resolved to `0px`. Roadie now adds
  three extended tiers via `@theme inline` in `tokens.css`:
  - `--radius-5xl: 2.5rem` (40px) — hero cards, collection headers
  - `--radius-6xl: 3rem` (48px) — feature banners
  - `--radius-7xl: 3.5rem` (56px) — edge-to-edge promotional layouts

  See the [shape foundation](/foundations/shape) page for usage
  guidance and the new `foundations/theming` page for the full
  dynamic-theming walkthrough.

## 2.0.1

### Patch Changes

- 4f929b8: Migrate build pipeline from tsup to tsdown (Rolldown). Internal build-tool
  change with no consumer-facing API differences — dist shape, exports map,
  and type declarations are unchanged.
  - Rolldown preserves `"use client"` directives on entries natively, so the
    post-build hook that previously re-inserted them is gone.
  - `build:css` now invokes the `tailwindcss` bin directly instead of
    `npx @tailwindcss/cli`, eliminating stray npm warnings during builds.
  - Adds `RefAttributes` to `RadioGroup.Root` and `RadioGroup.Item` prop
    types so they match the Select/Combobox/Autocomplete convention.
  - Adds `docs/contributing/BASE_UI.md` as the canonical authoring guide
    for new Base UI wrappers.

## 2.0.0

### Major Changes

- 0645262: Migrate design system from PandaCSS to Tailwind CSS v4 + Base UI

  **Breaking changes:**
  - Replace PandaCSS with Tailwind CSS v4 — all `css()`, `styled()`, `sva()`, and `cva()` (PandaCSS) APIs removed
  - Replace Ark UI with Base UI for interactive component primitives
  - Remove `View`, `Container`, `Text`, and `Heading` components — use raw HTML elements with utility classes
  - Remove `useAccent()` hook — replaced by `useTheme()`
  - Remove `useColorMode()` hook — replaced by `useTheme()` with `isDark`/`setDark`
  - Rename `colorPalette` prop to `intent` (`information` -> `info`, `primary` -> `brand`)
  - Rename `appearance` prop to `emphasis` across all components
  - Rename emphasis level `default` to `normal` (scale: strong -> normal -> subtle -> subtler)
  - Components no longer set a default intent — they inherit from CSS cascade context
  - Default Tailwind color utilities disabled (`--color-*: initial`) — use semantic colors (`bg-normal`, `text-subtle`, `border-normal`)
  - `getAccentStyleTag()` is now async (lazy-loads colorjs.io)
  - Dark mode changed from `data-color-mode="dark"` to `className="dark"` with CSS `color-scheme`
  - Icons migrated from Lucide to Phosphor (`@phosphor-icons/react`, `weight="bold"`)

  **New features:**
  - CSS-native OKLCH color system with 7 intents x 14-step scales
  - Intent/emphasis/semantic-color utility system via Tailwind `@utility` directives
  - Intent-tinted elevation shadows and rim-light scale
  - Fluid typography via `clamp()` for text-lg and above
  - Motion tokens (duration, easing, keyframes) with `prefers-reduced-motion` reset
  - `is-interactive` and `is-interactive-field` interaction utilities
  - Flash-free dark mode SSR via `getThemeScript()`
  - 19 new components: Prose, Badge, Card, Input, Textarea, Field, Label, Select, Combobox, Autocomplete, RadioGroup, Fieldset, Accordion, Breadcrumb, Separator, Steps, LinkButton, Indicator, Marquee
  - Field as universal form control wrapper with context inheritance
  - Sub-component API pattern for Select and Combobox
  - ThemeProvider with `followSystem`, `defaultDark`, `setDark`, localStorage persistence
  - Vue integration support (tokens + utility classes only)

## 1.2.0

### Minor Changes

- d9a0534: Add essential components and design tokens for B2B website development (INNO-170)

  **New Components:**
  - Add Container component for responsive page-level layouts with max-width constraints
  - Add IconButton component for square, icon-only button variant
  - Add Mark component for semantic text highlighting with theme-aware styling
  - Add Highlight component for intelligent search result highlighting using Ark UI
  - Add SpotIllustration system with automated SVG-to-component pipeline and 12 initial illustrations

  **Design Token Enhancements:**
  - Add `brandSecondary` color palette to type system
  - Add `surface.highlight` tokens for all color palettes with hover/active states
  - Update `surface.strong` token colors for improved contrast

  **Font System:**
  - Rename from Inter Variable to Intermission (Oztix's customized version)
  - Enable OpenType features: case, ss03, cv01-cv05, cv08-cv11
  - Subset to Basic Latin (U+0020-007F) and typographic quotes (U+2018-201F) for optimized file size

  **Build System:**
  - Add automated SpotIllustration build pipeline with SVGO optimization and watch mode
  - Add chokidar and svgo dependencies for illustration tooling
  - Add tree-shakeable exports for spot illustrations

## 1.1.0

### Minor Changes

- 6e05fb8: Add color mode utilities and improve design tokens

  **New Features:**
  - Add vanilla JavaScript `colorMode` utilities for framework-agnostic color mode management
  - Export `useColorMode` hook separately from components for better tree-shaking
  - Add CSS custom properties and utilities for color mode tokens

  **Token Improvements:**
  - Align brand color names with lighting metaphor system (luminary, beacon, radiance, brilliance, spark)
  - Normalize all hex color codes to lowercase for consistency
  - Adjust semantic token `surface.strong` mappings for better contrast
  - Fix `Heading` component default `colorPalette` to use `neutral`

  **Developer Experience:**
  - Improve generated CSS token formatting to match Prettier rules
  - Optimize PandaCSS codegen to eliminate duplicate type generation
  - Add TypeScript incremental compilation support for faster builds

  **Documentation:**
  - Update docs to demonstrate color mode utilities usage
  - Add vanilla CSS tokens documentation and examples
  - Improve code preview component styling

## 1.0.0

### Major Changes

- 8481943: Upgrade to PandaCSS 1.4.3 and Ark UI with modernized component system

  **Breaking Changes:**
  - Upgraded PandaCSS from 0.48.1 to 1.4.3
  - Migrated from React Aria Components to Ark UI factory pattern
  - Button component now uses native HTML props: `disabled` instead of `isDisabled`, `onClick` instead of `onPress`
  - Removed `colors.solid.*` tokens (use `surface.strong` instead)
  - Renamed all `muted` emphasis levels to `subtler` (e.g., `fg.muted` → `fg.subtler`)
  - Changed primary font from Inter Variable to Intermission
  - Refined letter spacing token scale (values changed significantly)
  - Complete rewrite of Text, Heading, Button, and Code components to use Ark UI factory
  - New styled() API for components replacing previous implementation
  - Simplified View component implementation
  - Component props standardized across all components

  **New Features:**
  - All components now support `colorPalette` prop for flexible theming
  - Button component rewritten with `styled()` API and new `xs` size variant
  - Components modernized to use semantic `colorPalette.*` tokens
  - New standardized component API with consistent props across all components
  - Enhanced typings with HTMLStyledProps for comprehensive prop support
  - Updated Text, Heading, Button, and Code components with consistent styling system
  - View is now a PandaCSS pattern component
  - Improved recipe system with shared patterns and consistent APIs

  **Migration:**

  Update Button props:

  ```diff
  - <Button isDisabled onPress={handlePress}>
  + <Button disabled onClick={handlePress}>
  ```

  Replace removed tokens:

  ```diff
  - color: {colors.accent.solid.default}
  + color: {colors.accent.surface.strong}
  ```

  Update emphasis levels:

  ```diff
  - <Text emphasis="muted">
  + <Text emphasis="subtler">
  ```

## 0.2.1

### Patch Changes

- f2aa279: Update neutral solid colors to work better with default button

## 0.2.0

### Minor Changes

- 94d8153: Add new semantic color token system
  - Introduce new color palette structure with semantic tokens
  - Update components to use new color token system
  - Add emphasis and colorPalette props to components
  - Update tests to reflect new token structure

## 0.1.0

### Minor Changes

- Initial pre-release of the Roadie Design System for internal testing
