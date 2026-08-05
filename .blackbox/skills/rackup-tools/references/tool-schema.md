# Tool Schema Reference (RackUp)

Every tool skill should expose a machine-readable schema.

## Example Schema

```json
{
  "name": "find_nearby_players",
  "description": "Find pool players near a location filtered by skill rating and preferred game type.",
  "parameters": {
    "type": "object",
    "properties": {
      "lat": { "type": "number" },
      "lng": { "type": "number" },
      "radius_km": { "type": "number", "default": 15 },
      "game_type": { "type": "string", "enum": ["8-ball", "9-ball", "10-ball", "one-pocket", "any"] },
      "min_rating": { "type": "number" },
      "max_rating": { "type": "number" },
      "stakes": { "type": "string", "enum": ["friendly", "money", "any"] }
    },
    "required": ["lat", "lng"]
  },
  "side_effect": "read-only",
  "returns": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "player_id": { "type": "string" },
        "display_name": { "type": "string" },
        "rating": { "type": "number" },
        "distance_km": { "type": "number" },
        "preferred_games": { "type": "array", "items": { "type": "string" } },
        "is_checked_in": { "type": "boolean" }
      }
    }
  }
}
```

## Side-Effect Levels

| Level        | Meaning                                      | Agent Policy                          |
|--------------|----------------------------------------------|---------------------------------------|
| read-only    | No state changes                             | Always safe                           |
| write        | Creates or updates matches, profiles, etc.   | Dry-run first                         |
| destructive  | Deletes data or resets ratings               | Explicit human approval               |
| money        | Touches stakes, leaderboards, verification   | Both players + dry-run + audit        |
| location     | Uses or stores geo data                      | Check privacy flags                   |
