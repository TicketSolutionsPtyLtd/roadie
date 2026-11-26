# @oztix/roadie-browser-testing

Browser-test helpers that components, the editor, blocks and charts share.
Tests only: it's private and never published.

- `@oztix/roadie-browser-testing/config`: the vitest `pointer` command (a
  real mouse, in the test frame's CSS pixels) and its `PointerStep` type.
  Add `pointer` to a package's `browser.commands`, and type it in the
  package's `browser-commands.d.ts` with `PointerStep`.
- `@oztix/roadie-browser-testing`: `pickOption` and `pickMenuItem`
  (`role` for a radio or checkbox item), `waitPopupGone`, `withFrames`, and
  `keepFramesRunning`. They keep frames running by wiggling the pointer, so
  Linux WebKit, which runs none while idle, opens and closes popups. The
  wiggle stays on the last element a pick clicked, so a submenu opened by
  hover stays open. See
  `docs/solutions/test-failures/linux-webkit-no-frames-while-idle.md`.
