# Tool Schema Reference — Live RackUp

## Example: RackUp Coach Invoke

```json
{
  "name": "rackup_coach_invoke",
  "description": "Call RealAI rackup-coach through the Nest gate. External provider only.",
  "parameters": {
    "type": "object",
    "properties": {
      "ability": { "type": "string" },
      "player_id": { "type": "string" },
      "payload": { "type": "object" },
      "dry_run": { "type": "boolean", "default": true }
    },
    "required": ["ability", "player_id"]
  },
  "side_effect": "network",
  "endpoint": "POST /api/v1/realai/v2/coach-plugin",
  "provider": "POST {REALAI_BASE_URL}/v1/plugins/rackup-coach"
}
```

Do not wrap cavity_scan, model_manifest, or phase5 tools here.

## Side-Effect Levels

| Level | Meaning | Policy |
|---|---|---|
| read-only | Pure query | Always safe |
| write | Creates/updates non-money state | Prefer dry-run |
| money | Touches money-match confirm/complete/Elo | Both players must confirm + audit |
| location | Check-in / geo / live pulse | Honor privacy flags |
| destructive | Deletes or resets ratings/standings | Explicit human approval |
