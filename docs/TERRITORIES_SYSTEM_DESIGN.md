# Territories — System Design & Specification

> **Superseded for product naming.** The official competitive league system is **ROC — Rack of Champions**.  
> Use **[`docs/ROC_SYSTEM_DESIGN.md`](./ROC_SYSTEM_DESIGN.md)** as the source of truth.  
> This document is retained as an early draft of the same architecture.

**Document version:** 1.0.0  
**Date:** 2026-08-05  
**Status:** DRAFT / SUPERSEDED by ROC  
**Official name:** **ROC — Rack of Champions** (was “Territories”)  
**Positioning:** User-run league operating layer — all-inclusive yet serious. Casual players can join; high-level players respect competition, structure, ratings, and money. No gimmicks. Every dollar is visible at all times.

---

## 0. Product definition

### 0.1 What a Territory is

A **Territory** is a **user-created competitive operating unit** — a private (or public) league / club that:

- Runs **sessions** on a schedule (weekly night, multi-week season, one-off events).
- Supports **formats** (Singles → Scotch Doubles → Jack & Jill → Teams of 5) rolled out in order.
- Plays any supported **game style** (8-ball, 9-ball, 10-ball, one-pocket, RackUp Pyramid).
- Collects **dues, entry fees, side pots** with a **full public ledger**.
- **Automatically pays** prize-pool winners at **end of each session**.
- Uses **shared RackUp ratings**, halls, friends/chat, matchmaking hooks, and **RealAI** validation.

A Territory is **not** a black-box tournament series. It is a transparent **operating business** inside RackUp with an operator, players, optional teams, and a real-time money ledger.

### 0.2 Feel & non-negotiables

| Principle | Rule |
|-----------|------|
| Transparent money | Every inflow/outflow is a ledger row; balances are derived, never invented. |
| No black-box prizes | Players Fund balance and **projected place payouts** are always queryable. |
| Serious competition | Fixed formats, validated scores, shared ratings, audit trails. |
| Inclusive access | Any skill level can join if they meet Territory rules (open / invite / rating floor optional). |
| Sequential formats | Later formats never break earlier ones (format capability flags + polymorphic participants). |
| Expandable games | Game styles are registry codes, not hard-coded switches in money/standings. |

### 0.3 Roles

| Role | Who | Powers |
|------|-----|--------|
| **Territory Operator** | Owner user (player or hall operator) | Create Territory, config, seasons, sessions, approve entries, open/close sessions, override payouts (audited), manage roster/teams, view full ledger |
| **Co-operator / Admin** | Delegated (optional) | Subset of operator tools (configurable) |
| **Player** | Registered participant | Pay dues/entries, play matches, see ledger + projections, receive payouts |
| **Team Captain** | Teams of 5 (format 4) | Manage roster, confirm team entry payment, submit team lineups |
| **RackUp (platform)** | System | 20% platform share (default), co-host big events, compliance freezes, dispute escalation |

### 0.4 Format rollout order (exact)

| Phase | Format code | Name | Unlock when |
|-------|-------------|------|-------------|
| 1 | `SINGLES` | Singles | Day one |
| 2 | `SCOTCH_DOUBLES` | Scotch Doubles League | After Singles stable |
| 3 | `SCOTCH_JJ` | Scotch Jack & Jill | After doubles stable |
| 4 | `TEAMS_5` | Teams of 5 | After JJ stable |

Each Territory **declares** which formats it enables. New format codes are additive enums; existing Territory seasons keep their `format` frozen.

### 0.5 Supported game styles (day one)

| Code | Display |
|------|---------|
| `eight_ball` | 8-Ball |
| `nine_ball` | 9-Ball |
| `ten_ball` | 10-Ball |
| `one_pocket` | One Pocket |
| `pyramid` | RackUp Pyramid |

Adding a game later = register in `GameStyleRegistry` + RealAI knowledge; no ledger schema change.

---

## 1. Complete data models

All money fields are **integer cents** (`amount_cents: bigint`). Never floats for money.

### 1.1 Entity relationship (conceptual)

```
Territory
  ├── TerritoryMember (operator, admin, player)
  ├── TerritorySettings (split %, rules JSON, enabled formats)
  ├── Season
  │     ├── SeasonFormatConfig (format + game styles + schedule template)
  │     ├── Entry (player or team pays into season/session)
  │     ├── Team (format 2–4)
  │     │     └── TeamMember
  │     ├── Session
  │     │     ├── SessionParticipant (player or team competing that night)
  │     │     ├── TerritoryMatch
  │     │     ├── SidePot (optional)
  │     │     ├── Payout (final, per place, per payee)
  │     │     └── SessionCloseJob (auto-payout state machine)
  │     └── StandingSnapshot (materialized standings)
  ├── LedgerAccount (Players Fund, Operator, Platform, Escrow holding)
  ├── LedgerEntry (immutable append-only)
  └── Payment (external processor attempt linked to ledger)

PaymentIntent / Payment  ──►  LedgerEntry (CREDIT)
Payout execution         ──►  LedgerEntry (DEBIT) + Transfer
```

### 1.2 `Territory`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid PK | |
| `slug` | string unique | URL-safe |
| `name` | string | |
| `description` | text | |
| `status` | `DRAFT` \| `ACTIVE` \| `SUSPENDED` \| `ARCHIVED` | |
| `visibility` | `PUBLIC` \| `UNLISTED` \| `INVITE_ONLY` | |
| `owner_user_id` | uuid | Operator |
| `home_hall_id` | uuid? | Optional home venue |
| `region` | string? | |
| `enabled_formats` | jsonb string[] | e.g. `["SINGLES"]` then grows |
| `enabled_game_styles` | jsonb string[] | subset of registry |
| `default_split` | jsonb | see §2 |
| `rules_markdown` | text? | Custom rules players must accept |
| `rating_policy` | jsonb | min rating, use RealAI convert, etc. |
| `co_host_rackup` | boolean | Platform co-host events |
| `created_at` / `updated_at` | timestamptz | |

### 1.3 `TerritoryMember`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `territory_id` | uuid | |
| `user_id` | uuid | |
| `role` | `OPERATOR` \| `ADMIN` \| `PLAYER` | |
| `status` | `ACTIVE` \| `BANNED` \| `LEFT` | |
| `joined_at` | timestamptz | |

Unique `(territory_id, user_id)`.

### 1.4 `TerritorySettings` (optional 1:1 or columns on Territory)

| Field | Type | Notes |
|-------|------|-------|
| `default_dues_cents` | bigint | Season or weekly dues |
| `default_session_entry_cents` | bigint | Nightly entry |
| `currency` | `USD` (v1) | Expand later |
| `payout_method_policy` | `AUTO_WALLET` \| `AUTO_STRIPE` \| `MARK_PAID_MANUAL` | |
| `require_realai_validate` | boolean default true | |
| `allow_money_matches_inside` | boolean | |
| `allow_brackets_inside` | boolean | |

### 1.5 `Season`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `territory_id` | uuid | |
| `name` | string | e.g. "Fall 2026" |
| `status` | `DRAFT` \| `REGISTRATION` \| `ACTIVE` \| `COMPLETED` \| `CANCELLED` | |
| `format` | `SINGLES` \| `SCOTCH_DOUBLES` \| `SCOTCH_JJ` \| `TEAMS_5` | **Immutable after first paid entry** |
| `primary_game_style` | string | From registry |
| `allowed_game_styles` | jsonb | Multi-game seasons optional |
| `starts_on` / `ends_on` | date | |
| `schedule_json` | jsonb | Weekly template |
| `dues_cents` | bigint | Season dues (0 allowed) |
| `session_entry_cents` | bigint | Default per session |
| `split_override` | jsonb? | Else territory default |
| `payout_structure` | jsonb | Place % or fixed table — see §3 |
| `standings_policy` | jsonb | points for W/L, forfeit, bye |
| `max_entries` | int? | |
| `registration_opens_at` / `closes_at` | timestamptz? | |

**Invariant:** One season = one competitive format. Multi-format Territory runs **parallel seasons**, not mixed formats in one season.

### 1.6 Format-specific config (`Season.format_config` jsonb)

**Singles**
```json
{
  "pairing": "INDIVIDUAL",
  "gender_policy": "OPEN",
  "rating_impact": "INDIVIDUAL"
}
```

**Scotch Doubles**
```json
{
  "pairing": "FIXED_PARTNER",
  "scotch_rules": "ALTERNATE_SHOT",
  "partner_change_policy": "LOCKED_AFTER_WEEK_1",
  "rating_impact": "BOTH_PARTNERS",
  "payment_entity": "PARTNERSHIP"
}
```

**Scotch Jack & Jill**
```json
{
  "pairing": "MIXED_GENDER",
  "require_gender_declared": true,
  "pair_rule": "ONE_M_ONE_F",
  "scotch_rules": "ALTERNATE_SHOT",
  "rating_impact": "BOTH_PARTNERS",
  "payment_entity": "PARTNERSHIP"
}
```

**Teams of 5**
```json
{
  "roster_size": 5,
  "min_active_per_session": 3,
  "max_roster": 7,
  "lineup_deadline_minutes": 30,
  "rating_impact": "INDIVIDUAL_MATCHES_PLUS_TEAM_STANDINGS",
  "payment_entity": "TEAM",
  "captain_required": true
}
```

### 1.7 `Team`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `season_id` | uuid | |
| `name` | string | |
| `captain_user_id` | uuid | |
| `status` | `FORMING` \| `ACTIVE` \| `WITHDRAWN` | |
| `avatar_url` | text? | |

Used for doubles (2-person “team”), JJ, and Teams of 5. Singles has **no** team row (participant is user).

### 1.8 `TeamMember`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `team_id` | uuid | |
| `user_id` | uuid | |
| `role` | `CAPTAIN` \| `PLAYER` \| `SUB` | |
| `jersey_order` | int? | |
| `status` | `ACTIVE` \| `REMOVED` | |
| `joined_at` | timestamptz | |

### 1.9 Participant abstraction (critical for sequential formats)

**`CompetitorRef`** (polymorphic, used everywhere money + standings attach):

| Field | Type | Notes |
|-------|------|-------|
| `competitor_type` | `USER` \| `TEAM` | |
| `competitor_id` | uuid | `user_id` or `team_id` |

- Singles: always `USER`
- Doubles / JJ / Teams: standings & session payouts attach to `TEAM`; individual match rating can still hit `USER`s

### 1.10 `Entry`

Registration + payment obligation for a season (and optionally per-session).

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `season_id` | uuid | |
| `competitor_type` / `competitor_id` | | Who is entered |
| `entry_kind` | `SEASON_DUES` \| `SESSION_ENTRY` \| `EVENT_ENTRY` \| `SIDE_POT` | |
| `session_id` | uuid? | For session-scoped fees |
| `amount_due_cents` | bigint | |
| `amount_paid_cents` | bigint | Sum of successful payments |
| `status` | `DUE` \| `PARTIAL` \| `PAID` \| `WAIVED` \| `REFUNDED` \| `VOID` | |
| `payer_user_id` | uuid | Who paid (may differ from competitor for teams) |
| `created_at` | timestamptz | |

**Team payments:** one `Entry` per team with `competitor_type=TEAM`; optional child `EntrySplit` for who contributed how much.

### 1.11 `EntrySplit` (teams / doubles)

| Field | Type | Notes |
|-------|------|-------|
| `entry_id` | uuid | |
| `user_id` | uuid | |
| `share_cents` | bigint | What this user paid toward team entry |
| `payment_id` | uuid? | |

### 1.12 `Session`

One competitive night / unit of play that **closes with automatic payouts**.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `season_id` | uuid | |
| `territory_id` | uuid | denormalized |
| `name` | string | e.g. "Week 3" |
| `session_index` | int | 1..N |
| `status` | `SCHEDULED` \| `REGISTRATION` \| `LIVE` \| `SCORING` \| `PAYING_OUT` \| `CLOSED` \| `CANCELLED` | |
| `scheduled_start` / `scheduled_end` | timestamptz | |
| `opened_at` / `closed_at` | timestamptz? | |
| `game_style` | string | Session’s game (from registry) |
| `format` | same as season | Frozen copy |
| `entry_fee_cents` | bigint | Snapshot at open |
| `split_snapshot` | jsonb | Frozen % at open — never change mid-session |
| `payout_structure_snapshot` | jsonb | Frozen at open |
| `players_fund_session_cents` | bigint | Computed: portion of inflows tagged to this session’s prize pool |
| `bracket_mode` | `ROUND_ROBIN` \| `LADDER` \| `SINGLE_ELIM` \| `SWISS` \| `CUSTOM` | |
| `auto_payout` | boolean default true | |
| `close_summary_json` | jsonb? | Final breakdown after close |

### 1.13 `SessionParticipant`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `session_id` | uuid | |
| `competitor_type` / `competitor_id` | | |
| `seed` | int? | |
| `check_in_status` | `EXPECTED` \| `CHECKED_IN` \| `NO_SHOW` | |
| `entry_id` | uuid? | Session entry payment |
| `final_place` | int? | Set at close |
| `final_points` | int? | Session points |
| `payout_cents` | bigint default 0 | Filled at close |
| `payout_status` | `NONE` \| `PROJECTED` \| `PAID` \| `FAILED` \| `FORFEITED` | |

### 1.14 `TerritoryMatch`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `session_id` | uuid | |
| `season_id` | uuid | |
| `territory_id` | uuid | |
| `game_style` | string | |
| `format` | string | |
| `status` | `SCHEDULED` \| `LIVE` \| `PENDING_CONFIRM` \| `COMPLETED` \| `DISPUTED` \| `CANCELLED` | |
| `competitor_a_type` / `competitor_a_id` | | |
| `competitor_b_type` / `competitor_b_id` | | |
| `player_ids_json` | uuid[] | Flattened users for rating (all individuals involved) |
| `race_to` | int? | |
| `table_size_ft` | int? | Pyramid |
| `skill_level` | string? | Pyramid |
| `a_score` / `b_score` | int? | |
| `winner_competitor_id` | uuid? | |
| `reported_by` | uuid? | |
| `confirmed_by` | uuid[] | Dual confirm |
| `realai_validation_json` | jsonb? | league_validate result |
| `pool_match_id` | uuid? | Link to core `pool_matches` if shared |
| `is_money_match` | boolean | Side money match inside territory |
| `bracket_node_id` | string? | |
| `played_at` | timestamptz? | |

### 1.15 Ledger model (bulletproof money)

#### `LedgerAccount`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `territory_id` | uuid | |
| `kind` | see below | |
| `name` | string | |
| `currency` | string | |
| `is_system` | boolean | System accounts cannot be deleted |

**Account kinds (per Territory):**

| Kind | Purpose |
|------|---------|
| `PLAYERS_FUND` | Prize pool (45% default of eligible inflows) |
| `OPERATOR_REVENUE` | Operator share (35%) |
| `PLATFORM_REVENUE` | RackUp share (20%) |
| `HOLDING` | Money received not yet split (optional clearing) |
| `PAYOUT_CLEARING` | Outbound payouts in flight |
| `RESERVE` | Optional operator reserve / rain-out fund (if configured) |
| `SIDE_POT:{id}` | Isolated side pot balances |

Balances = **sum(credits) − sum(debits)** on that account (never a mutable balance column alone; cache allowed with reconciliation).

#### `LedgerEntry` (immutable)

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `territory_id` | uuid | |
| `account_id` | uuid | |
| `direction` | `CREDIT` \| `DEBIT` | |
| `amount_cents` | bigint > 0 | |
| `balance_after_cents` | bigint | Snapshot after apply (audit) |
| `entry_type` | enum — see §2 | |
| `session_id` | uuid? | |
| `season_id` | uuid? | |
| `competitor_type` / `competitor_id` | ? | Who paid / who received |
| `payer_user_id` | uuid? | |
| `payee_user_id` | uuid? | |
| `payment_id` | uuid? | |
| `payout_id` | uuid? | |
| `related_entry_id` | uuid? | Split group / reversal link |
| `idempotency_key` | string unique | Prevent double post |
| `memo` | string | Human-readable, always public |
| `metadata_json` | jsonb | split %, source fee type |
| `created_at` | timestamptz | |
| `created_by` | uuid? \| `SYSTEM` | |

**No updates/deletes.** Corrections = reversing entry + new entry.

### 1.16 `Payment`

External collection attempt (Stripe Connect, mock, cash marked by operator).

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `territory_id` | uuid | |
| `user_id` | uuid | Payer |
| `entry_id` | uuid? | |
| `amount_cents` | bigint | |
| `status` | `PENDING` \| `SUCCEEDED` \| `FAILED` \| `REFUNDED` | |
| `method` | `CARD` \| `WALLET` \| `CASH` \| `COMP` | |
| `provider` | `stripe` \| `mock` \| `manual` | |
| `provider_ref` | string? | |
| `receipt_url` | string? | |
| `created_at` | timestamptz | |

On `SUCCEEDED` → post ledger credits (§2).

### 1.17 `Payout`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `territory_id` | uuid | |
| `session_id` | uuid | |
| `place` | int | 1, 2, 3… |
| `competitor_type` / `competitor_id` | | Winner entity |
| `gross_cents` | bigint | From structure |
| `status` | `PROJECTED` \| `FINALIZED` \| `TRANSFERRING` \| `PAID` \| `FAILED` \| `VOID` | |
| `payee_breakdown_json` | jsonb | For teams: per-user shares |
| `ledger_entry_ids` | uuid[] | |
| `paid_at` | timestamptz? | |
| `failure_reason` | text? | |

### 1.18 `PayoutLine` (team / doubles payees)

| Field | Type | Notes |
|-------|------|-------|
| `payout_id` | uuid | |
| `user_id` | uuid | |
| `amount_cents` | bigint | |
| `basis` | `EQUAL_SPLIT` \| `CAPTAIN_ALLOC` \| `ENTRY_CONTRIBUTION` \| `CUSTOM` | |
| `status` | same as payout | |

### 1.19 `SidePot`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `session_id` | uuid | |
| `name` | string | "High Run", "Break & Run" |
| `entry_cents` | bigint | |
| `split` | jsonb | May differ from default |
| `payout_structure` | jsonb | |
| `status` | `OPEN` \| `LOCKED` \| `PAID` | |

Own ledger account `SIDE_POT:{id}`.

### 1.20 Standings

#### `SeasonStanding`

| Field | Type | Notes |
|-------|------|-------|
| `season_id` | uuid | |
| `competitor_type` / `competitor_id` | | |
| `played` / `wins` / `losses` / `points` | int | |
| `prize_money_won_cents` | bigint | Cumulative paid |
| `rank` | int | |
| `updated_at` | timestamptz | |

#### `SessionStanding` — ephemeral from `SessionParticipant` + matches.

### 1.21 Audit & ops

| Entity | Purpose |
|--------|---------|
| `TerritoryAuditLog` | Config changes, manual payouts, void entries |
| `SessionCloseJob` | State machine for auto-payout |
| `Dispute` | Score or money dispute → hold payouts |

---

## 2. Money flow and ledger rules

### 2.1 Default revenue split (configurable)

| Bucket | Default % | Account |
|--------|-----------|---------|
| **Players Fund** | **45%** | `PLAYERS_FUND` |
| **Territory Operator** | **35%** | `OPERATOR_REVENUE` |
| **RackUp (platform)** | **20%** | `PLATFORM_REVENUE` |

Stored as:
```json
{
  "players_fund_bps": 4500,
  "operator_bps": 3500,
  "platform_bps": 2000
}
```
Basis points sum **must equal 10000**. Validated on save.

Overrides: Territory default → Season override → **Session snapshot at open** (frozen).

### 2.2 Eligible inflow types

| `entry_type` (ledger) | Description | Split? |
|----------------------|-------------|--------|
| `DUES_IN` | Season dues | Yes (default split) |
| `SESSION_ENTRY_IN` | Nightly entry | Yes |
| `EVENT_ENTRY_IN` | Bracket/event fee | Yes (or event override) |
| `SIDE_POT_IN` | Side pot buy-in | Side pot structure (often 100% to winners or custom) |
| `SPONSOR_IN` | Sponsor add | Configurable; default 100% Players Fund |
| `ADJUSTMENT_IN` | Manual credit | Audited; operator only |
| `PAYOUT_OUT` | Prize paid | Debit Players Fund |
| `OPERATOR_WITHDRAWAL` | Operator takes revenue | Debit Operator |
| `PLATFORM_SETTLEMENT` | Platform take | Debit Platform |
| `REFUND_OUT` | Refund | Reverse prior credit group |
| `TRANSFER` | Internal move | Paired debit/credit |

### 2.3 Posting rule on successful payment (atomic)

For payment of `A` cents with split (pf, op, pl) in bps:

```
CREDIT HOLDING A   (optional; or skip holding)
Then in same DB transaction:
  CREDIT PLAYERS_FUND   floor(A * pf / 10000)
  CREDIT OPERATOR_REVENUE floor(A * op / 10000)
  CREDIT PLATFORM_REVENUE A - pf_share - op_share   // remainder to platform to avoid dust loss
```

**Dust rule:** Integer split; remainder cents go to **platform** (or Players Fund if product prefers — pick one and freeze: **remainder → Players Fund** for player-friendly Territories).

**Recommended dust policy:** remainder → **Players Fund**.

All three (or four) rows share `related_entry_id = group_id` and same `idempotency_key` prefix.

### 2.4 Visibility rules

| Viewer | Can see |
|--------|---------|
| Any Territory member | Full ledger (in/out), Players Fund balance, projected payouts, payout history, split % |
| Public (if PUBLIC territory) | Same transparency summary; PII of payers masked (show amounts + roles) |
| Operator | + unpaid dues list, failed payouts, operator/platform balances |
| RackUp admin | All + freeze |

**Players must always see:**
1. Total paid in (by category)
2. Exact split percentages (session snapshot)
3. Current Players Fund balance
4. Projected payout per place (live)
5. Full payout history

### 2.5 What never happens

- Mutating a ledger row
- Paying prizes from Operator account without explicit transfer
- Changing split mid-session after entries collected under old split
- Hiding platform fee
- Double-spending Players Fund (payout job locks session)

### 2.6 Team / doubles money tracking

1. **Entry:** `Entry` on `TEAM`; `EntrySplit` records each partner’s contribution.
2. **Ledger credits:** still tagged with `competitor_type=TEAM` and `payer_user_id`.
3. **Payout:** `Payout` to team; `PayoutLine` per user:
   - Default **equal split** among active roster (doubles: 50/50)
   - Or **pro-rata by EntrySplit contributions**
   - Or captain-defined (requires partner accept for doubles)

### 2.7 Money matches inside Territory

Optional `TerritoryMatch.is_money_match`:
- Uses existing money-match / escrow module
- **Separate** from session Players Fund unless both parties opt into “table stake adds to side pot”
- Escrow hold/release remains; Territory ledger gets optional fee if house takes table fee (`TABLE_FEE_IN`)

### 2.8 RackUp co-host / bigger events

- `Season.co_host_rackup` or event flag
- Platform bps may increase for co-hosted majors (published in UI before registration)
- Still full ledger under the Territory (or a dedicated event Territory)

---

## 3. Projected and final payouts

### 3.1 Payout structure (season/session)

Two modes (jsonb):

**A. Percentage of Players Fund (session)**
```json
{
  "mode": "PERCENT_OF_FUND",
  "places": [
    { "place": 1, "bps": 5000 },
    { "place": 2, "bps": 3000 },
    { "place": 3, "bps": 2000 }
  ]
}
```
Sum of place bps = 10000 of **session prize pool** (not total Players Fund history).

**B. Fixed table**
```json
{
  "mode": "FIXED_CENTS",
  "places": [
    { "place": 1, "amount_cents": 15000 },
    { "place": 2, "amount_cents": 8000 }
  ]
}
```
If fund &lt; sum(fixed), scale down proportionally or cancel auto-payout and alert operator (`shortfall_policy`: `SCALE` \| `HOLD`).

### 3.2 Session prize pool definition

```
session_gross_in = sum(SESSION_ENTRY_IN + eligible SIDE_POT? + allocated DUES share?)
session_players_fund = portion credited to PLAYERS_FUND from those inflows
                  + optional sponsor credits tagged to session
                  - refunds tagged to session
```

**Dues allocation (configurable):**
- `dues_to_fund_mode`: `NONE` | `EQUAL_PER_SESSION` | `FIRST_SESSION` | `END_OF_SEASON_ONLY`
- Default recommendation: **session entry → fund immediately**; season dues → fund via `EQUAL_PER_SESSION` across planned sessions for smoother prize pools.

### 3.3 Projected payout calculation (live API)

```
GET /territories/:id/sessions/:sid/projections
```

Algorithm:
1. Load `split_snapshot` + `payout_structure_snapshot`
2. `fund = current_session_players_fund_cents` (from ledger filter session_id + PLAYERS_FUND)
3. Current standings / live bracket positions → provisional places
4. For each place in structure:
   - `projected_cents = floor(fund * place_bps / 10000)` or fixed
5. Map place → current provisional competitor
6. Expand team → per-user lines if format multiplies payees
7. Return table + “as of” timestamp + fund balance + unpaid entries warning

**UI always shows:**
| Place | Competitor | Projected $ | Status |
|-------|------------|-------------|--------|
| 1st | … | $X | Live |
| 2nd | … | $Y | Live |
| … | | | |
| **Players Fund** | | **$Z** | |

If places unfinished, show structure with “TBD” competitor but **dollar amounts still visible**.

### 3.4 Final payout calculation (session close)

1. Freeze match results (all matches COMPLETED or forfeited).
2. Recompute final places (standings policy).
3. Recalculate fund one last time.
4. Create `Payout` rows `FINALIZED` with amounts.
5. Execute transfers (§4).
6. Mark session `CLOSED`; write `close_summary_json`.

---

## 4. End-of-session automatic payout flow

### 4.1 State machine (`Session.status`)

```
SCHEDULED → REGISTRATION → LIVE → SCORING → PAYING_OUT → CLOSED
                              ↘ CANCELLED (refunds path)
```

### 4.2 Close triggers

| Trigger | Who |
|---------|-----|
| Operator “End session & pay out” | Operator |
| Auto after last match + grace period | System job |
| Scheduled end + all scores in | System |

### 4.3 Automated steps (idempotent job)

```
SessionCloseJob:
  1. LOCK session row (status must be SCORING or LIVE with all matches terminal)
  2. Assert no open DISPUTED matches (or operator force-flag)
  3. Final standings compute → write final_place on SessionParticipant
  4. fund = ledger balance for session Players Fund slice
  5. Build Payout[] from structure (idempotency_key: session_id:place:competitor)
  6. status = PAYING_OUT
  7. For each payout:
       a. Expand PayoutLines (team splits)
       b. DEBIT PLAYERS_FUND (ledger)
       c. CREDIT PAYOUT_CLEARING
       d. Initiate provider transfer / wallet credit / mark manual
       e. On success: DEBIT PAYOUT_CLEARING, status PAID
       f. On failure: status FAILED, alert operator, keep funds in FUND or CLEARING per policy
  8. Notify winners (push + in-app)
  9. status = CLOSED; emit websocket territory:session_closed
 10. Optional: RealAI coach practice_plan hooks (non-blocking)
```

### 4.4 Failure & dispute

- Failed line: retry queue; operator can “Mark paid external” with receipt (still ledger debit).
- Dispute before close: session stays `SCORING`; **no auto-payout**.
- After close: clawback only via reversing ledger + new session adjustment (rare, audited).

### 4.5 Operator controls

| Control | Effect |
|---------|--------|
| Pause auto-payout | Session closes standings but money stays in Fund |
| Adjust place (audit) | Before PAYING_OUT only |
| Manual payout | Creates same ledger path with `created_by=operator` |
| Cancel session | Refund policy: reverse unpaid-eligible entries |

---

## 5. User flows by format (rollout order)

### 5.1 Phase 1 — Singles

**Operator**
1. Create Territory → enable `SINGLES` + game styles → set split (or default 45/35/20).
2. Create Season (format locked Singles) → dues + session entry + payout structure.
3. Publish registration.
4. Each week: create Session → open registration → collect entries → pair matches → LIVE.
5. Scores submitted/confirmed → RealAI validate → standings update → projections live.
6. End session → auto-payout individuals → ledger history.

**Player**
1. Discover/join Territory → accept rules.
2. Pay season dues / session entry (receipt + ledger credit visible).
3. Check in → play → confirm score.
4. Watch projected $ for current place.
5. Receive payout notification + balance history.

**Rating:** each match → RealAI `league_validate` (if required) → `rating_update` for both users.

### 5.2 Phase 2 — Scotch Doubles League

**Additive only:**
- Create Season with `SCOTCH_DOUBLES`.
- Players form **Team of 2** (or operator pairs).
- Entry payment on partnership; both see `EntrySplit`.
- Standings by **team**.
- Match `player_ids_json` = both partners; scotch alternate-shot rules in `format_config`.
- Session payout → team → 50/50 `PayoutLine` (default).
- Rating: both partners get `rating_update` with match outcome (configurable weight 0.5 each vs full — **default: full K with rating_weight 1.0 for both**, document in season policy).

**Does not change Singles seasons.**

### 5.3 Phase 3 — Scotch Jack & Jill

- Same as doubles + **mixed gender constraint** on team formation.
- Profile requires `gender` (or `jj_eligible_role`: M/F/X policy — operator chooses; default M/F pair).
- Reject registration if pair rule fails.
- Ledger/standings identical to doubles competitor model.

### 5.4 Phase 4 — Teams of 5

- Team roster 5–7; captain required.
- Session lineup: min active (default 3–5) before match.
- Team entry fee + optional individual dues.
- Session: team vs team (multiple individual boards or scotch legs — `match_model`: `TEAM_TIE` | `BEST_OF_N_SINGLES`).
- Standings: team points.
- Payout: team prize → `PayoutLine` equal among checked-in roster that session (default) or full roster.
- Track **individual contribution**: wins on boards, points earned → `TeamContribution` stats (not necessarily money).
- Rating: each individual board match hits user ratings; team standing separate.

---

## 6. Operator dashboard requirements

### 6.1 Navigation

```
Territory Home
  Overview (live sessions, fund balance, members)
  Ledger (filterable, export CSV)
  Seasons
  Sessions (current)
  Players / Teams
  Payments & Dues
  Payouts history
  Settings (split, formats, games, rules)
  Audit log
```

### 6.2 Live session board (primary surface)

| Panel | Contents |
|-------|----------|
| **Money bar** (always sticky) | Players Fund $ · Operator $ · Platform $ · Split 45/35/20 · Session inflows |
| **Projected payouts** | Place table updating live |
| **Standings** | Competitors, W-L, pts |
| **Matches** | Live scores, confirm states, validate flags |
| **Dues/entries** | Paid / due / partial list |
| **Actions** | Open session, pair, end & pay out, pause, dispute |

### 6.3 Ledger UI (non-negotiable UX)

- Running balances by account
- Every row: time, type, memo, amount, from/to, session link
- Filters: account, session, user, type
- Export CSV / PDF summary for night
- “Where did my $20 go?” drill-down: payment → split group → three credits

### 6.4 Player-facing money UI

- Same fund + projections (read-only)
- My payments, my payouts, my team splits
- No ability to hide platform fee

### 6.5 Notifications

- Payment received
- Session open / starting
- Score needs confirm
- Projected place change (optional, rate-limited)
- Payout sent
- Dues overdue

---

## 7. Ratings + RealAI connection

### 7.1 Shared RackUp rating

- Territories **do not** create a separate Elo ladder.
- All completed rated matches call existing pipeline:
  1. `league_validate` / score validate (RealAI) when `require_realai_validate`
  2. Persist match
  3. `rating_update` per individual player involved
- Pyramid: pass `table_size`, `skill_level`, `rating_weight` from matrix.
- Cross-league (BCA/APA/TAP/VNEA): registration may show converted estimates; competitive updates still shared rating (`RACKUP_GAME_KNOWLEDGE_AND_AI_CONTRACT.md`).

### 7.2 Validation flow

```
Report score → dual confirm (or operator) → RealAI league_validate
  → if invalid: reject, no standings write
  → if valid: save TerritoryMatch COMPLETED
  → ScorekeepingServiceV2.processReport (domain: territory_session)
  → rating_update
  → refresh projections
```

### 7.3 Coaching & moderation

- Territory chat threads use existing Chat + RealAI `moderation`.
- Post-session optional `coach` / `pyramid` practice plans.
- Operator tools never bypass moderation for public chat.

### 7.4 Matchmaking

- Intra-Territory pairing uses standings/seeds first.
- Open challenges may call RealAI `matchmaking` on member subset.
- Friends / hall check-ins for social schedule, not money.

---

## 8. Sequential format rollout without breakage

### 8.1 Capability model

```typescript
type TerritoryFormat =
  | 'SINGLES'
  | 'SCOTCH_DOUBLES'
  | 'SCOTCH_JJ'
  | 'TEAMS_5';

// Feature flags per deploy
TERRITORY_FORMATS_ENABLED = ['SINGLES'] // then add codes over time
```

- API rejects create season if format not in global allowlist **or** territory `enabled_formats`.
- DB: `format` column is string/enum extended with migrations that **only ADD** values.

### 8.2 Polymorphic competitor

All standings, entries, payouts use `(competitor_type, competitor_id)`.

| Format | competitor_type | Notes |
|--------|-----------------|-------|
| SINGLES | USER | |
| SCOTCH_DOUBLES | TEAM | roster size 2 |
| SCOTCH_JJ | TEAM | roster 2 + gender rule |
| TEAMS_5 | TEAM | roster 5–7 |

Singles code paths never assume Team; doubles never assume solo user for standings.

### 8.3 Versioned format handlers

```
FormatModule registry:
  SINGLES → SinglesStrategy
  SCOTCH_DOUBLES → ScotchDoublesStrategy
  ...
```

Strategies implement:
- `validateRoster`
- `createEntry`
- `pairMatches`
- `applyResult`
- `expandPayoutPayees`
- `ratingSubjects(match)`

New format = new strategy class + enum value. No edits to Singles strategy required.

### 8.4 Migration safety

- Existing sessions immutable.
- Feature flag off → hide UI create for new formats.
- Read path: unknown format → show “update app” not crash.

---

## 9. Adding game styles later

### 9.1 Registry

```typescript
// games/game-style.registry.ts
{
  code: 'bank_pool',
  displayName: 'Bank Pool',
  realAiDiscipline: 'bank_pool',
  defaultRaceTo: 8,
  supportsPyramidMatrix: false
}
```

### 9.2 Steps to add a game

1. Add registry entry + RealAI knowledge/ability discipline string.
2. UI select options from registry (no hard-coded five-way switches in money code).
3. Score validation rules via RealAI / GameRulesService plugin.
4. Territory `enabled_game_styles` may include new code when operator opts in.

**Money, sessions, ledger, formats are game-agnostic.**

---

## 10. API surface (v1 sketch)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/territories` | Create |
| GET | `/territories/:id` | Detail + money summary |
| GET | `/territories/:id/ledger` | Ledger entries |
| GET | `/territories/:id/ledger/summary` | Totals + split + fund |
| POST | `/territories/:id/seasons` | Create season |
| POST | `/territories/:id/seasons/:sid/entries` | Register + pay |
| POST | `/territories/:id/sessions` | Create session |
| POST | `/sessions/:id/open` | Freeze split snapshot, open reg |
| POST | `/sessions/:id/matches` | Schedule |
| POST | `/sessions/:id/matches/:mid/report` | Score + RealAI |
| GET | `/sessions/:id/projections` | Live projected payouts |
| POST | `/sessions/:id/close` | Auto-payout |
| GET | `/sessions/:id/payouts` | Payout history |
| POST | `/territories/:id/teams` | Create team (fmt 2–4) |
| WS | `territory:{id}` | Live fund, scores, projections |

Domain for scorekeeping: `territory_session`.

---

## 11. Integrity invariants (test these)

1. For every payment success, ledger credits sum to payment amount.
2. Split bps always sum to 10000 at session open.
3. Players Fund balance ≥ 0 always.
4. Sum of session payouts ≤ session Players Fund slice (+ dust rules documented).
5. No ledger UPDATE/DELETE in application code.
6. Payout job idempotent under double-submit.
7. Team payout lines sum to team payout.
8. Closed session projections match final payouts.
9. Singles seasons unaffected by enabling TEAMS_5 globally.
10. RealAI invalid score never updates standings or ratings.

---

## 12. UX copy principles (serious, clear)

- Label fees: “Session entry $20 → Players Fund 45% ($9.00) · Operator 35% ($7.00) · RackUp 20% ($4.00)” on every pay confirm.
- Avoid gamification language for money (“loot”, “coins”).
- Use: **Players Fund**, **Projected payout**, **Paid out**, **Ledger**.
- High-level players see ratings, validation status, full audit; casuals see the same numbers with simpler defaults.

---

## 13. Implementation phases (engineering)

| Eng phase | Deliverable |
|-----------|-------------|
| T0 | Territory + members + settings + ledger accounts + payment→split post |
| T1 | Season + Session + Singles entries/matches + projections + auto-payout |
| T2 | Operator dashboard + player money UI + exports |
| T3 | Scotch Doubles (Team competitor) |
| T4 | Jack & Jill rules |
| T5 | Teams of 5 + contributions |
| T6 | Side pots, brackets, money matches inside, RackUp co-host |

---

## 14. Summary

**Territories** is RackUp’s user-run league OS: multi-format (Singles → Doubles → Jack & Jill → Teams of 5), multi-game, session-based competition with a **double-entry-style public ledger**, frozen split snapshots, live **projected payouts**, and **automatic end-of-session prize distribution**. Money is never opaque. Formats and games extend via registry/strategy patterns without breaking earlier seasons. Ratings stay on the shared RackUp ladder with RealAI validation and coaching at the core of serious play.

---

*Document path: `docs/TERRITORIES_SYSTEM_DESIGN.md`*  
*Aligns with: RealAI contracts, money-match escrow patterns, leagues v2, scorekeeping V2.*
