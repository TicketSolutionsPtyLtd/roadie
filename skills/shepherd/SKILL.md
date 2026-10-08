---
name: shepherd
description: Use to take an open draft PR to merged in any Oztix repo. Rebases on its base branch, waits for CI without busy polling, marks it ready for the one Copilot pass, triages every Copilot thread (fix, reply, resolve), records Copilot precision, and merges a two-way door or hands a one-way door to the maintainer. Reads the host repo's AGENTS.md and PR workflow. Triggers on "shepherd this PR", "see this PR through", "get this merged", "mark it ready and handle Copilot".
---

# Roadie shepherd

Carry one draft PR from open to merged under the host repo's PR workflow. It
calls the other skills rather than repeating them. The host repo's
`AGENTS.md` (or `CLAUDE.md`), `CODING_STANDARDS.md`, and PR workflow win over
anything here.

Shepherd starts from an open draft; `/roadie:pr` opens it. Never act on the
Version Packages PR, or on a branch another session owns (in Roadie, a prefix
other than your own).

## 1. Gather

- The host rules:
  `git ls-files | grep -iE 'agents.md|claude.md|coding_standards|pr_workflow'`.
  Note the ready gate, triage rules, follow-up rule, one-way door list, and
  merge rule. With no workflow, use Roadie's sections 6 to 9:
  `https://raw.githubusercontent.com/TicketSolutionsPtyLtd/roadie/main/docs/contributing/PR_WORKFLOW.md`.
- The PR: `gh pr view <n> --json isDraft,baseRefName,headRefName,body,files,statusCheckRollup`.
  Its body's Merge danger says which door it is. `<base>` below is its
  `baseRefName`, not always `main`.

## 2. Stay draft until clean

The local review is clean when a `/roadie:review` report shows
"Open findings: None" and lists no "Previously missed". With no clean report,
start `/roadie:review` in one fresh subagent with its guard brief; never
review your own work. Fix what it leaves open test-first with
`/roadie:test`.

## 3. Wait without burning the machine

- CI runs remotely, so wait, don't poll hard:
  `gh pr checks <n> --watch --interval 60 --fail-fast`, or one check a minute
  or slower. Green means every check passed or was skipped. Report only state changes (green, red, ready, reviewed, merged,
  blocked), never "still waiting".
- Before anything local (install, build, tests after a rebase) and before
  every push, since pushes run the hooks, check `uptime` and wait while the 1-minute load is over the host's limit (in
  Roadie, PR workflow section 5). Use the host's load-gated test runner.
- A red check goes to `/roadie:debug`. A known flake may be re-run once
  (`gh run rerun <id> --failed`). A cancelled job may have hit its time
  limit rather than been replaced by a newer run, so check its step times
  (`gh run view <id> --json jobs`) before rerunning. Never edit CI config, rulesets, or branch
  protection to get green.

## 4. Mark ready

When CI is green, the review is clean, and any demo is approved:

```bash
git fetch origin && git rebase origin/<base> && git push --force-with-lease
```

Wait for CI again (step 3), then `gh pr ready <n>`. That triggers the one
Copilot pass; there is no second. Poll for its review every few minutes, for
about 30 minutes, then report blocked:

```bash
gh pr view <n> --json reviews -q '.reviews[] | select(.author.login | test("copilot")) | .state'
```

## 5. Triage every thread

List every thread with its id. `--paginate` follows `endCursor` past the
first 100, so none is missed:

```bash
gh api graphql --paginate -f query='query($o:String!,$r:String!,$n:Int!,$endCursor:String){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100,after:$endCursor){pageInfo{hasNextPage endCursor} nodes{id isResolved path line comments(first:20){nodes{author{login} body}}}}}}}' -F o=<owner> -F r=<repo> -F n=<n>
```

For each, by the host's severity rules, do one of these and reply on the
thread:

- **Real, fix it.** Test-first with `/roadie:test`; reply naming the commit
  and the test. A docs-only fix needs no test. If the fix is significant (new logic, state, or API), one
  fresh `/roadie:review` of the fix commits, not another Copilot pass.
- **Real Minor, defer it.** File it as the host's follow-up rule says (Roadie
  section 9) and reply with the link.
- **Stands.** Reply with why, citing the rule or decision.

Reply and resolve with
`addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId, body})` and
`resolveReviewThread(input:{threadId})` through `gh api graphql`. Write each
reply to a file and pass it with `-F body=@file`, so quotes and backticks
survive. A rebase changes every sha, so reply after the final push, or name
the commit by its subject rather than its sha.

Copilot can also leave findings only in its review body, with no inline
thread, so read the body too:

```bash
gh pr view <n> --json reviews -q '.reviews[] | select(.author.login | test("copilot")) | .body'
```

A body finding that links to a `#discussion_r` thread is that thread's
finding; count it once. Triage the rest the same way and answer them in one
PR comment.

Add one line to the body's Evidence, updated with `/roadie:pr` (or
`gh pr edit <n> --body-file`): "Copilot: N of M findings real", where real is
fixed or filed and the rest stood. Zero findings is "Copilot: 0 findings". If
an older body has no Evidence section, add one.

## 6. Merge or hand off

If `<base>` moved (`git merge-base --is-ancestor origin/<base> HEAD` fails
after a fetch), rebase locally as in step 4 and wait for CI. Don't rely on
`gh pr update-branch --rebase`: it fails on any conflict. Resolve conflicts
keeping both sides' intent, then rerun the host's checks for those files.

Then check the host's merge rule. In Roadie (section 8): CI green, the branch
up to date with `main`, the file list clean, the review clean, no unresolved
thread, and consumer changes in the changeset.

- **Two-way door, every condition met:**
  `gh pr merge <n> --squash --delete-branch`, run by hand once every condition
  holds. Never `--auto`, even where the repo allows it: auto-merge waits only
  for required checks, not the review, threads, or file list. Then
  remove the local worktree and branch.
- **A failed condition:** fix it and go back to the step it belongs to.
- **One-way door, a limit on what agents may change, or no merge rule:**
  don't merge. Post one PR comment naming what's done and what waits for the
  maintainer, and report the same line.

Any other open call is decided, not handed off: pick the recommended option,
record it in the body's Decisions, and carry on (Roadie section 1).
