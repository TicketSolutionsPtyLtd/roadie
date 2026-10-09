# Roadie plugin changelog

Every change under `skills/` bumps `version` in `.claude-plugin/plugin.json`
and adds an entry here, or CI fails the PR.
Installs only update when the version changes.

- **Minor** for a new skill or a change in what a skill does.
- **Patch** for wording, fixes, and clarifications.

## 0.4.0

- The repo is now a plugin marketplace, so the plugin installs as
  `roadie@roadie` and a repo can enable it in `.claude/settings.json`.
- Adds `/roadie:build`, `/roadie:charts`, `/roadie:debug`, `/roadie:demo`,
  `/roadie:grill`, `/roadie:implement`, `/roadie:pr`, `/roadie:retro`,
  `/roadie:setup`, `/roadie:shepherd`, `/roadie:slice`, and `/roadie:spec`,
  which shipped on `main` without a version bump.

## 0.3.0

- Adds `/roadie:test`.

## 0.2.0

- Adds `/roadie:review`.

## 0.1.0

- Adds `/roadie:audit`.
