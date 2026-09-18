---
module: components/Navigator
tags: [navigator, pending, scroll, transform, next-app-router, playwright]
problem_type: bug
---

# The frame was a scrollport, and `current` was read as "the destination"

Two bugs reported from an app adopting the Navigator: a push zeroed the pane it
left, and after a pending wait the pane row sat 20px above the window. They are
unrelated, and the first one was reported twice, once as a real bug and once
as a measurement that only looked like it.

## The rule for measuring a scroll across a navigation

**A trigger a harness has to scroll into view is not a trigger.** Playwright's
actionability check runs `DOM.scrollIntoViewIfNeeded` over CDP before it clicks.
That is a browser-side scroll: it calls no `scroll` API on `Element.prototype`,
mutates no DOM and leaves no JS stack, so every trap that would catch
application code catches nothing and the offset looks like it evaporated.

Measured in `/debug/bare` at 560x800, event pane scrolled with real wheel
events, on a build with the pane bug below still present:

| how the trigger was clicked                         | before | after the push |
| --------------------------------------------------- | ------ | -------------- |
| `locator.click()` on a trigger scrolled out of view | 943    | 0              |
| in-page `element.click()`                           | 943    | 943            |
| `mouse.click()` on an on-screen trigger             | 943    | 943            |

Scroll a pane to 2063 and click a trigger now _above_ the scrollport and the
tell is unmistakable: the harness scrolls to 1223 to reach it, 1223 is what the
rAF-throttled save writes, and 1223 is what Back restores.

Three cheap tells that a scroll change is the harness and not the code: it lands
**before** React commits (45ms before the first mutation of the navigation, in
one trace); the geometry is untouched across it; and an `addInitScript` trap on
`scrollTop`, `scrollTo`, `scrollBy`, `scrollIntoView` and `focus` logs nothing.

`/debug/bare` keeps a trigger of each kind for this reason.

## `current` is not "this pane is the destination"

The real one. `Pane` documents that **the deepest `current` [now `reached`]
pane is the top of the stack**, and `deriveTopIndex` implements exactly that, so a route layout
has no reason to turn `current` off on the pane it drilled from, and a real
shell doesn't. The restore effect in `PaneRoot` read the raw `current` prop as
"this pane is the one being navigated to", so a push zeroed **every** `current`
pane, not just the one it arrived at.

The canary missed it because both `/debug/stack` and the jsdom suite toggled
`current` off on the pane going behind, which no shell does. `/debug/bare` now
leaves it on, and `/debug/stack` keeps toggling it, so both shapes stay covered.

The snapshot can't answer "am I the top" on the commit that matters: a pane
registers after it renders, so on a push the arriving pane isn't in it yet and
the pane going behind still reads as `top`. The DOM can. `Navigator.Content`
already reads the committed row in an insertion effect, and insertion effects
all run before any layout effect, so it publishes the top node there and
`PaneRoot` asks for it in its restore layout effect.

The symmetric rule that falls out: **the pane a navigation goes to starts at the
top; the pane it leaves keeps its place**, whether it is left behind by a push
going deeper or by the stack revealing a shallower pane over it.

## The pull-back only shifts what it sits inside

The 20px residue needs three things at once:

1. The phone pull-back scaling `[data-slot=navigator-panes]` to `0.96` about its
   centre, which at 1000px tall moves the row's visual top to +20.
2. Something revealing the arriving pane while that transform holds.
   `scrollIntoView()` aligns the target's _transformed_ top with the scrollport
   start, so it scrolls by exactly the inset. Next 16.3.5 does not; earlier App
   Router scroll handlers call `scrollIntoView()` and `focus()` on the new
   segment's first host node.
3. A scrollable ancestor with that much slack. The result is a real scroll
   offset, not a transform, so dropping `scale` leaves it behind for good.

The frame supplied (3) itself, which is what took so long to see. It was
`h-[100dvh] overflow-hidden`, and `overflow: hidden` makes a scrollport, one
with no scrollbar, that nothing on screen says can scroll. Whenever the top pane
declares `primaryNav='hidden'` [now `tabBar='hidden'`], the phone bar is `position: absolute` with
`translate: 0 calc(100% + 2rem)`, which puts 82px of its box below the frame's
bottom edge. That is scrollable overflow. Measured in the reporting app:

| frame `overflow` | slack | `scrollTop = 60` lands on | after reveal-mid-transform, scale dropped |
| ---------------- | ----- | ------------------------- | ----------------------------------------- |
| `hidden`         | 82px  | 60                        | row top **-9**, permanently               |
| `clip`           | 82px  | 0                         | row top 0                                 |

`overflow: clip` creates no scrollport at all, so the slack stays clipped and
unreachable, which is what it always should have been. `navigator-content`
already does this. Nothing is lost: the only thing past the frame's bottom edge
is a bar that is deliberately `visibility: hidden`.

If a `-20` survives this, the slack is in an ancestor the app owns. Walk up from
the row while the indicator is up:

```js
let n = document.querySelector('[data-slot="navigator-panes"]')
for (; n; n = n.parentElement) {
  if (n.scrollHeight > n.clientHeight) console.log(n, n.scrollTop)
}
console.log('document', document.scrollingElement.scrollTop)
```
