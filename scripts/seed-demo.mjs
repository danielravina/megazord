#!/usr/bin/env node
/**
 * Seed a rich set of demo data into a Supabase account so the dashboard
 * has plenty to show. Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL (from .env.local)
 *   - SUPABASE_SECRET_KEY (from .env, sb_secret_... — bypasses RLS)
 *
 * Usage:
 *   node scripts/seed-demo.mjs --email you@example.com [--yes]
 *
 * Flags:
 *   --email <addr>  target account email (prompted if omitted)
 *   --user-id <uuid>  skip email lookup and seed this user directly
 *   --no-layout     do NOT write the rich dashboard layout
 *   --yes           skip the destructive confirmation
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import crypto from "node:crypto";

// ── Tiny env loader (no dotenv dependency) ──────────────
function loadEnvFile(file) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

// ── CLI args ────────────────────────────────────────────
const args = process.argv.slice(2);
function argVal(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
const emailArg = argVal("--email");
const userIdArg = argVal("--user-id");
const yes = args.includes("--yes");
const seedLayout = !args.includes("--no-layout");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secretKey) {
  console.error("Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL (in .env.local) and SUPABASE_SECRET_KEY (in .env).");
  process.exit(1);
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

// ── Helpers ─────────────────────────────────────────────
const rand = mulberry32(20260804);
const ri = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const rf = (min, max) => rand() * (max - min) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const round100 = (n) => Math.round(n / 100) * 100;
const round10 = (n) => Math.round(n / 10) * 10;
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const daysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const uid = () => crypto.randomUUID();

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function insertRows(table, rows) {
  if (!rows.length) {
    console.log(`  ${table}: 0 rows`);
    return;
  }
  const chunkSize = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`insert into ${table} failed: ${error.message}`);
    inserted += chunk.length;
  }
  console.log(`  ${table}: ${inserted} rows`);
}

async function clearTable(table, targetId) {
  const { error } = await supabase.from(table).delete().eq("user_id", targetId);
  if (error) throw new Error(`clear ${table} failed: ${error.message}`);
}

// ── Resolve target user ─────────────────────────────────
async function promptEmail() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const email = await rl.question("Enter the email of the account to seed: ");
  rl.close();
  return email.trim();
}

async function resolveUser() {
  if (userIdArg) {
    return { id: userIdArg, email: emailArg || userIdArg };
  }

  const email = emailArg || (await promptEmail());
  if (!email) {
    console.error("No email provided.");
    process.exit(1);
  }

  try {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    const user = (data?.users || []).find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) return { id: user.id, email: user.email };
    console.error(`No user found with email "${email}".`);
  } catch (e) {
    console.error(`Could not look up user via auth.admin (${e.message}).`);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const id = (await rl.question("Paste the target user_id instead: ")).trim();
  rl.close();
  if (!id) process.exit(1);
  return { id, email };
}

// ── Confirmation ────────────────────────────────────────
async function confirmDestructive(target) {
  if (yes) return;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `This will DELETE all existing rows for ${target.email} (${target.id}) in:\n` +
      `  incomes, expenses, savings, projects, documents, todos, events\n` +
      `and then insert the demo dataset${seedLayout ? " + a rich dashboard layout" : ""}.\n` +
      `Continue? [y/N] `,
  );
  rl.close();
  if (answer.trim().toLowerCase() !== "y") {
    console.log("Aborted.");
    process.exit(0);
  }
}

// ── Data generation ─────────────────────────────────────
const CUSTOMERS = [
  { name: "אלעד כהן", email: "elad@example.com" },
  { name: "נועה לוי", email: "noa@example.com" },
  { name: "דוד מזרחי", email: "david@example.com" },
  { name: "רונית פרץ", email: "ronit@example.com" },
  { name: "יוסי אברהם", email: "yossi@example.com" },
  { name: "מיכל ביטון", email: "michal@example.com" },
  { name: "אבי גולן", email: "avi@example.com" },
  { name: "שירה דהן", email: "shira@example.com" },
  { name: "משה וקנין", email: "moshe@example.com" },
  { name: "תמר בן-דוד", email: "tamar@example.com" },
  { name: "ערן שגיא", email: "eran@example.com" },
  { name: "ליאור אוחנה", email: "lior@example.com" },
  { name: "גלית הראל", email: "galit@example.com" },
  { name: "איתי ברק", email: "itay@example.com" },
  { name: "דנה שפירא", email: "dana@example.com" },
  { name: "רונן עזריה", email: "ronen@example.com" },
];
const LOCATIONS = ["תל אביב", "ירושלים", "חיפה", "באר שבע", "רמת גן", "הרצליה", "פתח תקווה", "נתניה", "רחובות", "ראשון לציון"];
const PROJECT_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
const WORK_TYPES = ["עיצוב אתר", "בניית מערכת", "ייעוץ עסקי", "פיתוח מוצר", "שירות תחזוקה"];
const RECURRING = ["מנוי חודשי - שירות ניהול", "תחזוקה חודשית - אתר", "מנוי תוכנה חודשי"];
const TODO_TEXTS = [
  "להכין הצעת מחיר ללקוח חדש", "לעדכן חשבונית מס אחרונה", "לטלפן לספק על הזמנה",
  "לסיים מצגת לפרויקט הבא", "לשלם מקדמות מס", "לארגן את התיקיות במסמכים",
  "לענות למייל של רו\"ח", "לחדש ביטוח עסקי", "להזמין ציוד משרדי",
  "לסכם חודש עם הלקוחות", "להעלות דוחות חודשיים", "לעדכן לוח שנה",
  "לבדוק יתרת קופת גמל", "להכין רשימת חובות לקוחות",
];
const EVENT_TITLES = [
  "פגישת לקוח", "תחזוקה שבועית", "הפקדת פיקדון", "בדיקת חשבונות", "סדנת הכשרה",
  "שיחת ייעוץ", "הגשת דוח מע\"מ", "תשלום ספקים", "פגישת צוות", "זימון מס הכנסה",
];

function buildDemoData(targetId) {
  const nowDate = new Date();
  const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());

  // ── Incomes ──
  const incomes = [];
  for (let m = -12; m <= 0; m++) {
    const monthStart = addMonths(new Date(nowDate.getFullYear(), nowDate.getMonth(), 1), m);
    const dim = daysInMonth(monthStart);
    for (let i = 0, n = ri(2, 4); i < n; i++) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), ri(1, dim));
      if (date > today) continue;
      incomes.push({
        id: uid(), user_id: targetId,
        description: `${pick(CUSTOMERS).name} - ${pick(WORK_TYPES)}`,
        amount: round100(rf(3000, 28000)),
        date: iso(date),
        type: pick(["שוטף", "שוטף", "שוטף", "עתידי"]),
      });
    }
    for (let i = 0, n = ri(1, 2); i < n; i++) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), ri(1, dim));
      if (date > today) continue;
      incomes.push({
        id: uid(), user_id: targetId,
        description: pick(RECURRING),
        amount: round10(rf(1500, 6000)),
        date: iso(date),
        type: "שוטף",
      });
    }
  }
  for (let i = 0; i < 3; i++) {
    const date = addDays(today, ri(2, 20));
    incomes.push({
      id: uid(), user_id: targetId,
      description: `${pick(CUSTOMERS).name} - מקדמה על פרויקט`,
      amount: round100(rf(5000, 20000)),
      date: iso(date),
      type: "עתידי",
    });
  }

  // ── Expenses ──
  const expenses = [];
  for (let m = -12; m <= 0; m++) {
    const monthStart = addMonths(new Date(nowDate.getFullYear(), nowDate.getMonth(), 1), m);
    const dim = daysInMonth(monthStart);
    const push = (description, amount, category, day) => {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day ?? ri(1, dim));
      if (date > today) return;
      expenses.push({
        id: uid(), user_id: targetId,
        description, amount, date: iso(date), category,
        is_paid: rand() < 0.92,
      });
    };
    push("שכירות משרד", 4200, "שכירות", ri(1, 5));
    push("שיווק דיגיטלי", round10(rf(800, 2500)), "שיווק");
    if (rand() < 0.7) push("פרסום ברשתות", round10(rf(500, 1800)), "שיווק");
    push("חשמל ומשרד", round10(rf(300, 1100)), "חשבונות");
    if (rand() < 0.7) push("אינטרנט וסלולר", round10(rf(250, 700)), "חשבונות");
    if (rand() < 0.8) push("רכש ציוד", round100(rf(400, 9000)), "רכש");
    if (rand() < 0.7) push("הוצאות פרויקט", round100(rf(600, 6000)), "פרויקט");
    push("הפרשות סוציאליות", round100(rf(1500, 2800)), "הפרשות", ri(20, 28));
  }

  // ── Savings ──
  const savings = [];
  for (let m = -17; m <= 0; m++) {
    const monthStart = addMonths(new Date(nowDate.getFullYear(), nowDate.getMonth(), 1), m);
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), ri(1, 5));
    if (date > today) continue;
    const d = iso(date);
    savings.push({ id: uid(), user_id: targetId, fund_type: "קרן השתלמות", amount: round10(rf(800, 900)), date: d });
    savings.push({ id: uid(), user_id: targetId, fund_type: "פנסיה", amount: round10(rf(1400, 1600)), date: d });
    savings.push({ id: uid(), user_id: targetId, fund_type: "קופת גמל", amount: round10(rf(400, 600)), date: d });
    if (rand() < 0.3) savings.push({ id: uid(), user_id: targetId, fund_type: "אחר", amount: round100(rf(300, 1500)), date: iso(addDays(date, 2)) });
  }

  // ── Projects (+ their calendar events) ──
  const customers = CUSTOMERS.map((c) => ({
    id: uid(), user_id: targetId,
    name: c.name, email: c.email,
    phone: null, company: null, vat_number: null, address: null, notes: null,
  }));
  const projects = [];
  const projectEvents = [];
  for (let i = 0; i < 12; i++) {
    const start = addDays(new Date(nowDate.getFullYear(), nowDate.getMonth(), 1), ri(-300, 60));
    const startDate = new Date(start.getFullYear(), start.getMonth(), ri(1, 28));
    const duration = ri(3, 45);
    const quote = round100(rf(15000, 95000));
    const id = uid();
    const color = pick(PROJECT_COLORS);
    const customer = pick(customers);
    const location = rand() < 0.7 ? pick(LOCATIONS) : null;
    projects.push({
      id, user_id: targetId,
      customer_id: customer.id,
      location,
      quote_price: quote,
      expenses: round100(rf(3000, 30000)),
      color,
      start_date: iso(startDate),
      start_time: rand() < 0.5 ? pick(["08:00", "09:00", "10:00"]) : null,
      duration: String(duration),
      closing_price: Math.round(quote * rf(0.85, 1.05)),
      search_words: null,
    });
    if (rand() < 0.85) {
      projectEvents.push({
        id: uid(), user_id: targetId,
        title: `${customer.name}${location ? ` - ${location}` : ""}`,
        date: iso(startDate),
        end_date: duration > 1 ? iso(addDays(startDate, duration - 1)) : null,
        color,
        is_project: true,
        project_id: id,
      });
    }
  }

  // ── Documents ──
  const documents = [];
  const mkDoc = (title, docType, direction, totalAmount, date, folder, isInvestment, isPaid, projectId = null) => ({
    id: uid(), user_id: targetId,
    title,
    image_url: null,
    tags: [],
    extracted_text: null,
    doc_type: docType,
    date_on_doc: iso(date),
    total_amount: totalAmount,
    project_id: projectId,
    folder: folder || null,
    is_investment: isInvestment,
    direction,
    is_paid: isPaid,
    business_id: null,
    date: `${iso(date)}T12:00:00.000Z`,
  });

  for (let i = 0; i < 30; i++) {
    const date = addDays(today, ri(-365, 0));
    const docNum = `${date.getFullYear()}-${pad(ri(1, 60))}`;
    documents.push(mkDoc(
      `חשבונית ${docNum} - ${pick(CUSTOMERS).name}`, "Invoice", "income",
      round100(rf(2000, 25000)), date, "הכנסות", false, rand() < 0.5,
    ));
  }
  const expCats = ["שיווק", "שכירות", "חשבונות", "פרויקט", "רכש"];
  for (let i = 0; i < 14; i++) {
    const date = addDays(today, ri(-365, 0));
    const cat = pick(expCats);
    documents.push(mkDoc(`חשבונית רכישה - ${cat}`, pick(["Invoice", "Delivery Note"]), "expense", round100(rf(400, 9000)), date, cat, false, true));
  }
  for (let i = 0; i < 4; i++) {
    const date = addDays(today, ri(-120, 0));
    documents.push(mkDoc(`הצעת מחיר - ${pick(CUSTOMERS).name}`, "Proforma Invoice", "other", round100(rf(5000, 40000)), date, "הצעות", false, false));
  }
  const INVEST = [
    ["מחשב נייד חדש - Apple", 12500],
    ["מצלמה מקצועית - Sony", 8900],
    ['צג מקצועי 32"', 4200],
    ["תוכנת עיצוב שנתית", 3600],
  ];
  for (const [title, amount] of INVEST) {
    const date = addDays(today, ri(-365, 0));
    documents.push(mkDoc(title, "Invoice", "expense", amount, date, "השקעות", true, true));
  }

  // ── Invoices ──
  const invoices = [];
  const invSequences = {};
  const mkItems = () => {
    const items = [];
    for (let i = 0, n = ri(1, 3); i < n; i++) {
      items.push({
        id: uid(),
        description: pick(WORK_TYPES),
        quantity: ri(1, 4),
        unit_price: round10(rf(250, 1200)),
      });
    }
    return items;
  };
  for (let i = 0; i < 24; i++) {
    const issueDate = addDays(today, ri(-365, -1));
    const year = issueDate.getFullYear();
    invSequences[year] = (invSequences[year] || 0) + 1;
    const items = mkItems();
    const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
    const vatRate = 17;
    const amount = Math.round(subtotal * (1 + vatRate / 100) * 100) / 100;
    const customer = pick(customers);
    const custProjects = projects.filter((p) => p.customer_id === customer.id);
    const project = custProjects.length && rand() < 0.6 ? pick(custProjects) : null;
    const status = pick(["draft", "sent", "sent", "paid", "paid"]);
    invoices.push({
      id: uid(), user_id: targetId,
      customer_id: customer.id,
      project_id: project ? project.id : null,
      invoice_number: `${year}-${String(invSequences[year]).padStart(4, "0")}`,
      issue_date: iso(issueDate),
      due_date: iso(addDays(issueDate, 30)),
      items,
      amount,
      vat_rate: vatRate,
      status,
      notes: null,
      sent_at: status === "draft" ? null : new Date(addDays(issueDate, ri(0, 3))).toISOString(),
      created_at: new Date(addDays(issueDate, -2)).toISOString(),
    });
  }

  // ── Todos ──
  const todos = TODO_TEXTS.map((text, i) => ({
    id: uid(), user_id: targetId, text, completed: i < 6,
    created_at: new Date(addDays(today, ri(-60, 0))).toISOString(),
  }));

  // ── Events (standalone) ──
  const events = [...projectEvents];
  for (let i = 0; i < 8; i++) {
    const date = addDays(today, ri(-120, -1));
    events.push({
      id: uid(), user_id: targetId, title: pick(EVENT_TITLES),
      date: iso(date), color: pick(PROJECT_COLORS), is_project: false, project_id: null, end_date: null,
    });
  }
  for (let i = 0; i < 10; i++) {
    const date = addDays(today, ri(1, 45));
    events.push({
      id: uid(), user_id: targetId, title: pick(EVENT_TITLES),
      date: iso(date), color: pick(PROJECT_COLORS), is_project: false, project_id: null, end_date: null,
    });
  }

  return { incomes, expenses, savings, customers, projects, documents, invoices, todos, events };
}

function buildLayout() {
  return [
    { id: uid(), type: "calendar", dataSource: "calendar:today", span: 1 },
    { id: uid(), type: "hero", dataSource: "income", timeRange: "this_month", span: 1 },
    { id: uid(), type: "hero", dataSource: "expenses", timeRange: "this_month", span: 1 },
    { id: uid(), type: "hero", dataSource: "profit", timeRange: "this_month", span: 1 },
    { id: uid(), type: "hero", dataSource: "tax", timeRange: "this_month", span: 1 },
    { id: uid(), type: "doughnut", dataSource: "expenses", timeRange: "this_month", span: 2 },
    { id: uid(), type: "bar", dataSource: "profit", timeRange: "this_year", span: 2 },
    { id: uid(), type: "timeline", dataSource: "income", timeRange: "this_year", span: 2 },
    { id: uid(), type: "doughnut", dataSource: "savings", timeRange: "all_time", span: 2 },
    { id: uid(), type: "table", dataSource: "documents", timeRange: "this_month", span: 2 },
    { id: uid(), type: "table", dataSource: "todos", timeRange: "all_time", span: 2 },
    { id: uid(), type: "hero", dataSource: "receivables", timeRange: "all_time", span: 1 },
  ];
}

// ── Main ────────────────────────────────────────────────
(async () => {
  const target = await resolveUser();

  await confirmDestructive(target);

  console.log(`\nSeeding demo data for ${target.email}...\n`);

  // Clear (documents/events before projects because of FKs)
  const tables = ["documents", "events", "invoices", "projects", "customers", "incomes", "expenses", "savings", "todos"];
  for (const t of tables) {
    try {
      await clearTable(t, target.id);
    } catch (e) {
      console.error(`  ⚠ ${t} clear failed (continuing): ${e.message}`);
    }
  }
  console.log("Existing data cleared.\n");

  const demo = buildDemoData(target.id);

  console.log("Inserting data:");
  await insertRows("incomes", demo.incomes);
  await insertRows("expenses", demo.expenses);
  await insertRows("savings", demo.savings);
  await insertRows("customers", demo.customers);
  await insertRows("projects", demo.projects);
  await insertRows("invoices", demo.invoices);
  await insertRows("documents", demo.documents);
  await insertRows("todos", demo.todos);
  await insertRows("events", demo.events);

  // Tax settings (so tax widgets + preferences have values)
  const { error: taxErr } = await supabase.from("tax_settings").upsert({
    user_id: target.id,
    vat_rate: 17,
    vat_frequency: "bimonthly",
    vat_billing_day: 15,
    income_tax_advance: 15,
    income_tax_billing_day: 15,
    bituah_leumi: 5,
    bituah_leumi_billing_day: 15,
    credit_points: 2.25,
    business_name: "העסק שלי בע״מ",
    vat_number: "515000123",
    business_address: "רחוב הרצל 12, תל אביב",
    business_phone: "050-1234567",
    accountant_email: "roeh@example.com",
    owner_name: target.email,
  });
  if (taxErr) console.error(`  ⚠ tax_settings upsert failed: ${taxErr.message}`);
  else console.log("  tax_settings: 1 row");

  if (seedLayout) {
    const { error: layoutErr } = await supabase.from("user_dashboard").upsert({
      user_id: target.id,
      layout: buildLayout(),
      updated_at: new Date().toISOString(),
    });
    if (layoutErr) console.error(`  ⚠ user_dashboard upsert failed: ${layoutErr.message}`);
    else console.log("  user_dashboard: rich layout seeded");
  }

  console.log("\nDone! Summary:");
  console.log(`  incomes:   ${demo.incomes.length}`);
  console.log(`  expenses:  ${demo.expenses.length}`);
  console.log(`  savings:   ${demo.savings.length}`);
  console.log(`  projects:  ${demo.projects.length}`);
  console.log(`  invoices:  ${demo.invoices.length}`);
  console.log(`  documents: ${demo.documents.length}`);
  console.log(`  todos:     ${demo.todos.length}`);
  console.log(`  events:    ${demo.events.length}`);
  console.log("\nOpen the app and reload the dashboard to see the rich demo data.");
})().catch((e) => {
  console.error("\nSeed failed:", e.message);
  process.exit(1);
});
