# Claude Code plugins

This documents the Claude Code plugins installed on this machine (as of 2026-07-30), what each skill inside them does, and whether Claude uses it automatically or you have to invoke it.

> **Important:** none of this is part of the git repo. Plugins, marketplaces, and skills live in `~/.claude/` on the machine where they were installed (`~/.claude/plugins/`, `~/.claude/settings.json`). Committing this file to git documents the setup — it does **not** transfer the plugins themselves. See [Using this on another device](#using-this-on-another-device) below.

## How triggering works

- **Automatic** — Claude reads the skill's description against your request and invokes it on its own when it matches. No slash command needed.
- **Hook-driven** — fires on an event (e.g. a tool call), not on request content. Always active once the plugin is enabled.
- **Manual only** — the skill is really a command. It only runs if you type `/plugin:skill-name` (or explicitly ask for it by name).

---

## skill-creator

| Skill | Trigger | Notes |
|---|---|---|
| `skill-creator:skill-creator` | Automatic, or `/skill-creator:skill-creator` | Creates, edits, or benchmarks skills. Fires when you ask to build/improve/eval a skill. |

## superpowers

A large opinionated workflow suite. Most of these are automatic based on task shape:

| Skill | Trigger | Notes |
|---|---|---|
| `using-superpowers` | **Automatic, every conversation** | Written to activate at the start of any conversation and steer how skills get selected. You'll see its influence often now. |
| `brainstorming` | Automatic | Before creative/feature work, to explore intent before implementing. |
| `writing-plans` | Automatic | When you hand over a spec/requirements for multi-step work. |
| `executing-plans` | Automatic | When running a written plan with review checkpoints. |
| `subagent-driven-development` | Automatic | Executing plans with independent tasks in-session. |
| `test-driven-development` | Automatic | Before writing implementation code for a feature/bugfix. |
| `systematic-debugging` | Automatic | On any bug/test failure/unexpected behavior, before proposing a fix. |
| `requesting-code-review` | Automatic | After finishing major work, before merge. |
| `receiving-code-review` | Automatic | When feedback comes in, to verify rather than blindly apply it. |
| `verification-before-completion` | Automatic | Before claiming something is fixed/passing/done. |
| `finishing-a-development-branch` | Automatic | When implementation is done and tests pass — decides how to integrate. |
| `using-git-worktrees` | Automatic | When feature work needs isolation from the current workspace. |
| `dispatching-parallel-agents` | Automatic | 2+ independent tasks with no shared state. |
| `writing-skills` | Automatic | Creating/editing/verifying skills. |

**Heads up:** several of these overlap with your existing habits — e.g. `using-git-worktrees` and `finishing-a-development-branch` may suggest branch/worktree workflows. You already have a standing preference for "no branch without asking, commit on `main`" — flag it if superpowers pushes back on that.

## frontend-design

| Skill | Trigger | Notes |
|---|---|---|
| `frontend-design:frontend-design` | Automatic | Aesthetic direction, typography, and layout choices when building or reshaping UI. |

## context-mode

| Skill | Trigger | Notes |
|---|---|---|
| `context-mode:context-mode` (tools `ctx_execute`, `ctx_execute_file`) | **Hook-driven, automatic** | A `PreToolUse` hook auto-routes large Bash/MCP output through a sandbox so only the filtered/summarized result enters context. Runs regardless of what you ask. |
| `ctx-index` | Manual — `/context-mode:ctx-index` | Indexes a file/dir into the persistent FTS5 search DB. |
| `ctx-search` | Manual — `/context-mode:ctx-search` | Searches that indexed DB. |
| `ctx-stats` | Manual — `/context-mode:ctx-stats` | Shows context tokens saved this session. |
| `ctx-doctor` | Manual — `/context-mode:ctx-doctor` | Diagnostics for the plugin's own setup. |
| `ctx-insight` | Manual — `/context-mode:ctx-insight` | Opens a hosted analytics dashboard in your browser. |
| `ctx-purge` | Manual — `/context-mode:ctx-purge` | **Destructive.** Wipes the indexed knowledge base. Will never run without you typing it. |

## claude-mem

Cross-session memory plus a set of workflow commands. Most of these are command-shaped (manual); a couple can trigger automatically.

| Skill | Trigger | Notes |
|---|---|---|
| `mem-search` | Automatic | Fires when you ask "did we solve this before / how did we handle X last time" — searches claude-mem's own DB (separate from the memory files in this project). |
| `smart-explore` | Automatic | Token-optimized structural (AST) code search — an alternative to reading whole files. |
| `smart-search`, `smart-unfold`, `smart-outline`, `timeline`, `important_workflow` (MCP tools) | Automatic, on demand | Backing tools for the above; loaded via `ToolSearch` when relevant. |
| `make-plan` | Manual — `/claude-mem:make-plan` | Phased implementation plan with doc discovery. |
| `do` | Manual — `/claude-mem:do` | Executes a phased plan via subagents. |
| `learn-codebase` | Manual — `/claude-mem:learn-codebase` | Reads every source file to "prime" on a new/unfamiliar repo. |
| `standup` | Manual | Compares worktrees/branches/PRs, read-only. |
| `babysit` | Manual | Watches a PR/review cycle until mergeable. |
| `oh-my-issues` | Manual | Clusters a GitHub issue backlog by root cause. |
| `pathfinder` | Manual | Maps a codebase into flowcharts, flags duplicated systems. |
| `design-is` | Manual | Audits a UI against Dieter Rams' principles. |
| `knowledge-agent` | Manual | Builds/queries topic-focused "brains" from observation history. |
| `timeline-report`, `weekly-digests` | Manual | Narrative reports of project history from the claude-mem timeline. |
| `what-the` | Manual | Plain-English breakdown of something technical. |
| `wowerpoint` | Manual | Turns a document into a slide-deck PDF. |
| `cloud-sync` | Manual | Sets up claude-mem's own cloud backup (cmem.ai) — unrelated to Claude Code plugin sync, see below. |
| `how-it-works` | Manual | Explains claude-mem's own capture/injection mechanism. |
| `version-bump` | Manual | Release automation for claude-mem itself, not relevant to this repo. |

---

## Using this on another device

Plugins are **user-level, not project-level** — confirmed by inspecting `~/.claude/plugins/` on this machine: marketplaces and installed plugin code live under your home directory (`~/.claude/plugins/marketplaces/`, `~/.claude/plugins/cache/`), and enabled state lives in `~/.claude/settings.json` / `~/.claude/plugins/installed_plugins.json`. None of that is inside this git repo, so cloning or pulling `OxygenQuiz` on another device will **not** bring these plugins with it — same Claude account or not.

To reproduce this setup on another device, replay the install commands there:

```
/plugin install skill-creator@claude-plugins-official
/plugin install superpowers@claude-plugins-official
/plugin install frontend-design@claude-plugins-official
/plugin marketplace add mksglu/context-mode
/plugin install context-mode@context-mode
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem@thedotmack
/reload-plugins
```

Note: `claude-mem`'s own `cloud-sync` skill syncs its *memory observations* to a cmem.ai account — that's a separate concern from plugin installation and won't install the plugin itself on a new device either.
