#!/usr/bin/env python3
"""Generate a clean high-level map of a RealAI / Blackbox style monorepo.
Usage:
  python repo_map.py [root] [--depth N] [--json]
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

DEFAULT_IGNORE = {
    "node_modules", ".git", ".venv", "venv", "__pycache__",
    ".backup", "archive", "RealAI_Recovery_SAFE", "realai_historical_backups",
    ".pytest_cache", ".egg-info", "logs", "logs_data", "Output",
    "weights", "hf", "checkpoints",
}

INTERESTING_TOP = {
    "agents", "apps", "core", "packages", "providers", "scanners",
    "scripts", "src", "tests", "docs", "config", "schema",
    ".blackbox", "aura", "realai", "realai-core", "realai-backend",
}


def should_ignore(name: str) -> bool:
    if name in DEFAULT_IGNORE:
        return True
    if name.startswith(".") and name not in {".blackbox", ".github", ".continue"}:
        return True
    return False


def walk(root: Path, max_depth: int, current_depth: int = 0) -> dict:
    entry = {"name": root.name, "type": "dir", "children": []}
    if current_depth >= max_depth:
        return entry
    try:
        for child in sorted(root.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
            if should_ignore(child.name):
                continue
            if child.is_dir():
                entry["children"].append(walk(child, max_depth, current_depth + 1))
            else:
                entry["children"].append({"name": child.name, "type": "file"})
    except PermissionError:
        entry["error"] = "permission denied"
    return entry


def summary(root: Path) -> dict:
    top_dirs = []
    for p in sorted(root.iterdir()):
        if p.is_dir() and not should_ignore(p.name):
            top_dirs.append(p.name)
    return {
        "root": str(root.resolve()),
        "top_level": top_dirs,
        "interesting": [d for d in top_dirs if d in INTERESTING_TOP],
        "has_blackbox": (root / ".blackbox").is_dir(),
        "has_agents": (root / "agents").is_dir(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Repo map for Blackbox / RealAI")
    parser.add_argument("root", nargs="?", default=".", help="Repository root")
    parser.add_argument("--depth", type=int, default=2, help="Max directory depth")
    parser.add_argument("--json", action="store_true", help="Emit JSON")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.is_dir():
        raise SystemExit(f"Not a directory: {root}")

    data = {
        "summary": summary(root),
        "tree": walk(root, args.depth),
    }

    if args.json:
        print(json.dumps(data, indent=2))
    else:
        s = data["summary"]
        print(f"Root: {s['root']}")
        print(f"Has .blackbox: {s['has_blackbox']}")
        print(f"Has agents/:  {s['has_agents']}")
        print("\nTop-level directories:")
        for d in s["top_level"]:
            mark = " *" if d in s["interesting"] else ""
            print(f"  {d}{mark}")
        print("\n(* = core RealAI / Blackbox areas)")


if __name__ == "__main__":
    main()
