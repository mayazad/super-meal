# SuperMeal — Project Status
> Last updated: 2026-08-14 | Repo: `mayazad/super-meal`

---

## ✅ What Has Been Built

### App Architecture
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database & Auth:** Supabase (PostgreSQL + Row Level Security)
- **Styling:** Tailwind CSS v4 + custom CSS variables for theming
- **Animation:** Framer Motion
- **Charts:** Recharts
- **Email:** Resend
- **Icons:** Lucide React
- **Export:** xlsx, html-to-image, html2canvas
- **Deployment:** Ready for Vercel or Render

---

### Public Routes (No Login Required)
| Route | Status | Description |
|---|---|---|
| `/` | ✅ Done | Landing page with animated mockup, hero gradient, FAQ |
| `/register` | ✅ Done | Mess registration form with slug auto-generation |
| `/register/pending` | ✅ Done | Waiting for Senpai approval page |
| `/admin/login` | ✅ Done | Email/password login with role-based redirect |
| `/admin/forgot-password` | ✅ Done | Submit password reset request |
| `/admin/reset-password` | ✅ Done | Set new password via Senpai-generated token |
| `/view/[slug]` | ✅ Done | Public mess overview (no login) |
| `/view/[slug]/[month_year]` | ✅ Done | Public monthly summary with all balances |

### Admin Protected Routes
| Route | Status | Description |
|---|---|---|
| `/admin/dashboard` | ✅ Done | Month navigator, stats, lock/close month, broadcast |
| `/admin/members` | ✅ Done | Add, deactivate, **reactivate** members |
| `/admin/meals` | ✅ Done | Daily meal entry, month lock enforcement |
| `/admin/groceries` | ✅ Done | Grocery log with auto-credit to meal deposits |
| `/admin/meal-deposits` | ✅ Done | Member advance deposits with optional notes |
| `/admin/utilities` | ✅ Done | Shared utility bill entries |
| `/admin/utility-deposits` | ✅ Done | Member utility contributions |
| `/admin/settlement` | ✅ Done | Per-member settlement: meal cost + utility share + total balance |
| `/admin/history` | ✅ Done | Archived months with public report links |
| `/admin/activity` | ✅ Done | Audit log timeline with event count badge |

### Senpai (Super-Admin) Routes
| Route | Status | Description |
|---|---|---|
| `/senpai` | ✅ Done | Command center: stats, chart, approve/reject registrations, manage admins, broadcast, **password reset requests** |

### API Routes (Server-Side)
| Route | Status | Purpose |
|---|---|---|
| `/api/notify-registration` | ✅ Done | Sends Resend email to MayazAD on new registration |
| `/api/generate-reset-token` | ✅ Done | Senpai generates 1-hour password reset token |
| `/api/apply-reset` | ✅ Done | Validates token, sets new password via Supabase admin API |

---

### Database Schema
| Table | Status |
|---|---|
| `profiles` | ✅ Active |
| `app_settings` | ✅ Active |
| `members` | ✅ Active |
| `daily_meals` | ✅ Active |
| `groceries` | ✅ Active |
| `meal_deposits` | ✅ Active |
| `utilities` | ✅ Active |
| `utility_deposits` | ✅ Active |
| `locked_months` | ✅ Active |
| `monthly_archives` | ✅ Active |
| `password_reset_claims` | ⚠️ **Needs manual SQL** — see below |

---

### Key Features
- ✅ Multi-tenant isolation (every admin sees only their own data)
- ✅ Role system: `senpai` → `admin` → `pending_admin`
- ✅ Soft-delete members (preserves historical data)
- ✅ Month locking (read-only after settlement)
- ✅ Close Month → archives to JSONB snapshot, clears raw data
- ✅ Settlement with full utility breakdown per member
- ✅ WhatsApp share button for settlement summary
- ✅ Audit log of all financial events
- ✅ Deposit notes (optional)
- ✅ Senpai broadcast message (shown on admin dashboard)
- ✅ Skeleton loaders + error states on all pages
- ✅ Dark mode support
- ✅ Mobile-responsive across all pages
- ✅ Email notification on new registration (Resend)
- ✅ Senpai-mediated password reset flow
- ✅ Reactivate inactive members

---

## ⚠️ Pending: Manual Action Required

### 1. Run Password Reset Claims SQL
This table does **not** exist yet in Supabase. Run this in the Supabase SQL editor:

```sql
create table if not exists public.password_reset_claims (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references auth.users(id) on delete cascade,
  admin_email text not null,
  token       text unique,
  is_used     boolean not null default false,
  expires_at  timestamptz,
  created_at  timestamptz default now()
);
alter table public.password_reset_claims enable row level security;
create policy "Service role full access" on public.password_reset_claims
  using (true) with check (true);
```

### 2. Fill in Real Environment Variables
Update `.env.local` AND your hosting provider (Vercel/Render) with:

```
RESEND_API_KEY=re_xxxxxxxx              ← from resend.com
SUPABASE_SERVICE_ROLE_KEY=eyJh...       ← from Supabase → Project Settings → API
SENPAI_NOTIFICATION_EMAIL=officialmayazad@gmail.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### 3. Resend Domain Verification (Optional but Recommended)
- Currently using `onboarding@resend.dev` as the from-address (works on free tier)
- For production, verify your own domain at resend.com and update `from:` in `/api/notify-registration/route.ts`

---

## 🟡 Known Gaps / Future Ideas

These are improvements that were identified but **not yet built**:

| Feature | Priority | Notes |
|---|---|---|
| Dedicated `/admin/settings` page | Low | Currently theme and broadcast are embedded in dashboard/senpai |
| WhatsApp share for public view | Low | Currently only on admin settlement page |
| Audit log utility bill filter by month | Low | Currently fetches all months |
| Email notification when Senpai approves account | Medium | Senpai approves but admin doesn't get notified |
| Payment method tracking (Bkash/cash) | Deferred | User deferred — infrastructure ready to add later |
| Senpai: delete/expire used reset claims | Low | Currently old claims stay in the table forever |
| Reset claims auto-expiry cleanup | Low | `expires_at` is set but no cron job to clean up |
| Public view mobile share button | Low | Share button on public summary page for mobile |

---

## 📁 Project Folder Structure

```
superMeal/
├── docs/
│   ├── PROJECT_DOCUMENTATION.md   ← Technical reference
│   └── USER_GUIDE.md              ← End-user instructions
├── project-chat-history/
│   └── CHAT_HISTORY.md            ← This AI conversation history log
├── src/
│   ├── app/
│   │   ├── page.tsx               ← Landing page
│   │   ├── layout.tsx             ← Root layout
│   │   ├── globals.css            ← Global styles + CSS variables
│   │   ├── admin/
│   │   │   ├── (protected)/       ← Auth-gated admin pages
│   │   │   │   ├── dashboard/
│   │   │   │   ├── members/
│   │   │   │   ├── meals/
│   │   │   │   ├── groceries/
│   │   │   │   ├── meal-deposits/
│   │   │   │   ├── utilities/
│   │   │   │   ├── utility-deposits/
│   │   │   │   ├── settlement/
│   │   │   │   ├── history/
│   │   │   │   └── activity/
│   │   │   ├── login/
│   │   │   ├── forgot-password/   ← NEW
│   │   │   └── reset-password/    ← NEW
│   │   ├── api/
│   │   │   ├── notify-registration/   ← NEW (Resend)
│   │   │   ├── generate-reset-token/  ← NEW
│   │   │   └── apply-reset/           ← NEW
│   │   ├── register/
│   │   ├── senpai/                ← Super-admin dashboard
│   │   ├── view/[slug]/           ← Public mess view
│   │   └── summary/[month_year]/
│   ├── components/ui/             ← Shared UI: skeleton, page-error
│   ├── hooks/                     ← use-admin hook
│   └── utils/supabase/            ← Server + client + middleware
├── supabase_migration.sql         ← DB schema (most tables)
├── add_notes_migration.sql        ← Deposit notes field migration
└── project-chat-history/
    └── CHAT_HISTORY.md
```

---

## 🚀 Deployment Checklist

- [ ] Add all 6 env vars to hosting provider
- [ ] Run `password_reset_claims` SQL in Supabase
- [ ] Verify Resend domain (or keep `onboarding@resend.dev` for now)
- [ ] Set `NEXT_PUBLIC_SITE_URL` to production URL
- [ ] Test registration → email arrives at `officialmayazad@gmail.com`
- [ ] Test forgot password → Senpai generates link → admin sets password
- [ ] Test Close Month → confirm archive is created and raw data is cleared
- [ ] Test public view (`/view/your-slug/YYYY-MM`) from incognito

---

*Generated: 2026-08-14 by AI assistant from full codebase analysis.*
