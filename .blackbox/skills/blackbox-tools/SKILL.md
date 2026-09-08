---
name: blackbox-tools
description: Create manage and extend generic Blackbox repo tools (files, git, test, agents). RealAI monorepo scanners live only in references/realai-tool-map.md and must never run against RackUp. Trigger on tool skills, repo tools, blackbox tools, complete tools, repo-wide abilities, or /tool commands.
---

# Blackbox Tools

**Workspace fence**
- If the repo is `Unwrenchable/Rack_em_up` (or `rackup-backend` / `rackup-web` are present), use **rackup-tools** + **rackup-grok-bot**. Do not run cavity scans, model-manifest, phase4/phase5, or anything under the RealAI monorepo.
- RealAI is an HTTP provider to RackUp (`POST /v1/plugins/rackup-coach`). It is not this repo.
- `references/realai-tool-map.md` applies only when the open root is the RealAI monorepo.
