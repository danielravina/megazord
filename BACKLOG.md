# Backlog — עצמאי (Atzma'i)

## Legend
- ✅ Done — verified implemented
- 🔴 P0 — must have (blocking / core flow broken)
- 🟠 P1 — high priority (next 1-2 weeks)
- 🟡 P2 — medium priority (next month)
- 🟢 P3 — nice to have (future)

---

## ✅ Already Done

| Kanban | Feature | Where |
|--------|---------|-------|
| `req_fzank7osp` | Scanned invoices sync to expenses table | `documents-page.tsx` saveDocument |
| `req_qox2j681t` | Pension/training fund savings tracking | `finance-page.tsx` savings tab |
| `req_zm0aidyzd` | Tax billing dates per authority | `finance-page.tsx` getNextBillingDay() |
| `req_pdx0e56id` | Credit points editing and calculation | `finance-page.tsx` tax tab, `tax-engine.ts` |
| `req_u878zkwkp` | Calculator accessible from dashboard | `dashboard-page.tsx` modal |
| `req_icn5rk7lz` | Document folders (hardcoded 8 categories) | `documents-page.tsx` FOLDERS array |
| P0 #1 | Project detail page shows linked documents | `project-detail-page.tsx` |
| P0 #2 | Project picker in document upload form | `documents-page.tsx` |
| P1 #3 | Income vs Expense document direction | `documents-page.tsx`, `direction` column |
| P1 #4 | Delivery notes → future expenses (is_paid, pending/paid split) | `documents-page.tsx`, `project-detail-page.tsx` |
| P1 #5 | Business/VAT extraction + supplier tracking | `ocr-document/index.ts`, `documents-page.tsx`, `businesses` table |
| P1 #6 | Monthly PDF export (preview, download, Resend email) | `monthly-export.tsx`, edge function `send-report` |
| P1 #7 | Future tax payment dashboard widget | `future-tax-widget.tsx`, `dashboard-page.tsx` |
| P1 #8 | Expense pie chart (Chart.js Doughnut) | `expense-pie-chart.tsx`, `finance-page.tsx`, `dashboard-page.tsx` |

---

## 🔴 P0 — Done ✅

All P0 items complete.

---

## 🟠 P1 — Done ✅

All P1 items complete: document direction, delivery notes, business/VAT extraction, monthly PDF export, tax widget, expense pie chart.

---

## 🟡 P2 — Remaining

| # | Item |
|---|------|
| 9 | Customizable document folders |
| 11 | Global project/doc search |
| 12 | Investment tracking (real data) |
| 13 | Scanner edge detection |
| 14 | Draggable calculator |
| 15 | PDF support for scanner |

---

## 🟢 P3 — Remaining

| # | Item |
|---|------|
| 16 | Employees module |
| 17 | AI assistant |
