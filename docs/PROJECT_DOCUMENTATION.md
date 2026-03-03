# SuperMeal Project Documentation

## 1. Project Overview
**SuperMeal** is a multi-tenant, SaaS-like web application designed to manage the shared finances, daily meals, groceries, and utility bills for bachelor messes or shared living spaces. It streamlines the complex month-end calculations required to determine individual meal rates, utility splits, and final net balances (Refund Due or Amount Owed).

## 2. Tech Stack
- **Framework:** Next.js 15 (App Router, Server Components, Server Actions)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (with CSS UI tokens and variables for theming)
- **UI Components:** Radix UI primitives, Lucide React (Icons), Framer Motion (Animations)
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Supabase Auth)
- **Deployment:** Vercel

## 3. Architecture & Multi-Tenancy
The application is designed for **Multi-Tenancy**. A single deployment of SuperMeal can serve multiple distinct "Messes" (workspaces) without commingling data.
- **Tenant Isolation:** Every data table (except global settings) includes an `admin_id` column.
- **Supabase RLS:** Row Level Security (RLS) policies enforce that an authenticated user can only `SELECT`, `INSERT`, `UPDATE`, or `DELETE` rows where `admin_id = auth.uid()`.
- **Mess Slug:** Each workspace gets a unique `mess_slug`. This slug is used to generate a specific public, read-only URL (`/view/[slug]`) where members of that mess can see their live meal stats without logging in.

## 4. Authentication & Role-Based Access Control (RBAC)
User authentication is handled by Supabase Auth (Email/Password). Authorization relies on a `profiles` table linked by UUID to `auth.users`.

### Roles:
1. **`senpai` (Super Admin):**
   - Hardcoded via environment variable (`NEXT_PUBLIC_SENPAI_EMAIL`).
   - Has access to a special `/senpai` dashboard to approve, reject, or revoke pending workspaces.
   - Views live intelligence (Active vs Inactive workspaces based on a 45-day rolling settlement window) and active member counts.
   - Bypasses standard workspace restrictions.
2. **`admin` (Workspace Owner):**
   - The manager of a specific mess. 
   - Can access the `/admin/dashboard` and modify all data (members, meals, groceries, utilities) where `admin_id` matches their own UUID.
3. **`pending_admin`:**
   - Default role upon registration.
   - Redirected by Next.js Middleware to `/register/pending`. Cannot access the dashboard until the Senpai upgrades their role to `admin`.
4. **`revoked`:**
   - An admin who has had their access suspended by the Senpai.
   - Blocked by middleware from accessing the dashboard. Their public `/view/[slug]` page also returns a 404 to protect data.

## 5. Core Data Models (Supabase Schema)
- **`profiles`:** Matches Supabase Auth UUID. Stores `role`, `mess_name`, `mess_slug`, and `selected_theme`.
- **`members`:** Individuals living in the mess. Uses `is_active` for soft-deletion. When deactivated, members disappear from daily entry forms but their data is preserved for historical archive/settlement accuracy.
- **`daily_meals`:** Logs `regular_meals` and `guest_meals` per member, per date.
- **`groceries`:** Expenses incurred for food/bazaar. Logged by date and `month_year`.
- **`meal_deposits`:** Cash given by members specifically to fund the grocery/meal budget.
- **`utilities`:** Fixed monthly bills (e.g., WiFi, Electricity, Gas, Maid). Logged by `month_year` and `due_date`.
- **`utility_deposits`:** Cash given by members specifically to fund the utility budget.
- **`utility_payments`:** A junction table tracking which member has paid their equal share of a specific utility bill (`utility_id`, `member_id`, `paid` boolean).
- **`locked_months`:** A soft-lock record. If a `month_year` exists here for an `admin_id`, the UI prevents structural modifications to that month.
- **`monthly_archives`:** A hard-archive snapshot. At month-end, the final calculations are saved here as a JSONB object, and the raw meal/grocery data for that month is permanently deleted to reset the ledger.
- **`app_settings`:** Global configuration, currently used for the system-wide `broadcast_message`.

## 6. Mathematical Logic & Settlement
SuperMeal strictly separates the **Meal Fund** (variable) from the **Utility Fund** (fixed).

### The Meal Settlement Algorithm:
1. **Total Groceries:** $\sum \text{cost}$ from `groceries` for the queried month.
2. **Total Meals:** $\sum (\text{regular\_meals} + \text{guest\_meals})$ for the queried month.
3. **Meal Rate:** $\text{Total Groceries} / \text{Total Meals}$ (defaults to 0 if Total Meals is 0).
4. **Individual Meal Cost:** $(\text{Member's Total Meals} \times \text{Meal Rate})$.
5. **Net Balance:** $\text{Member's Meal Deposits} - \text{Individual Meal Cost}$.
   - If **Positive (> 0)** = The mess owes the member money (**Refund Due**).
   - If **Negative (< 0)** = The member owes the mess money (**Amount Owed**).
6. **Cash On Hand:** $\text{Total Meal Deposits} - \text{Total Groceries}$. This exact amount is physically held by the Admin and is used to pay out the "Refund Due" members.
7. **Communication:** Admins can instantly broadcast the month-end calculated balances via a pre-formatted `whatsapp://send?text=` deep link directly to their mess group chat.

## 7. Folder Structure
- `/src/app/admin/(protected)`: The core application. All routes here are scoped to authenticated `admin` users via Middleware.
- `/src/app/register` & `/src/app/admin/login`: Public auth routes.
- `/src/app/senpai`: Super-admin workspace management.
- `/src/app/view/[slug]`: The public, read-only dashboard for mess members.
- `/src/components`: Reusable UI components (Sidebar, Nav, Cards, Modals).
- `/src/components/ui`: Radix/Tailwind standard primitives (Buttons, Inputs, Skeletons).
- `/src/hooks`: Custom React hooks (e.g., `use-admin` to fetch session data seamlessly).
- `/src/utils/supabase`: Supabase Client initializers for Browser, Server, and Middleware.

## 8. Environment Variables
Required `.env.local` configuration:
```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_INSTANCE].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
NEXT_PUBLIC_SENPAI_EMAIL=master@example.com
```

## 9. Security & Middleware
Next.js Middleware (`src/utils/supabase/middleware.ts`) fires on every route change:
1. It updates the Supabase Auth session via `supabase.auth.getUser()`.
2. It fetches the user's `role` from the `profiles` table.
3. **Route Protection:**
   - Unauthenticated users attempting to access `/admin/*` are redirected to `/admin/login`.
   - Users with role `pending_admin` or `revoked` attempting to access `/admin/*` are intercepted and forced to `/register/pending`.
   - Users attempting to access `/senpai/*` without matching the `NEXT_PUBLIC_SENPAI_EMAIL` are redirected to the dashboard or login.

## 10. Design System & Theming
The application supports a client-side theme toggle (`classic` vs `emerald`).
- The theme is stored in the `profiles` table (`selected_theme`) per admin.
- A `ThemeProvider` component reads this preference upon load and injects a `data-theme` attribute into the `<html>` tag.
- `globals.css` defines CSS variable palettes scoped to `[data-theme="emerald"]` or defaults, ensuring immediate, smooth repaints of all Tailwind `.bg-primary` or `.text-primary` classes.
