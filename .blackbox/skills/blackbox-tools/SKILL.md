---
name: blackbox-tools
description: Create manage and extend tool skills for Blackbox AI agents that deliver complete repo-wide abilities. Covers file system navigation code search git operations testing builds multi-agent orchestration scanners providers and RealAI domain tools. Trigger on tool skills, repo tools, blackbox tools, complete tools, repo-wide abilities, or /tool commands.
---

# Blackbox Tools

## Overview

This skill equips Blackbox agents with a complete toolkit for operating across an entire repository. It standardizes how tools are defined, discovered, invoked, and composed so agents can navigate, modify, test, and orchestrate any part of a complex monorepo (such as RealAI) without fragmentation.

## Core Principles

- Tools are first-class, discoverable capabilities registered under `.blackbox/skills/` or `agents/tools/`.
- Every tool must declare its name, description, parameters, and side-effect level (read-only / write / destructive).
- Prefer progressive disclosure: expose metadata first, load full implementation only when needed.
- Repo-wide tools must work from any working directory and respect `.gitignore` / `.blackboxignore`.
- Compose tools into workflows rather than creating monolithic tools.

## Tool Skill Structure

Create each tool skill as:

```
.blackbox/skills/<tool-name>/
├── SKILL.md          # Frontmatter + usage instructions
├── scripts/          # Executable implementations (Python, JS, shell)
├── references/       # Detailed schemas, examples, error catalogs
└── assets/           # Templates, configs, fixtures
```

Frontmatter rules (strict):

```yaml
---
name: kebab-case-name
description: What the tool does and when an agent should invoke it. Plain scalar only. No colon-space, no angle brackets.
---
```

## Standard Repo-Wide Tool Categories

Implement or extend tools in these categories for full coverage:

### 1. Navigation & Discovery
- `list_dir` / `tree` — recursive directory listing with ignore filters
- `find_files` — glob + regex search by name or content
- `repo_map` — high-level structural summary (modules, entry points, dependencies)
- `locate_symbol` — jump to definition / references across languages

### 2. File & Content Operations
- `read_file` / `read_range` — safe partial reads for large files
- `write_file` / `edit_file` — atomic writes with backup and diff preview
- `search_replace` — multi-file search-and-replace with dry-run
- `diff_files` — unified or side-by-side diffs

### 3. Git & Version Control
- `git_status` / `git_log` / `git_diff`
- `git_branch` / `git_checkout` / `git_commit` (with conventional message helper)
- `git_stash` / `git_worktree`
- Safe guards against force-push or hard-reset unless explicitly confirmed

### 4. Build, Test & CI
- `run_tests` — pytest / jest / vitest with filtering and coverage
- `build` — pnpm / pip / docker build targets
- `lint` / `typecheck` — aggregate results across packages
- `ci_status` — query GitHub Actions or local CI

### 5. Agent & Orchestration
- `spawn_agent` — launch specialist agents (coder, devops, fullstack, scanner)
- `agent_status` / `agent_result`
- `tool_registry` — list all available tools and their schemas
- `compose_workflow` — chain tools into a named pipeline

### 6. RealAI / Domain Specific
- `cavity_scan` — run full / alt / tri cavity searches
- `model_manifest` — inspect realai-1.0, overseer, vision, embed models
- `provider_list` / `provider_switch`
- `memory_store` / `knowledge_query`
- `phase_tools` — phase4 / phase5 merge and preview helpers

### 7. Safety & Observability
- `dry_run` — preview any mutating tool
- `audit_log` — record tool invocations
- `sandbox_exec` — run untrusted code in isolated environment
- `resource_usage` — track token, CPU, disk consumption

## Creating a New Tool Skill

1. Run in Blackbox CLI:
   ```
   /skill create <tool-name>
   ```
2. Fill SKILL.md with clear trigger phrases and parameter schema.
3. Place deterministic logic in `scripts/` (prefer Python or Node for cross-platform).
4. Document edge cases and error codes in `references/`.
5. Register the tool so `tool_registry` discovers it automatically.
6. Validate:
   ```
   /skill validate <tool-name>
   ```
7. Test with a real agent session before promoting to production.

## Invocation Patterns for Agents

When an agent needs repo-wide capability:

- Prefer named tools over ad-hoc shell: `use tool find_files --pattern "**/*.py" --content "orchestrator"`
- Always request dry-run for write operations first.
- For multi-step tasks, use `compose_workflow` or spawn a specialist agent.
- After any write, re-run `git_status` and relevant tests.
- Surface progress and intermediate artifacts so the human or parent agent can intervene.

## Example Tool Skills to Implement First

1. **repo-map** — generate a clean structural overview excluding node_modules, .venv, backups.
2. **safe-edit** — edit with automatic backup, diff, and rollback on test failure.
3. **cross-package-test** — discover and run tests that touch a given module across the monorepo.
4. **agent-router** — decide which specialist agent (coder, devops, scanner, fullstack) is best for a task.
5. **blackbox-sync** — keep `.blackbox/skills` and `agents/tools` in sync.

## Integration with Existing RealAI Layout

- Place new skills under `C:\realai\.blackbox\skills\` (or the recovered equivalent).
- Mirror critical tools into `agents/tools/` for legacy agent discovery.
- Update `tools.md` and `AGENTS.md` when adding or changing tools.
- Keep scanners and phase tools under their existing packages; expose thin skill wrappers.

## Validation Checklist

Before considering a tool skill complete:

- [ ] Frontmatter validates (no forbidden characters)
- [ ] Scripts are executable and idempotent where possible
- [ ] Dry-run mode exists for any write path
- [ ] Errors return structured messages agents can parse
- [ ] Works from any subdirectory of the repo root
- [ ] Documented in tool_registry and AGENTS.md
- [ ] Tested against at least one real agent workflow

## Next Actions

When the user asks for a specific tool:

1. Confirm the exact capability and safety level required.
2. Scaffold the skill directory.
3. Implement the core script.
4. Write references and examples.
5. Validate and demonstrate with a sample invocation.
