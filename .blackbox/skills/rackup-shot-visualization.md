---
name: rackup-shot-visualization
description: Human-friendly Shot of the Day diagrams — instructor style with original drill tokens.
---

# RackUp Shot Visualization

Full implementer spec: `rackup-web/docs/SOTD_DIAGRAM_SPEC.md`.

## Style goals
- Instructor-grade, player-friendly — not CAD / not machine dumps.
- Diamonds from real pocket-center geometry (L×odd/12, S×k/4).
- Self-explanatory: no coordinates, ASCII legends, or provider jargon in the UI.

## Visual requirements
- **Diamonds:** 6 per long rail at L·[1,3,5,7,9,11]/12; 3 per short rail at S·[1,2,3]/4.
- **Pockets:** trapezoid mouths with jaw angles (corner 20–28°, side 10–18°) + shelf depth.
- **Paths (always three):** CB→OB (cream solid), OB→pocket (OB color solid), CB after (cream dashed).
- **Balls:** white cue; standard solid/stripe colors; no letter labels on cue.
- **Markers:** optional original shapes only on multi-step drills — never gold card tokens or real card faces.

## Table size
- Toggle **7-ft barbox** vs **9-ft tournament** via `buildTableGeometry(size)`.
- Same fractional diamond rules; scale ball, rail, pocket mouths.

## Coaching (every SOTD)
- One-line drill label · 2–3 purpose lines · aim · english · speed · CB finish zone · common mistakes.

## Modules
- `table-geometry.ts` · `shot-map-geometry.ts` · `ShotMapDiagram.tsx` · `ShotCard.tsx`

## Legal
- Original RackUp art only. Do not copy copyrighted card layouts or commercial drills.
