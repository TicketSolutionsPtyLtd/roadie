---
name: grill
description: Use when someone has a new feature idea, prop, variant, component, token, or utility, before it is specced, in any Oztix repo. Reads the foundations, recorded learnings, the decision register, and prior art first, proves the cascade, intent, emphasis, or an existing component can't do the job, then asks only the questions left, one at a time, and records what it ruled out for /roadie:spec. Reads the host repo's AGENTS.md and CODING_STANDARDS.md. Triggers on "grill me", "grill this idea", "do we need a new prop", "should this be a variant", "new component idea", "interview me about this feature".
---

# Roadie grill

Test an idea against what already exists before anyone specs it. Most asks
are answered by the cascade, an existing component, or a `className`; the rest
need a few decisions only a person can make. Adapted from Matt Pocock's
`grill-with-docs` skill (MIT). Runs before `/roadie:spec`.

## 1. Read before asking

Answer facts yourself. Never ask the user what the code or docs say.

- The host repo's rules:
  `git ls-files | grep -iE 'agents.md|claude.md|coding_standards|pr_workflow'`.
  Note its "look for what exists" and API design rules. They win over
  anything here. With none, use Roadie's
  `https://raw.githubusercontent.com/TicketSolutionsPtyLtd/roadie/main/docs/contributing/CODING_STANDARDS.md`.
- The decision register (`docs/decisions/` or wherever `AGENTS.md` points):
  its "how we decide" rules and every entry the idea touches. Cite an entry
  instead of re-arguing it.
- Recorded learnings (`docs/solutions/` or similar), by frontmatter:
  `grep -rlE '^(module|tags):.*<Name>' docs/solutions`.
- The foundations pages for the area (layout, colour, interactions, shape,
  records, and so on) and the component's own docs page, Guidelines first. In
  Roadie they're `docs/src/app/`; elsewhere, the
  [docs site](https://ticketsolutionsptyltd.github.io/roadie/).
- Prior art in code: the component, its siblings' props (grep the prop name
  and its synonyms), callers already working around the gap (a `className`
  override, a wrapper, a copied internal), and the primitive it wraps
  ([Base UI](https://base-ui.com/) in Roadie).
- For a new component API, how two other design systems solve it, with
  their cons.

## 2. Prove what exists can't do it

Walk the ladder, cheapest first. Each rung gets a verdict and its evidence:
a file and section, or a concrete case it fails. A rung that does the job
ends the grill: the answer is no new API, and the record says how.

1. No change: a better default, or `className` with CSS vocabulary (`1fr`,
   `minmax()`, `flex-wrap`), as `CODING_STANDARDS.md` prefers.
2. The cascade: intent, emphasis, the `is-*` interaction utilities, a data
   attribute, or a container query.
3. An existing utility, token, or variable.
4. An existing component, compound part, or composition of them, including
   the one a Guidelines section points to instead.
5. A sibling's existing prop. Reuse its name and shape rather than invent one.
6. The wrapped primitive's own prop, passed through.

In an app repo, ask one more: is this a gap every app has? If so, it belongs
in Roadie, answered for every app, not patched in the app.

Only past every rung is the answer a new prop, variant, or component. Judge
its door against the host workflow's one-way door list.

## 3. Ask what's left

- One question at a time. Give the options, your recommendation, and why,
  then wait for the answer before the next.
- Ask about intent, scope, and edge behaviour. Ask about naming only when
  the sibling vocabulary doesn't decide it.
- Stop once `/roadie:spec` could be written. Most ideas need one to five.
- No one to ask (an autonomous run): don't block. Record each question with
  its recommended answer, marked assumed, and carry on as the host workflow
  allows. One-way doors and new components wait for the maintainer.

## 4. Record it

Post it where the work is tracked (the ticket comment, headed
"Grill (with /roadie:grill)", or the session), in this shape:

```md
Idea: <one line, with the ticket key>

Ruled out
| Option | Verdict | Evidence |

Answered by the docs

- <question>: <answer> (<source>)

Open questions

1. <question> Options: … Recommended: … because …

Recommendation: <no new API | reuse X | extend X with … | new Y>. <door>.
```

`/roadie:spec` starts from it: the ruled-out rows become its prior art and
Decisions, and the open questions stay open until someone answers them.
