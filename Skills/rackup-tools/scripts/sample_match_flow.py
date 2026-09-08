#!/usr/bin/env python3
"""Dry-run RackUp match flow skeleton.

Does not call RealAI. Rating writes in production go through
POST /v1/plugins/rackup-coach ability=rating_update after dual confirm.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any


def find_nearby_players(lat: float, lng: float, game_type: str = "any", radius_km: float = 15) -> list[dict]:
    return [
        {
            "player_id": "p_1001",
            "display_name": "VegasAce",
            "rating": 582,
            "distance_km": 2.4,
            "preferred_games": ["9-ball", "10-ball"],
            "is_checked_in": True,
        }
    ]


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
        "rating_owner": "realai_rating_update",
        "note": "Do not apply local Elo unless REALAI_FALLBACK_LOCAL_ELO=1",
    }


if __name__ == "__main__":
    print(json.dumps(report_result("m_demo", "p_1001", 7, 4, ["p_1001", "p_1042"], True), indent=2))
