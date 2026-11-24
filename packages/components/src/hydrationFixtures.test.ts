import { expect, it } from 'vitest'

// Every source file in a component folder, as text.
const sources = import.meta.glob<string>('./components/*/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true
})

const TEST_ONLY = /\.test\.|testUtils|\.d\.ts$/
const CLIENT = /^['"]use client['"]/m
const STATE =
  /\buse(State|Reducer|SyncExternalStore|Effect|LayoutEffect|IsomorphicLayoutEffect)\(|from '@(base|ark)-ui\//

// A folder whose client state can paint differently once it hydrates, and why
// it has no `Component.ssr.tsx` fixture.
const closed =
  'Renders nothing until opened, so the server paints it as it hydrates.'
const later = 'No fixture yet: INNO-1703.'
const EXEMPT: Record<string, string> = {
  Autocomplete: later,
  Button: 'Its one effect is a development warning.',
  Card: 'Its effects only count Card.Content for a development warning.',
  Checkbox: later,
  CheckboxGroup: later,
  CommandPalette: closed,
  DashboardPeriod: later,
  DateRangePicker: later,
  Dialog: closed,
  Drawer: closed,
  Field: 'The DatePicker, FileUpload, OTPField and Select fixtures wrap it.',
  ImageCrop: later,
  Menu: closed,
  Popover: closed,
  Prose: later,
  QueryField: 'The RecordTable fixtures render it in their toolbar.',
  RadioGroup: later,
  RecordBoard: later,
  RecordCalendar: later,
  Records: 'The engine the RecordTable and RecordGrid fixtures render.',
  ScrollRegion: 'A hook, with nothing of its own to render.',
  Switch: later,
  Toast: closed,
  Toggle: later,
  Tooltip: closed
}

/** Each component folder, whether a shipped client file holds state, and whether it has a fixture. */
function componentFolders() {
  const folders = new Map<string, { stateful: boolean; fixture: boolean }>()
  for (const [file, source] of Object.entries(sources)) {
    const folder = file.split('/')[2]!
    const found = folders.get(folder) ?? { stateful: false, fixture: false }
    if (file.endsWith('.ssr.tsx')) found.fixture = true
    else if (!TEST_ONLY.test(file) && CLIENT.test(source) && STATE.test(source))
      found.stateful = true
    folders.set(folder, found)
  }
  return folders
}

it('gives every component with client state a hydration fixture', () => {
  const missing = [...componentFolders()]
    .filter(([, { stateful, fixture }]) => stateful && !fixture)
    .map(([folder]) => folder)
    .filter((folder) => !(folder in EXEMPT))
  expect(
    missing,
    'Add Component/Component.ssr.tsx, as src/hydration.browser.test.tsx says, or an EXEMPT entry with a reason'
  ).toEqual([])
})

it('exempts only components that still need it', () => {
  const folders = componentFolders()
  const stale = Object.keys(EXEMPT).filter(
    (folder) => !folders.get(folder)?.stateful || folders.get(folder)?.fixture
  )
  expect(stale, 'Remove these from EXEMPT').toEqual([])
})
