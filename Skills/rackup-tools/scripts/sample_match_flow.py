#!/usr/bin/env python3
"""Simple demonstration of a RackUp match flow (dry-run style).
This is a skeleton agents can expand into real tools.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any


def find_nearby_players(lat: float, lng: float, game_type: str = "any", radius_km: float = 15) -> list[dict]:
    """Stub — replace with real geo + rating query."""
    return [
        {
            "player_id": "p_1001",
            "display_name": "VegasAce",
            "rating": 582,
            "distance_km": 2.4,
            "preferred_games": ["9-ball", "10-ball"],
            "is_checked_in": True,
        },
        {
            "player_id": "p_1042",
            "display_name": "RackAttack",
            "rating": 561,
            "distance_km": 5.1,
            "preferred_games": ["8-ball"],
            "is_checked_in": False,
        },
    ]


def create_match(
    player_a: str,
    player_b: str,
    game_type: str,
    race_to: int,
    stakes: str = "friendly",
    dry_run: bool = True,
) -> dict[str, Any]:
    match = {
        "match_id": "m_" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
        "player_a": player_a,
        "player_b": player_b,
        "game_type": game_type,
        "race_to": race_to,
        "stakes": stakes,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "dry_run": dry_run,
    }
    return match


def report_result(
    match_id: str,
    winner_id: str,
    score_a: int,
    score_b: int,
    confirmed_by: list[str],
    dry_run: bool = True,
) -> dict[str, Any]:
    if len(set(confirmed_by)) < 2 and not dry_run:
        raise ValueError("Both players must confirm a money or ranked result")
    return {
        "match_id": match_id,
        "winner_id": winner_id,
        "score": f"{score_a}-{score_b}",
        "confirmed_by": confirmed_by,
        "status": "completed" if not dry_run else "dry_run_completed",
        "stats_updated": not dry_run,
    }


if __name__ == "__main__":
    nearby = find_nearby_players(36.1699, -115.1398, game_type="9-ball")
    print("Nearby players:")
    print(json.dumps(nearby, indent=2))

    match = create_match("p_1001", "p_1042", "9-ball", race_to=7, stakes="friendly", dry_run=True)
    print("\nCreated match (dry-run):")
    print(json.dumps(match, indent=2))

    result = report_result(match["match_id"], "p_1001", 7, 4, confirmed_by=["p_1001", "p_1042"], dry_run=True)
    print("\nResult (dry-run):")
    print(json.dumps(result, indent=2))
