---
module: components/Navigator
tags: [navigator, pending, scroll, transform, next-app-router, playwright]
problem_type: bug
---

# Two scroll bugs that were one harness and one ancestor

Both were reported against the pending indicator branch, both looked like Roadie
losing a scroll position, and neither was. Writing down how they were told apart,
because the method is the reusable part.

## The rule for measuring a scroll across a navigation

**A trigger a harness has to scroll into view is not a trigger.** Playwright's
actionability check runs `DOM.scrollIntoViewIfNeeded` over CDP before it clicks.
That is a browser-side scroll: it fires no `scroll` API on `Element.prototype`,
mutates no DOM, and leaves no JS stack. Every trap that would catch application
code catches nothing, so the offset looks like it evaporated on its own.

`/debug/bare`'s event pane keeps two triggers for exactly this reason.
`open-ticket` sits at the top of the pane; once the pane is scrolled past it, a
`locator.click()` first drags the pane back to the trigger, and the run then
measures its own scroll. `open-ticket-inline` sits ~30 lines down and is still on
screen at a realistic scroll depth, so `page.mouse.click()` on its box is a
genuine trusted click with no scroll first.

Measured at 560x800, three levels, event pane scrolled with real wheel events:

| how the trigger was clicked            | before | after the push | after Back |
| -------------------------------------- | ------ | -------------- | ---------- |
| `locator.click()` on the top trigger   | 943    | 0              | 0          |
| in-page `element.click()`              | 943    | 943            | 943        |
| `mouse.click()` on the in-view trigger | 943    | 943            | 943        |

The same split holds in `/debug/stack`. Roadie's save and restore were correct
the whole time; the harness scroll was being saved, faithfully, and restored.

That also explains a partial restore. Scroll the pane to 2063 and click a
trigger that is now _above_ the scrollport: the harness scrolls to 1223 to reach
it, 1223 is what the rAF-throttled save writes, and 1223 is what Back restores.
A reported "scrolled to 922, Back gave 279" is that, with the trigger about 279
into the pane. Nothing was throttled away.

Three cheap tells that a scroll change is the harness and not the code:

- It lands **before** React commits. A `MutationObserver` on
  `document.documentElement` showed the offset gone 45ms before the first
  mutation of the navigation.
- Geometry is untouched across it: same `scrollHeight`, same `clientHeight`,
  same computed `overflow`, same parent, `isConnected`.
- Trapping `scrollTop`, `scrollTo`, `scrollBy`, `scrollIntoView` and `focus` via
  `addInitScript` logs nothing at all.

## The pull-back only shifts what it sits inside

The second report: on a phone-width route change the pane row ends 20px above
the window, header clipped, and stays there.

The mechanism is real and reproducible, and it needs three things at once:

1. The phone pull-back scaling `[data-slot=navigator-panes]` to `0.96` about its
   centre, which at 1000px tall moves the row's visual top to +20.
2. Something asking the browser to reveal the arriving pane while that transform
   is applied. `scrollIntoView()` aligns the target's _transformed_ top with the
   scrollport start, so it scrolls by exactly the inset.
3. **A scrollable ancestor with at least that much slack to absorb it.** The
   scroll is a real offset, not a transform, so dropping `scale` leaves it.

Give the document 60px of slack in `/debug/bare` and the symptom appears exactly
as reported: `scrollIntoView()` during the wait takes the document to 20, and
once the indicator leaves the row sits at `top: -20` for good.

Roadie's own frame supplies neither (2) nor (3):

- Next 16.3.5 calls no `scrollIntoView` and no `focus` across the whole hop.
  Earlier App Router scroll handlers call both on the new segment's first host
  node, which is what an app on an older Next will hit.
- The frame has no scroll slack in any state that could be produced —
  `scrollTop = 500` clamps back to 0 at rest, mid-wait, with the row scaled, and
  with the phone bar translated below the bottom edge.

So a `-20` in an app means an ancestor **outside** the frame is holding the
slack. To find it, walk up from the row while the indicator is up:

```js
let n = document.querySelector('[data-slot="navigator-panes"]')
for (
  ;
  n;
  n =
    n.parentElement ??
    (n === document.documentElement ? null : document.documentElement)
) {
  if (n.scrollHeight > n.clientHeight)
    console.log(n, n.scrollTop, n.scrollHeight - n.clientHeight)
}
```

The frame is `h-[100dvh]` and every pane scrolls itself, so nothing around it
should scroll. `navigatorRootClass` now uses `overflow-clip` rather than
`overflow-hidden` so the frame cannot be the ancestor that absorbs it: `clip`
creates no scrollport, while `hidden` creates one that never shows a bar and can
still be scrolled by a focus, a find-in-page or a router. It is a guard, not a
cure — an app that puts a scrolling page around the frame still has one.
