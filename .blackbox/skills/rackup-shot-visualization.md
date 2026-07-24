---
name: rackup-shot-visualization
description: Human-friendly Shot of the Day diagrams — instructor style with original drill tokens.
---

# RackUp Shot Visualization

## Style goals
- Feel like a fun training drill (inspired by the *idea* of table markers), not a CAD drawing.
- Fully original markers — **never** real playing-card faces, suits, or copyrighted layouts.
- Self-explanatory diagram: no coordinate dumps, no ASCII legends, no machine jargon.

## Visual requirements
- **Table:** realistic felt, wood rails, diamonds (3 long / 2 short), open pocket mouths.
- **Balls:** white cue ball; standard pool colors for object balls (1 yellow … 8 black; stripes 9–15).
- **Paths:**
  - Cue approach → contact (cream / white solid + arrow)
  - Object ball → pocket (OB color + arrow)
  - Cue after contact (soft dashed + rest ring)
- **Ghost ball / tangent:** only when the cut needs them.
- **Drill tokens:** 3–6 original numbered shapes (disc, triangle, diamond, hex, tile, star) marking the shot sequence on the cloth.

## Table size
- Toggle **7-foot barbox** vs **9-foot tournament**.
- Same 2:1 cloth; adjust ball size, pocket size, rail thickness, and diamond spacing.

## Coaching copy (plain language)
- Where to aim
- What spin to use
- What speed to hit
- What the cue ball will do after contact
- Why this works
- Common mistakes

## Data (internal only — do not show raw to players)
- Geometry may use normalized points `x 0–100`, `y 0–50` for rendering.
- Frontend derives paths + markers via `shot-map-geometry.ts`.
- Do not surface coordinates, vectors, or provider metadata in the UI.

## Legal / originality
- Do **not** copy Mike Massey’s card layouts, card faces, or exact drills.
- You may use the general concept of “markers on the table” for practice patterns.
- All diagrams, token shapes, and shot sequences must be RackUp originals.
