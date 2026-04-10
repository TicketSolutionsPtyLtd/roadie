# Roadie Skills

Claude Code skills for working with the [Roadie design system](https://ticketsolutionsptyltd.github.io/roadie/).

These skills ship as a Claude Code plugin. Installing the plugin makes them available in any repo you open.

## Available skills

| Skill | Command | What it does |
|---|---|---|
| `audit` | `/roadie:audit` | Scan a codebase for Roadie compliance — hardcoded colors, wrong layout, icon misuse, deprecated props, missing setup — and optionally fix. |

More skills coming (e.g. a `build`/`ui` skill for scaffolding new UI with Roadie primitives).

## Install

From any repo that uses `@oztix/roadie-core` and `@oztix/roadie-components`:

```
/plugin install TicketSolutionsPtyLtd/roadie
```

Claude Code pulls the plugin from the default branch. Update later with `/plugin update roadie`.

After install, the skills are auto-discovered and available as `/roadie:<skill>`.

## Authoring (internal)

Plugin layout (at the Roadie repo root):

```
roadie/
├── .claude-plugin/
│   └── plugin.json        ← plugin manifest (name, version, description)
└── skills/
    ├── README.md          ← this file
    └── <name>/
        └── SKILL.md       ← skill frontmatter + body, auto-discovered
```

**Rules for new skills shipped in this plugin:**

1. **Must be self-contained.** A consumer repo won't have the Roadie source checked out, so don't reference `packages/components/...` or `AGENTS.md`-relative paths. Inline the rules or fetch from `https://raw.githubusercontent.com/TicketSolutionsPtyLtd/roadie/main/...` via WebFetch.
2. **Frontmatter `name` matches directory name** — e.g. `skills/audit/SKILL.md` has `name: audit`. The plugin namespace (`roadie:`) is added automatically at install time.
3. **Keep the `description` action-oriented** — it's what Claude matches against to decide when to invoke. Include trigger phrases ("audit against Roadie", "check Roadie compliance").

Project-scoped skills that only make sense inside the Roadie repo itself (e.g. `.claude/skills/new-component.md`, which references `packages/components/src/...`) stay in `.claude/skills/` and are **not** shipped in the plugin.
