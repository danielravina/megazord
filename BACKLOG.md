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
| P1 #7 | Future tax payment dashboard widget | `future-tax-widget.tsx`, `dashboard-page.tsx` |
| P1 #8 | Expense pie chart (Chart.js Doughnut) | `expense-pie-chart.tsx`, `finance-page.tsx`, `dashboard-page.tsx` |

---

## 🔴 P0 — Done ✅

### 1. Document ↔ Project Linking ✅
Project detail page shows linked documents with thumbnails, amounts, and totals.

### 2. Upload Project Picker ✅
Simple dropdown in confirmation form to assign document to existing project.

---

## 🟠 P1 — Remaining

### 4. Delivery Notes → Future Expenses
Documents with docType "Delivery Note" default to unpaid. Project page shows pending/paid split. "שולם" button converts to expense.

### 5. Business/VAT Number Extraction
Extract VAT numbers from OCR, link documents to businesses, track per-supplier totals.

### 6. Monthly PDF Export
Generate monthly PDF of documents grouped by category using html2pdf.js.

---

## 🟡 P2 — Medium Priority

### 9. Customizable Document Folders
**Kanban:** `req_icn5rk7lz`, `req_awcrbfb7j`

**Problem:** Folders are hardcoded. Users can't add, rename, or delete folders.

**Solution:**
- Move to DB table `document_folders` with user_id, name, icon, color
- Add folder management UI (add/edit/delete)
- Seed with current 8 folders as defaults
- Update documents to reference folder by ID

**Files:** `documents-page.tsx`, migration

### 10. Document Filing by Date on Document
**Kanban:** `req_fwql2r7ks`

**Problem:** Documents are sorted by upload date. They should be sorted/filed by the date ON the document (already extracted by OCR as `date_on_doc`).

**Solution:**
- Change `loadDocs()` to order by `date_on_doc` instead of `date`
- Add sort toggle: by upload date | by document date
- Monthly export uses `date_on_doc` for grouping

**Files:** `documents-page.tsx`

### 11. Global Project & Document Search
**Kanban:** `req_sp4uix0ms`

**Problem:** Projects have `search_words` field but no search input. Documents have search but it's only title/text/tags. No unified search across the app.

**Solution:**
- Projects page: add search bar filtering by customer_name and search_words  
- Documents page: already has search — ensure it also searches extracted_text properly
- Optional: global search in sidebar that searches across both

**Files:** `projects-page.tsx`, `documents-page.tsx`

### 12. Investment Tracking on Dashboard
**Kanban:** `req_ptq5lch99`

**Problem:** Dashboard shows hardcoded "שווי עסק מוערך: ₪300,000". Should aggregate actual investment documents.

**Solution:**
- Load documents where `is_investment = true`
- Sum total_amount for the investment section
- Also show in monthly export under a separate "השקעה בעסק" category

**Files:** `dashboard-page.tsx`

### 13. Scanner Effect (Document Edge Detection)
**Kanban:** `req_bqptpjmt5`

**Problem:** Camera photos of documents have poor contrast and background noise. OCR accuracy suffers.

**Solution:**
- Post-process uploaded images before OCR: auto-crop to paper edges, increase contrast, remove background
- Use Canvas API with basic edge detection
- Improves OCR accuracy significantly

**Files:** new `scanner-effect.ts`, `documents-page.tsx`

### 14. Drag & Scale Calculator
**Kanban:** `req_u878zkwkp`

**Problem:** Calculator opens in a fixed modal. User wants to drag it around and resize.

**Solution:**
- Add draggable header to the calculator modal
- Add resize handle (bottom-right corner)
- Persist position/size in localStorage
- Works on both desktop and touch (mobile)

**Files:** `dashboard-page.tsx`, `calculator-page.tsx`

### 15. PDF Support for Scanner
**Kanban:** `req_2maso6vto`

**Problem:** Scanner only accepts images. User wants to scan PDF files too.

**Solution:**
- Accept `application/pdf` in file input
- Use PDF.js to render first page to canvas/image
- Pass rendered image to OCR as usual
- Store original PDF in storage

**Files:** `documents-page.tsx`, new `pdf-to-image.ts`

---

## 🟢 P3 — Nice to Have

### 16. Employees Module
**Kanban:** `req_yyqup5zg6`

**Problem:** No way to track employee costs, personal details, or documents per employee.

**Solution:**
- New `employees` table: name, id_number, phone, birth_date, tax_file, photo
- Salary tracking: global monthly / hourly / daily
- Documents linked per employee
- Employee costs show in expenses under new category

**Files:** new route and components, migration

### 17. AI Assistant
**Kanban:** `req_9n9ok0j7g`

**Problem:** No AI chat for self-employed help, form filling, or document lookup.

**Solution:**
- Floating chat button using OpenRouter (same API as OCR)
- System prompt tuned for Israeli self-employed knowledge
- Save generated documents to folders

**Files:** new `ai-assistant.tsx`, migration

### 18. Accountant Email Export
**Kanban:** `req_t11yxor68`

**Problem:** User wants monthly documents auto-emailed to their accountant.

**Solution:**
- Add accountant email field in settings
- After monthly PDF export, offer "שלח לרואה חשבון"
- Use Supabase Edge Function or a third-party email service

**Files:** new edge function, settings UI

---

## Implementation Order

```
Phase 1 (Now) — P0:
  1. Project detail page shows linked documents
  2. Upload prompt: "attach to project?"

Phase 2 (Next) — P1:
  3. Income vs expense document direction
  4. Delivery notes → pending expenses with "paid" toggle
  5. Business/VAT number extraction
  6. Monthly PDF export
  7. Future tax payment dashboard widget
  8. Expense pie chart with real data

Phase 3 — P2:
  9. Customizable folders
  10. Date-based filing
  11. Global search
  12. Investment tracking
  13. Scanner edge detection
  14. Draggable calculator
  15. PDF support

Phase 4 — P3:
  16. Employees module
  17. AI assistant
  18. Accountant email
```
