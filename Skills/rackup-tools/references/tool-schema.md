# Tool Schema Reference — Live RackUp

## Example: Matchmaking V2 Search

```json
{
  "name": "mm_v2_search",
  "description": "Search the Matchmaking V2 Redis queue using haversine + radius + skill filters.",
  "parameters": {
    "type": "object",
    "properties": {
      "lat": { "type": "number" },
      "lng": { "type": "number" },
      "radius_km": { "type": "number", "default": 25 },
      "game_type": { "type": "string", "enum": ["8-ball", "9-ball", "10-ball", "one-pocket", "any"] },
      "min_rating": { "type": "number" },
      "max_rating": { "type": "number" }
    },
    "required": ["lat", "lng"]
  },
  "side_effect": "write",
  "redis_namespace": "matchmaking:v2:*",
  "returns": {
    "type": "object",
    "properties": {
      "queue_id": { "type": "string" },
      "status": { "type": "string" },
      "expires_at": { "type": "string", "format": "date-time" }
    }
  }
}
```

## Example: Money Match Complete

```json
{
  "name": "money_match_complete",
  "description": "Complete a money match after both players have confirmed. Triggers Elo, memories, and notifications.",
  "parameters": {
    "type": "object",
    "properties": {
      "match_id": { "type": "string" },
      "winner_id": { "type": "string" },
      "score_a": { "type": "integer" },
      "score_b": { "type": "integer" },
      "confirmed_by": {
        "type": "array",
        "items": { "type": "string" },
        "minItems": 2
      }
    },
    "required": ["match_id", "winner_id", "score_a", "score_b", "confirmed_by"]
  },
  "side_effect": "money",
  "returns": {
    "type": "object",
    "properties": {
      "match_id": { "type": "string" },
      "elo_updated": { "type": "boolean" },
      "memories_created": { "type": "boolean" },
      "notifications_sent": { "type": "boolean" }
    }
  }
}
```

## Side-Effect Levels

| Level     | Meaning                                      | Policy                                      |
|-----------|----------------------------------------------|---------------------------------------------|
| read-only | Pure query                                   | Always safe                                 |
| write     | Creates/updates non-money state              | Prefer dry-run                              |
| money     | Touches money-match confirm/complete/Elo     | Both players must confirm + audit           |
| location  | Check-in / geo / live pulse                  | Honor privacy flags                         |
| destructive | Deletes or resets ratings/standings        | Explicit human approval                     |
