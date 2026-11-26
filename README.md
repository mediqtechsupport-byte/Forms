# MediQ Pharma — Paperless Employee Forms & Approval Portal

A role-based digital forms portal powered by **React + Vite + TypeScript + Tailwind CSS + Supabase** (Auth, Postgres with Row-Level Security, Realtime subscriptions, and Private Storage).

## Portals & Roles

| Role | Route | Capabilities |
| --- | --- | --- |
| **Employee** | `/employee` | File digital **Leave**, **Overtime**, **Reimbursement**, **Official Business / Field Work**, **Cash Advance**, and **Other HR** forms with e-signatures & receipt uploads; track live statuses & leave credits; print/save PDF slips. |
| **HR Admin** | `/hr` | Review, endorse, approve, or reject Leave, Overtime, Official Business & HR requests; manage employee directory, departments, and annual VL/SL/EL leave credits; publish company memos. |
| **Boss Executive** | `/boss` | Executive KPIs & 1-click final sign-off across **all** digital forms; assign or revoke Employee, HR, Boss, and Accounting roles. |
| **Accounting Admin** | `/accounting` | Verify reimbursement & cash advance receipts, record Bank/Check/GCash disbursement references & mark Paid, track approved Overtime hours for payroll, and export CSV ledgers. |

## First-Time Setup

1. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
2. Install dependencies and start locally:
   ```bash
   npm install
   npm run dev
   ```
3. Register the **first account** — it is automatically assigned the **Boss Executive** role so you can immediately onboard teammates and assign **HR Admin** and **Accounting Admin** roles from `/boss`.
