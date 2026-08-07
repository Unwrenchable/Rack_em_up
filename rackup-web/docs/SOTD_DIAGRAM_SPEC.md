# SOTD Diagram Spec (Instructor-Grade)

Rendering contract for RackUp Shot of the Day. Implement in `table-geometry.ts` + `ShotMapDiagram.tsx`.

## Coordinate system (cloth)

| Axis | Range | Meaning |
|------|--------|---------|
| `x` | `0 → L` | Head rail → foot rail |
| `y` | `0 → S` | Near long rail → far long rail |

**Normalized diagram cloth is always L = 100, S = 50 (2:1)** so API shot maps stay aligned.

Physical table size only changes:

- rail thickness (from real rail width)
- diamond inset from cushion nose (~3-11/16″ scaled)
- pocket mouth sizes
- ball radius
- **on-screen display scale** (7ft ≈ 78% of 9ft width — still 2:1)

---

## Physical reference (cushion nose → cushion nose)

| Size | Cloth (W × L) | Long diamond spacing | Notes |
|------|----------------|----------------------|--------|
| **9 ft** | 50″ × 100″ | **12.5″** (L/8) | WPA full size |
| **7 ft** | ~39″ × 78″ | **~9.75″** (L/8) | Barbox (38–40 × 76–80) |
| 8 ft (ref) | ~46″ × 92″ | **11.5″** | Not rendered; spacing check |

Diamond centerline from cushion nose into rail wood: **~3-11/16″ (3.6875″)** on 9ft; scaled for 7ft.

---

## Diamonds (WPA-style — 18 sights)

### Long rails (6 diamonds each)

**8 equal segments** from corner pocket center to corner pocket center.  
**No diamond on the side pocket** (segment 4).

```
L × [1/8, 2/8, 3/8, 5/8, 6/8, 7/8]
```

- Near long rail (`y = 0`): `(L·f, 0)`
- Far long rail (`y = S`): `(L·f, S)`
- Side pockets at `L/2` (exactly between 3/8 and 5/8)

### Short rails (3 diamonds each)

**4 equal segments** corner → corner:

```
S × [1/4, 2/4, 3/4]
```

- Head (`x = 0`): `(0, S·f)`
- Foot (`x = L): `(L, S·f)`

### Rendering

- Draw on **wood rail** outside cloth at `diamondRailInset` from cloth edge.
- Small ivory diamond mark (`#e8d5a3`).
- Same **fractions** for 7ft and 9ft; physical spacing changes with cloth inches.

**Total: 6+6+3+3 = 18 sights** (corners are pockets, not diamond marks).

---

## Pockets

Six centers on cloth perimeter. Trapezoid mouths with jaws; 7ft slightly more open relatively.

---

## 7ft ↔ 9ft switch

1. Rebuild geometry via `buildTableGeometry(size)`.
2. Keep shot coordinates in 0–100 × 0–50.
3. Change `maxWidth` via `displayScale` (7ft smaller).
4. Preserve `aspectRatio` from viewBox so the table never stretches.

Do **not** change L/S of the normalized cloth when toggling size.
