# SuperMeal — Complete User Guide

Welcome to the **SuperMeal** platform! SuperMeal takes the headache out of managing shared bachelor messes, hostels, or roommates by automating the math for groceries, daily meals, deposits, and utility bills. 

This guide covers everything step-by-step.

---

## 1. Getting Started (Registration & Approval)

### Creating an Account
1. Open the application and click **"Create Workspace"** (or navigate to `/register`).
2. Enter your Email and Password (you can use the eye icon to verify your password).
3. Enter your **Mess Name** (e.g., "Sky View Boys"). The system will automatically generate a clean URL slug (e.g., `sky-view-boys`), but you can edit this if you prefer a different link for your members.
4. Click **Create Workspace**.

### The Pending Status
Once registered, you are heavily protected. You will be redirected to the **Pending Approval** page. 
- You cannot access the dashboard yet.
- The system Super Admin (the "Senpai") must verify your identity and approve your workspace.
- This ensures no unauthorized persons can create spam workspaces on the platform.
- Once approved, log in at `/admin/login`.

---

## 2. The Senpai Dashboard (Super Admin Only)
If you are the designated "Senpai" (configured via environment variables), you have special access to `/senpai`.
1. Log in with the exact Senpai email address.
2. Navigate to **Senpai Portal**.
3. You will see a list of all registered Mess Workspaces.
4. **Actions available:**
   - **Approve:** Grants the user the `admin` role. They can now use the app.
   - **Reject:** Leaves them in `pending_admin`.
   - **Revoke:** If an active mess violates rules or no longer needs access, click Revoke. This instantly locks them out of their dashboard and shuts down their Public View link.

---

## 3. Managing the Admin Dashboard

When you log in successfully as an approved Admin, you arrive at the **Overview** dashboard.

### Dashboard Features:
- **Month Navigator:** Use the Left and Right arrows at the top to switch the view between different months (e.g., "February 2026" to "March 2026").
- **Stat Cards:** Quick summary of Active Members, Total Meals, Current Meal Rate, and Total Expenses.
- **Charts:** Visual representation of how Deposits compare to Expenses for the viewing month.
- **Copy Due List:** If any members currently owe money, a "Copy Due List" button will appear. Clicking it copies a pre-formatted WhatsApp message listing everyone's debts so you can paste it directly into your mess group chat.
- **Quick Actions:** Shortcuts to jump directly to Meals, Groceries, Deposits, or Utilities.
- **Open Public View:** Click this to open a read-only page. You can copy the URL of this page and send it to your roommates so they can check their own meal counts without logging in!

---

## 4. Setting Up Members
Before you log meals, you need people.
1. Go to the **Members** tab in the sidebar.
2. Click **"+ Add Member"**. Type their name and save.
3. They will appear in the table. 
4. **Deactivating a Member:** If a roommate moves out, you do *not* delete them (as that would ruin past calculations). Instead, click "Edit" and toggle them "Inactive". They will disappear from the daily meal logging screen, but their past data remains safe.

---

## 5. Daily Meal Tracking
1. Go to the **Daily Meals** tab.
2. The top bar defaults to *Today's date*, but you can use the date picker to log meals for yesterday or future dates.
3. For the selected date, you will see a list of all active members.
4. Adjust the **"+"** and **"-"** counters for **Regular Meals** and **Guest Meals**.
5. The data is saved instantly to the database as you click. No "Save" button required.

---

## 6. Financial Tracking (Meal Side)

The Meal budget is strictly separated from the Utility budget.

### Adding Groceries / Bazaar
1. Go to **Groceries**.
2. Select the date of the shopping trip.
3. Add a description (e.g., "Chicken and Rice") and the exact cost.
4. Click Add. The Total Grocery cost controls the "Meal Rate".

### Adding Meal Deposits
1. Go to **Meal Deposits**.
2. When a member hands you cash (e.g., 2000 Tk advance for the month's food), log it here.
3. Select the member, enter the amount, and save.

---

## 7. Financial Tracking (Utility Side)

Utilities are fixed costs (WiFi, Electricity, Maid) that are usually split equally, independent of how much food someone eats.

### Adding a Utility Bill
1. Go to **Utility Bills**.
2. Add a bill description (e.g., "March WiFi").
3. Enter the total cost for the whole mess (e.g., 1000 Tk).
4. Enter an optional Due Date.
5. **Marking Paid:** Once the bill is added, click on it to expand a checklist of all members. As members hand you their share for that specific bill, tick their name off! 

### Adding Utility Deposits (Extra)
1. Go to **Utility Deposits**.
2. If the mess collects a flat monthly fee (e.g., 1500 Tk/month for all fixed costs), log that cash here instead of tracking individual bills. It serves as a ledger of who has given their fixed money.

---

## 8. Month-End Settlement

This is the magic of SuperMeal.
1. Go to **Settlement** at the end of the month.
2. The app automatically calculates:
   - **Meal Rate:** (Total Groceries / Total Meals)
   - **Individual Cost:** (Member's Meals × Meal Rate)
   - **Net Balance:** (Meal Deposits - Individual Cost)
3. **Reading the Table:**
   - **Refund Due (Green):** You, the manager, must hand this cash *back* to the member.
   - **Amount Owed (Red):** The member ate more than they deposited and must pay you this cash.
   - **Cash on Hand:** Shows exactly how much physical cash should be left in your manager drawer right now to distribute the refunds.
4. **Print / PDF:** Click the Print icon in the top right to generate a clean, paper-friendly invoice to stick on your fridge.

---

## 9. Locking and Archiving (The End of Month Process)

To keep the application fast and calculations protected, there are two specialized features on the Dashboard during the final days of a month.

### 1. Lock Month (Soft Protection)
- Available all month.
- Click **Lock Month** on the Dashboard.
- This prevents anyone (even you) from accidentally adding meals, groceries, or deposits to this month.
- Useful if you finalized calculations on the 30th but the new month hasn't officially started. You can "Unlock" it at any time.

### 2. Close Month & Settle (Hard Reset)
- **Appears only during the last 7 days of the calendar month.**
- This is the final, irreversible action you take to wrap up a month and start a fresh slate.
- **What happens when you click Close Month?**
  1. The system calculates the exact final settlement (Meal Rate, who gets refunds, who owes money).
  2. It saves a permanent, untouchable snapshot of this math to the **History** tab.
  3. It **permanently deletes** all recorded Daily Meals, Meal Deposits, and Groceries for that month.
- **Why?** This automatically resets your ledger to 0.00 Tk for the new upcoming month, preventing the database from slowing down, while perfectly preserving the math in the History page if anyone disputes their refund later.

---

## 10. The History Page
1. Go to the **History** tab (Archive Icon).
2. You will see a list of previously closed months (e.g., "February 2026").
3. Click a card to expand it. You will see the exact settlement table matching the day you closed the month.
4. This is your permanent archive.

---

## 11. Settings & Customization
1. At the bottom of the sidebar, click the **Settings (Gear)** icon.
2. **Themes:** Switch between the standard "Classic White/Dark" theme and the vibrant "Emerald" theme. The theme saves instantly to your profile.
3. **Broadcast Message:** Type a message here and hit save. It will appear as a scrolling marquee banner across the top of the dashboard for everyone viewing the Public Link (e.g., to announce "Bring deposit money by Friday!").

**Enjoy managing your mess with SuperMeal!**
