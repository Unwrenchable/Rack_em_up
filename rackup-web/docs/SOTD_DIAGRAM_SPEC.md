# SOTD Diagram Spec (Instructor-Grade)

Rendering contract for RackUp Shot of the Day. Implement in `table-geometry.ts` + `ShotMapDiagram.tsx`.

## Coordinate system (cloth)

| Axis | Range | Meaning |
|------|--------|---------|
| `x` | `0 → L` | Head rail → foot rail |
| `y` | `0 → S` | Near long rail → far long rail |

Diagram cloth is always **L = 100**, **S = 50** (2:1). Physical 7-ft vs 9-ft differences are expressed by **ball radius, rail thickness, and pocket mouth sizes**, not by changing the fractional diamond rules.

Ball / path positions from the API use this same normalized cloth plane.

---

## 1. Pocket centers

Six pocket centers on the cloth perimeter:

| Id | Center |
|----|--------|
| head-near | `(0, 0)` |
| head-far | `(0, S)` |
| side-near | `(L/2, 0)` |
| side-far | `(L/2, S)` |
| foot-near | `(L, 0)` |
| foot-far | `(L, S)` |

**L** = distance between long-rail corner pocket centers = `cloth.length`  
**S** = distance between short-rail corner pocket centers = `cloth.width`

Do **not** place diamonds on a uniform SVG pixel grid. Always derive from L and S.

---

## 2. Diamonds (real pool geometry)

### Long rails (6 diamonds each)

Fractions of **L** (corner → corner along that long rail):

```
L × [1/12, 3/12, 5/12, 7/12, 9/12, 11/12]
```

- Near long rail (`y = 0`): points `(L·f, 0)`
- Far long rail (`y = S`): points `(L·f, S)`
- Side pockets sit at `L/2` (between 5/12 and 7/12) — no diamond on the side pocket mouth

### Short rails (3 diamonds each)

Fractions of **S** (corner → corner along that short rail):

```
S × [1/4, 2/4, 3/4]
```

- Head rail (`x = 0`): points `(0, S·f)`
- Foot rail (`x = L`): points `(L, S·f)`

### Rendering

- Draw diamonds on the **wood rail** outside the cloth, aligned to the cloth-edge fraction.
- Shape: small diamond (rhombus) or disc, cream/ivory fill (`#e8d5a3`).
- Same fractional rules for 7-ft and 9-ft; only rail thickness / mark size scales.

---

## 3. Pockets (trapezoid mouths)

### Corner pockets

- Mouth width: ~4.6 cloth units (9-ft), ~5.4 (7-ft)
- Jaw angle: **20–28°** (use ~22° 9-ft / ~24° 7-ft)
- Shelf depth: ~2.1–2.4 units into the pocket (outside cloth)
- Polygon: mouth points on each adjacent rail → flared jaw tips → shelf back

### Side pockets

- Mouth width: wider — ~5.5 (9-ft), ~6.4 (7-ft)
- Jaw angle: **10–18°** (use ~12° / ~14°)
- Shelf depth: ~1.85–2.1
- Polygon: left/right mouth on long rail → flared outer jaws → center shelf

### Visual

- Fill: near-black (`#050505`)
- Target pocket: soft green glow ring on mouth center
- Include mouth-to-shelf transition (polygon, not a plain circle alone)

---

## 4. Paths (always three)

| Path | Style | Meaning |
|------|--------|---------|
| **CB → OB** | Solid cream `#f5f0e6`, weight ~1.0, arrow | Cue approach (rail-first segments allowed) |
| **OB → pocket** | Solid **object-ball color**, weight ~0.95, arrow | Shows cut angle and pocket target |
| **CB post-contact** | Dashed cream ~65% opacity, weight ~0.72, arrow + rest ring | Expected cue finish |

Optional (when cut needs it):

- Ghost ball: dashed white circle at aim contact
- Tangent tick: soft gold dashed line (stun cuts)

**Never** draw only one combined path.

---

## 5. Balls

| Ball | Fill |
|------|------|
| Cue | White `#f8f8f8` — **never** yellow, never letter “C” |
| 1–7 solids | Standard solid hues |
| 8 | Black |
| 9–15 | Stripe (color caps + white band) |

Numbers on object balls only (1–15). No coordinate labels.

---

## 6. Training markers (optional)

- **Default simple shots:** no sequence markers — paths are enough.
- **Multi-rail / multi-ball / bank-kick patterns:** 3–6 original markers (triangle, star, disc, diamond), slate/mint fill — **not** gold card chips, **not** playing-card faces or suits.
- Numbered 1…n for sequence only.

---

## 7. Table sizes

| | 9-ft tournament | 7-ft barbox |
|--|-----------------|-------------|
| Cloth (diagram) | 100 × 50 | 100 × 50 |
| Diamond fractions | Same L/S rules | Same L/S rules |
| Ball radius | ~2.15 | ~2.65 (reads larger) |
| Rail thickness | ~5.6 | ~6.4 |
| Corner / side mouths | 4.6 / 5.5 | 5.4 / 6.4 |

Toggle in UI; preference may persist (`rackup_sotd_table`).

---

## 8. Line weights & colors (summary)

| Element | Color | Notes |
|---------|--------|------|
| Cloth | Green radial `#1a6b3c → #0a3320` | |
| Wood rails | Brown gradient | Gold outer stroke |
| Diamonds | `#e8d5a3` | On rail wood |
| CB path | `#f5f0e6` solid | |
| OB path | Ball fill solid | |
| CB after | Cream dashed | Rest ring at end |
| Target pocket | `#5ad4a0` glow | |

---

## 9. Coaching copy (player-facing)

For every SOTD card:

1. **Drill label** (one line) — e.g. “Stun to side pocket — stun drill”
2. **Purpose** (2–3 lines) — what is practiced and why
3. **Aim point** — where to hit the OB or rail (plain language)
4. **English** — tip position + type (“half-tip outside, soft stun”)
5. **Speed** — soft / medium / firm + feel note
6. **Expected CB finish** — table **zone** (e.g. “near the foot half, close to the near long rail”), never coordinates
7. **Common mistakes** — over-hit, under-spin, wrong line, etc.

**Forbidden in UI:** coordinates, vectors, normalized percents, ASCII legends, RealAI/provider dumps.

### Short caption (under diagram)

One human sentence blending label + aim + english + speed, no jargon.

---

## 10. Implementation map

| Concern | Module |
|---------|--------|
| L, S, diamonds, pocket polygons | `src/lib/table-geometry.ts` → `buildTableGeometry(size)` |
| Three paths, finish zone, optional markers | `src/lib/shot-map-geometry.ts` → `deriveShotGeometry(map)` |
| SVG render | `src/components/ShotMapDiagram.tsx` |
| Coaching UI + 7/9 toggle | `src/components/ShotCard.tsx` |
| Ball colors | `src/lib/pool-ball-colors.ts` |

### Example diamond compute

```ts
const L = cloth.length; // corner→corner long rail
const S = cloth.width;  // corner→corner short rail
const longNear = [1,3,5,7,9,11].map(k => ({ x: L * (k/12), y: 0 }));
const shortHead = [1,2,3].map(k => ({ x: 0, y: S * (k/4) }));
```

---

## Legal / style

- Instructor-grade, player-friendly diagrams.
- Original training markers only when needed.
- Do not copy copyrighted card layouts or commercial drill art.
