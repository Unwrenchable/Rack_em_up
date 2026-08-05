# RealAI Repo Tool Hotspots

Use these paths when building or invoking repo-wide tools inside the RealAI monorepo.

## Primary Skill & Tool Locations
- `.blackbox/skills/` — modern skill definitions
- `agents/tools/` — legacy / agent-discoverable tools (browse, web-search, etc.)
- `aura/skills/` — Aura skill implementations (code, file_io, web, registry)
- `core/tools/` — core runtime tools
- `phase4_tools/` and `phase5_merge/` — specialized phase tooling
- `scanners/` — cavity and spectrum scanners
- `scripts/` — utility scripts

## Key Entry Points
- `orchestrator.py` / `main.py` / `api_server.py`
- `apps/api/`, `apps/frontend/`, `apps/desktop/`, `apps/vscode/`
- `providers/` and `models/`
- `realai/` package (cli, memory, models, sdk, server)

## Recommended First Tools to Wrap
1. Cavity scanners (`realai_full_cavity_search.py`, alt/tri variants)
2. Model manifest readers under `llama-vulkan/models/realai-*`
3. Repo tree generators that exclude the heavy backup and node_modules trees
4. Safe merge helpers from phase5
5. Knowledge / memory store query wrappers around `realai_knowledge_store.json` and `realai_memory/`

## Ignore Patterns for Repo-Wide Scans
Always exclude by default:
- `node_modules/`, `.venv/`, `venv/`, `__pycache__/`
- `.backup/`, `realai_historical_backups/`, `archive/`, `RealAI_Recovery_SAFE/`
- `*.egg-info/`, `.pytest_cache/`, `.git/`
- Large binary / weight directories under models/
