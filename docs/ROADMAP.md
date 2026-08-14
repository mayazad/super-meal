# SuperMeal — Future Roadmap & Feature Planning

> **Document type:** Strategic Planning  
> **Last updated:** 2026-08-15  
> **Author:** MayazAD  
> **Status:** Pre-implementation — ideas, not yet committed

---

## Overview

SuperMeal currently handles the core mess management loop well:
daily meal logging → grocery tracking → deposit collection → monthly settlement.
This document captures the next layer of features that would make SuperMeal genuinely powerful —
moving it from a "shared calculation tool" to a fully flexible mess operating system.

---

## Feature 1 — Custom Formula Engine (Per-Mess Calculation Rules)

### The Problem
Every mess thinks differently about fairness.
Currently, **meal rate = total meal deposits ÷ total meals** is hardcoded. Some messes might want:
- `total groceries ÷ total meals` (cost-based)
- `total groceries ÷ active days` (day-based)
- A weighted hybrid of both

There's no way for an admin to adjust this today.

### The Vision
Each admin can define their own **formula rules** from a UI. Not just for meal rate — for any
calculation the system does (utility split method, balance formula, etc.).

### Implementation Plan

#### 1a. `mess_formula_settings` table (new DB table)

```sql
CREATE TABLE mess_formula_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  formula_key TEXT NOT NULL,        -- e.g. 'meal_rate', 'utility_split'
  formula_label TEXT,               -- human-readable name
  numerator_var TEXT NOT NULL,      -- e.g. 'total_meal_deposits', 'total_groceries'
  denominator_var TEXT NOT NULL,    -- e.g. 'total_meals', 'active_days', 'member_count'
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 1b. Available Variables (the "vocabulary" admins can pick from)

| Variable Key | Description |
|---|---|
| `total_meal_deposits` | Sum of all meal deposits that month |
| `total_groceries` | Sum of grocery costs that month |
| `total_meals` | Total meals consumed (regular + guest) |
| `total_regular_meals` | Only regular meals (no guests) |
| `active_days` | Total member-days with at least 1 meal |
| `member_count` | Number of active members |
| `total_utilities` | Sum of all utility bills that month |
| `total_utility_deposits` | Sum of all utility deposits |

#### 1c. Formula Builder UI (Settings page → "Calculation Rules" tab)

- Dropdown: **Numerator** (pick from variables above)
- Dropdown: **Denominator** (pick from variables above)
- Live preview: shows calculated result using current month's data
- Save per formula key (`meal_rate`, etc.)
- Reset to default button

#### 1d. Engine changes

- On every stats fetch (dashboard, settlement, public view), read `mess_formula_settings`
  for the current admin
- If a custom formula exists → use it; else fall back to the current default
- Formula is stored as simple `numerator / denominator` — no arbitrary JS/eval (safe)

---

## Feature 2 — Presence-Based Utility Splitting

### The Problem
Electricity bills depend on who was home, not how many people live there.
If someone was away for 10 days, they shouldn't pay the same electricity share as someone
who was home all month. Today, all utility bills are split equally — which isn't fair.

### The Vision
When adding a utility bill, the admin can choose how to split it:

| Split Mode | Description |
|---|---|
| **Equal Split** (default) | Divide total ÷ number of active members (current behavior) |
| **Day-Proportional** | Each member pays: `(their active days / total member-days) × total bill` |
| **Custom Ratio** | Admin manually sets the % each member pays |

### Why Day-Proportional Works
The `daily_meals` table already records which members ate on which days. A member with
a meal on a day = "was home that day". So we can derive presence **without a new table**.

### Implementation Plan

#### 2a. Add `split_mode` column to `utilities` table

```sql
ALTER TABLE utilities 
ADD COLUMN split_mode TEXT DEFAULT 'equal' 
CHECK (split_mode IN ('equal', 'by_days', 'custom'));
```

#### 2b. For `custom` split: `utility_custom_ratios` table

```sql
CREATE TABLE utility_custom_ratios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  utility_id UUID REFERENCES utilities(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  ratio NUMERIC NOT NULL  -- 0.0 to 1.0, must sum to 1.0 across members
);
```

#### 2c. Settlement Calculation Changes

When computing `utilityCost` per member:

```
if split_mode == 'equal':
    share = bill.cost / member_count

if split_mode == 'by_days':
    member_active_days = count of days member has meals logged
    total_member_days  = sum of active_days across all members
    share = (member_active_days / total_member_days) * bill.cost

if split_mode == 'custom':
    share = bill.cost * ratio_for_this_member
```

#### 2d. UI Changes (Admin Utilities page)

- When adding a utility bill, show a **"Split Method"** dropdown
- If `by_days`: auto-compute and show preview of each member's share
- If `custom`: show a mini form with per-member % inputs that must sum to 100%
- Public view and settlement page both reflect the chosen split

---

## Feature 3 — Member Self-Service Portal (Non-Admin Login)

### The Problem
Members currently see a **read-only public URL**. They can't:
- Log their own meals (admin has to do it)
- Submit a meal cancellation
- Track their own deposits over time with login

### The Vision
Members get a personal login. They can:
- View their own balance, meal log, statement
- Submit meal attendance (admin approves or auto-approves)
- Cancel today's meal before a cutoff time (admin-configurable)

### Implementation Plan
- New role: `member` in `profiles` table
- Admin "invites" members via email → they get a magic link
- Member dashboard: personal view only (RLS restricts to their `member_id`)
- Admin toggle: "auto-approve member meal submissions" or "require approval"
- Member meal submissions go to `daily_meals` with `status: 'pending'` → admin approves

---

## Feature 4 — Smart Notifications & Alerts

### The Problem
Admins have to manually check the dashboard. Members have no proactive awareness of their balance.

### The Vision
- **Email alerts** when a member's balance goes below a threshold
- **Monthly summary email** auto-sent to all members when month closes
- **Due date reminders** for utility bills (already tracked, just not notified)
- **Deposit confirmation** email when admin logs a deposit for a member

### Implementation Plan
- Use existing **Resend** integration (already set up)
- New `notification_settings` table per mess: toggle which events trigger emails
- Add member email addresses to `members` table (optional field)
- Supabase Webhook triggers on `locked_months` insert → send summary email

---

## Feature 5 — Recurring Utilities (Auto-Populate)

### The Problem
Bills like internet are the same every month. Admin has to manually add them each time.

### The Vision
Mark any utility as "recurring" — it auto-populates on the 1st of each month.

### Implementation Plan
- `is_recurring: boolean` + `recurring_amount: numeric` columns on `utilities`
- Supabase Edge Function runs on 1st of month → inserts next month's bill automatically
- Admin can edit/delete before the month is settled

---

## Feature 6 — Audit Log (Who Changed What)

### The Problem
If a number is wrong, there's no way to trace who added or deleted what.

### The Vision
Every insert/update/delete on key tables gets logged with: `admin_id`, `action`, `table`, `record_id`, `old_value`, `new_value`, `timestamp`.

### Implementation Plan
- New `audit_logs` table
- Supabase database triggers on `groceries`, `meal_deposits`, `utility_deposits`, `daily_meals`
- Senpai dashboard shows audit log for any workspace
- Admin can see their own mess's audit log (last 30 days)

---

## Feature 7 — PDF Export

### The Problem
The current image export (PNG) and Excel export are useful but PDFs are standard for formal records.

### The Vision
One-click PDF of the full monthly settlement — proper layout, headers, branding.

### Implementation Plan
- Use `@react-pdf/renderer` via a Next.js API route
- Reuse existing settlement data already computed in the summary page
- PDF includes: mess name, month, per-member breakdown, meal rate, utility split

---

## Feature 8 — Budget Tracking & Alerts

### The Problem
There's no visibility into whether the mess is overspending before the month ends.

### The Vision
Admin sets a monthly grocery budget. Dashboard shows:
- % of budget used
- Projected end-of-month cost based on daily average
- Alert if on track to exceed budget

### Implementation Plan
- `monthly_budget` column on `profiles` (or a new `mess_settings` table)
- Dashboard stat card: "Budget: 4200 / 5000 Tk (84%)"
- Color coding: green → yellow → red as budget is consumed

---

## Feature 9 — WhatsApp / Telegram Summary Share

### The Problem
Sharing the monthly breakdown requires screenshotting and manually sending to members.

### The Vision
"Share on WhatsApp" button generates a pre-formatted text message and opens `wa.me` with it pre-filled.

### Implementation Plan
- WhatsApp: `https://wa.me/?text=<encoded_text_summary>` — uses the existing `textSummary` string
- Telegram: optional — Telegram Bot API → send to a group chat ID stored in settings
- Zero backend needed for WhatsApp (pure client-side link)

---

## Feature 10 — Multi-Month Trend Charts

### The Problem
There's no way to see patterns over time — is meal rate going up? Is one member always late?

### The Vision
A "History & Trends" page with:
- Meal rate over last 6 months (line chart)
- Total expenses month-over-month (bar chart)
- Per-member balance trend (who's consistently in debt)

### Implementation Plan
- Data already exists in `monthly_archives` table (already built and locked)
- Recharts is already installed — add visualizations to `/admin/history` page
- Fetch last 6 archived months → plot

---

## Missing Things Found During Code Analysis

Beyond the user's two ideas, these gaps were found:

| Gap | Current State | Ideal State |
|---|---|---|
| **Meal cancellation** | No way to cancel a day's meal | Member can mark "no meal today" before cutoff |
| **Guest attribution** | Guest meals logged but no name | Track who the guest was |
| **Grocery category tagging** | All groceries unlabeled | Tag as "daily", "bulk", "personal" |
| **Personal grocery items** | All groceries shared by default | Some items are personal — exclude from shared pool |
| **Settlement confirmation** | Balance shown but no "paid" confirmation | Admin marks a member as "settled" for the month |
| **Soft delete** | No soft-delete on any table | Deleted records are unrecoverable |
| **Member history** | Reactivate works but no history | Track when a member was deactivated/reactivated |
| **Currency config** | Hardcoded "Tk" everywhere | Configurable currency symbol per mess |
| **PWA support** | Not installable | `manifest.json` + service worker for "Add to Home Screen" |
| **API access** | No external API | Secured API key per mess for custom integrations |

---

## Priority Order (Recommended)

| Priority | Feature | Effort | Impact |
|---|---|---|---|
| 🔴 High | Feature 2 — Presence-Based Utility Split | Medium | Very High |
| 🔴 High | Feature 1 — Custom Formula Engine | Medium | High |
| 🟡 Medium | Feature 9 — WhatsApp Share | Low | High |
| 🟡 Medium | Feature 8 — Budget Tracking | Low | High |
| 🟡 Medium | Feature 10 — Trend Charts | Low | Medium |
| 🟡 Medium | Feature 4 — Smart Notifications | Medium | High |
| 🟠 Later | Feature 5 — Recurring Utilities | Low | Medium |
| 🟠 Later | Feature 7 — PDF Export | Medium | Medium |
| 🟠 Later | Feature 3 — Member Self-Service Portal | High | Very High |
| 🔵 Future | Feature 6 — Audit Log | High | Medium |

---

## Database Changes Summary

```sql
-- Feature 1: Custom formula engine
CREATE TABLE mess_formula_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  formula_key TEXT NOT NULL,
  numerator_var TEXT NOT NULL,
  denominator_var TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feature 2: Presence-based utility split
ALTER TABLE utilities ADD COLUMN split_mode TEXT DEFAULT 'equal'
  CHECK (split_mode IN ('equal', 'by_days', 'custom'));

CREATE TABLE utility_custom_ratios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  utility_id UUID REFERENCES utilities(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  ratio NUMERIC NOT NULL
);

-- Feature 3 & 4: Member email for portal + notifications
ALTER TABLE members ADD COLUMN email TEXT;
ALTER TABLE members ADD COLUMN invite_token TEXT;

-- Feature 5: Recurring utilities
ALTER TABLE utilities ADD COLUMN is_recurring BOOLEAN DEFAULT false;
ALTER TABLE utilities ADD COLUMN recurring_amount NUMERIC;

-- Feature 8: Budget tracking
ALTER TABLE profiles ADD COLUMN monthly_budget NUMERIC DEFAULT 0;

-- Feature 6: Audit log
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,       -- 'insert', 'update', 'delete'
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

*This document is a living plan. Features will be moved to implementation as they are scoped and prioritized.*
