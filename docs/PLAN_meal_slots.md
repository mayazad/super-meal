# Implementation Plan: Named Meal Slots (Lunch / Dinner / optional Breakfast)

> **Status:** PLANNED — not yet executed. Saved for next month's work.
> **Last updated:** 2026-08-15

---

## What We're Building

Replace the single `regular_meals` integer counter with **named meal slot inputs** per member per day.

### Design Decisions (locked in)

| Question | Answer |
|---|---|
| Lunch/Dinner are numeric (not binary)? | ✅ Yes — admin enters how many lunches (0, 1, 2…) and how many dinners per member |
| Guest meals also named? | ✅ Yes — Guest Lunch + Guest Dinner as separate counters |
| Breakfast toggle location? | ✅ Dashboard page (existing page, alongside "Site Appearance") |
| Backfill strategy for existing rows? | Split evenly: `lunch = floor(regular/2)`, `dinner = ceil(regular/2)`, `guest_lunch = floor(guest/2)`, `guest_dinner = ceil(guest/2)` |

### Default state (no breakfast)
Every day's entry shows:
```
[Member Name]
  Lunch    [ − ] [ 0 ] [ + ]
  Dinner   [ − ] [ 0 ] [ + ]
  Guest Lunch   [ − ] [ 0 ] [ + ]
  Guest Dinner  [ − ] [ 0 ] [ + ]
```

### With breakfast enabled (admin toggles on from Dashboard)
```
[Member Name]
  Breakfast [ − ] [ 0 ] [ + ]
  Lunch     [ − ] [ 0 ] [ + ]
  Dinner    [ − ] [ 0 ] [ + ]
  Guest Breakfast [ − ] [ 0 ] [ + ]
  Guest Lunch     [ − ] [ 0 ] [ + ]
  Guest Dinner    [ − ] [ 0 ] [ + ]
```

---

## Database Migration

Run in Supabase SQL Editor **before** deploying code changes:

```sql
-- 1. Add named slot columns to daily_meals
ALTER TABLE public.daily_meals
  ADD COLUMN IF NOT EXISTS breakfast        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lunch            INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dinner           INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guest_breakfast  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guest_lunch      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guest_dinner     INTEGER NOT NULL DEFAULT 0;

-- 2. Backfill existing rows
--    regular_meals → split into lunch + dinner
--    guest_meals   → split into guest_lunch + guest_dinner
UPDATE public.daily_meals SET
  lunch         = FLOOR(regular_meals::numeric / 2),
  dinner        = CEIL(regular_meals::numeric / 2),
  guest_lunch   = FLOOR(guest_meals::numeric / 2),
  guest_dinner  = CEIL(guest_meals::numeric / 2)
WHERE lunch = 0 AND dinner = 0;

-- 3. Add breakfast_enabled toggle to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS breakfast_enabled BOOLEAN NOT NULL DEFAULT false;
```

> **Why keep `regular_meals` and `guest_meals`?**
> Every calculation (dashboard, settlement, public view, senpai stats) reads these columns.
> We keep writing `regular_meals = breakfast + lunch + dinner` and `guest_meals = guest_breakfast + guest_lunch + guest_dinner` on every save.
> This means **zero changes needed to any calculation logic** — only the input UI and display layer change.

---

## Files to Change

### 1. `src/app/admin/(protected)/meals/page.tsx` — Meal Entry UI

**State shape change:**
```ts
// Before
Record<string, { regular: number; guest: number }>

// After
Record<string, {
  breakfast: number; lunch: number; dinner: number;
  guest_breakfast: number; guest_lunch: number; guest_dinner: number;
}>
```

**Fetch — select new columns:**
```ts
.select('member_id, breakfast, lunch, dinner, guest_breakfast, guest_lunch, guest_dinner')
// also fetch profiles.breakfast_enabled for this admin
```

**Input UI:**
- Remove generic "regular" and "guest" counters
- Render named counters in order: Breakfast (if enabled) → Lunch → Dinner
- Then: Guest Breakfast (if enabled) → Guest Lunch → Guest Dinner
- Each counter: `[ − ] count [ + ]` with `min(0)` enforcement

**Save payload (upsert):**
```ts
{
  breakfast, lunch, dinner,
  guest_breakfast, guest_lunch, guest_dinner,
  regular_meals: breakfast + lunch + dinner,   // ← keep in sync
  guest_meals: guest_breakfast + guest_lunch + guest_dinner,  // ← keep in sync
  member_id, date, month_year, admin_id
}
```

**Ledger table (monthly history):**
- Columns: Date | Member | Breakfast (if enabled) | Lunch | Dinner | Guest B (if enabled) | Guest L | Guest D | Total
- Footer sums each column

---

### 2. `src/app/admin/(protected)/dashboard/page.tsx` — Breakfast Toggle

Add a new **"Meal Preferences"** card below the existing "Site Appearance" card:

```
⚙️  Meal Slot Preferences
Configure which meal slots appear in daily entry.

[ ] Enable Breakfast
    When enabled, a Breakfast counter appears in daily
    meal logging for both regular and guest meals.
    This affects the Meals page and the public monthly view.
```

- On toggle: `supabase.from('profiles').update({ breakfast_enabled: value }).eq('id', adminId)`
- Show a saving indicator / toast on change

---

### 3. `src/app/view/[slug]/[month_year]/page.tsx` — Server Component

- Fetch `breakfast_enabled` from the mess's `profiles` row
- Fetch `breakfast, lunch, dinner, guest_breakfast, guest_lunch, guest_dinner` from `daily_meals`
- Pass `breakfastEnabled: boolean` as new prop to `SummaryClient`
- Build meal log entries with full named breakdown:
  ```ts
  { date, breakfast, lunch, dinner, guest_breakfast, guest_lunch, guest_dinner }
  ```
- `regular_meals` total calculation stays exactly the same

---

### 4. `src/app/view/[slug]/[month_year]/summary-client.tsx` — Public View

**`MealLogEntry` type change:**
```ts
type MealLogEntry = {
  date: string
  breakfast: number
  lunch: number
  dinner: number
  guest_breakfast: number
  guest_lunch: number
  guest_dinner: number
}
```

**Meal Calendar accordion (per member):**

Before:
```
Feb 25  |  2 Regular  |  1 Guest
```

After (breakfast off):
```
Feb 25  |  Lunch: 1  Dinner: 1  |  G.Lunch: 0  G.Dinner: 1
```

After (breakfast on):
```
Feb 25  |  B: 0  L: 1  D: 1  |  G.B: 0  G.L: 0  G.D: 1
```

**`SummaryProps` additions:**
```ts
breakfastEnabled: boolean
```

---

### 5. No changes needed in:
- `dashboard/page.tsx` calculation logic (reads `regular_meals`)
- `settlement/page.tsx` (reads `regular_meals + guest_meals`)
- `senpai/page.tsx` (reads `regular_meals + guest_meals`)
- `monthly_archives` snapshot (stores aggregates only)

---

## Backward Compatibility

| Scenario | Outcome |
|---|---|
| Existing mess with data | Backfill splits existing `regular_meals` evenly into lunch/dinner |
| `breakfast_enabled = false` (default) | UI shows only Lunch + Dinner — identical to today's experience |
| Old data viewed in public view | Meal log shows Lunch/Dinner values, summing to the same total as before |
| Calculations | All unchanged — `regular_meals` is always kept as the sum |

---

## Verification Plan

1. Run DB migration → check that existing rows have `lunch + dinner = regular_meals`
2. Open Meals page → confirm Lunch + Dinner counters show (no Breakfast yet)
3. Toggle Breakfast ON from Dashboard → confirm counter appears in Meals page
4. Log: Breakfast 1, Lunch 2, Dinner 1 → confirm DB: `regular_meals = 4`, `breakfast = 1, lunch = 2, dinner = 1`
5. Open public view → meal log shows named slots
6. Open Settlement → totals and meal rate unchanged
7. Toggle Breakfast OFF → Breakfast counter disappears, data preserved in DB columns

---

## Estimated Effort

| Task | Est. time |
|---|---|
| DB migration + backfill | 5 min |
| `meals/page.tsx` rewrite | 1–2 hrs |
| Dashboard breakfast toggle card | 30 min |
| `page.tsx` server fetch update | 20 min |
| `summary-client.tsx` meal log display | 30 min |
| Testing & edge cases | 30 min |
| **Total** | **~3.5 hrs** |
