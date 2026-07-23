---
name: rackup-shot-visualization
description: Standardized shot diagram format for frontend rendering.
---

# Rackup Shot Visualization

## Instructions
- **Coordinate System:** Use a normalized table plane, e.g., `width=100`, `height=50`.
- **Balls:** Each ball has `{ id, x, y, radius }`.
- **Cue Path:** Represent cue ball path as an ordered array of segments `{ fromX, fromY, toX, toY }`.
- **Final Positions:** Include final positions for all balls after the shot.
- **Output:** Must be JSON-serializable and easy for React to render as a top-down table.
- **Integration:** Used by RealAI V2, Hall feed, tournament/league summaries.

## Examples
- Return:
  - `balls: [{ id: 'cue', x: 10, y: 25 }, { id: '1', x: 40, y: 20 }]`
  - `cuePath: [{ fromX: 10, fromY: 25, toX: 40, toY: 20 }]`
  - `finalBalls: [{ id: '1', x: 80, y: 10 }]`
