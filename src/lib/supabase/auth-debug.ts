const STORAGE_KEY = "atzmai-auth-debug-log";
const MAX_ENTRIES = 400;

export type DebugEntry = {
  t: number;
  ev: string;
  [key: string]: unknown;
};

let memoryRing: DebugEntry[] = [];

export function pushDebug(ev: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const entry: DebugEntry = { t: Date.now(), ev, ...data };
  memoryRing.push(entry);
  if (memoryRing.length > MAX_ENTRIES) {
    memoryRing = memoryRing.slice(-MAX_ENTRIES);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const log: DebugEntry[] = raw ? JSON.parse(raw) : [];
    log.push(entry);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(-MAX_ENTRIES)));
  } catch {
    memoryRing.push({ t: Date.now(), ev: "storage-write-failed", note: "localStorage unusable - this itself is a finding" });
  }
}

export function clearDebugLog() {
  memoryRing = [];
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}

export function readDebugLog(): DebugEntry[] {
  if (typeof window === "undefined") return [];
  let persisted: DebugEntry[] = [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    persisted = raw ? JSON.parse(raw) : [];
  } catch {
    persisted = [];
  }
  if (!persisted.length && memoryRing.length) {
    return memoryRing;
  }
  if (memoryRing.length) {
    const seen = new Set(persisted.map((e) => `${e.t}:${e.ev}`));
    const merged = [...persisted, ...memoryRing.filter((e) => !seen.has(`${e.t}:${e.ev}`))];
    merged.sort((a, b) => a.t - b.t);
    return merged.slice(-MAX_ENTRIES);
  }
  return persisted;
}

function timeOf(t: number) {
  try {
    return new Date(t).toLocaleTimeString("he-IL", { hour12: false });
  } catch {
    return new Date(t).toISOString().slice(11, 19);
  }
}

export function environmentBlock(): string {
  if (typeof window === "undefined") return "";
  const lines: string[] = [];
  lines.push(`UA: ${navigator.userAgent}`);
  lines.push(`timezone offset (min): ${new Date().getTimezoneOffset()}`);
  lines.push(`device time: ${new Date().toString()}`);
  lines.push(`onLine: ${navigator.onLine}`);
  lines.push(`cookie enabled: ${navigator.cookieEnabled}`);
  lines.push(`visibility: ${document.visibilityState}`);
  try {
    const keys = Object.keys(window.localStorage);
    lines.push(`localStorage keys: ${keys.join(", ")}`);
    const authKey = keys.find((k) => k.includes("auth-token"));
    if (authKey) {
      const raw = window.localStorage.getItem(authKey) || "";
      let expiresLeft: number | null = null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.expires_at === "number") {
          expiresLeft = parsed.expires_at - Math.round(Date.now() / 1000);
        }
      } catch {
        expiresLeft = null;
      }
      lines.push(`auth-token present: ${raw.replace(/[{}[\]"]/g, "").length} chars, seconds left: ${expiresLeft}`);
    } else {
      lines.push("auth-token present: NO");
    }
  } catch {
    lines.push("localStorage unreadable");
  }
  return lines.join("\n");
}

export function formatLogAsText(): string {
  const entries = readDebugLog();
  const head = [
    "=== רשימת התחברות (אל תערוך, פשוט העתק את הכל) ===",
    environmentBlock(),
    "=== אירועים ===",
  ];
  const body = entries.map((e) => {
    const extras = Object.entries(e)
      .filter(([k]) => k !== "t" && k !== "ev")
      .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
      .join(" ");
    return `[${timeOf(e.t)}] ${e.ev}${extras ? ` ${extras}` : ""}`;
  });
  const tail = ["=== סוף ===", pushMarker("log-copied"), ""];
  return [...head, ...body, ...tail].join("\n");
}

function pushMarker(ev: string) {
  pushDebug(`meta:${ev}`, {});
  return "";
}
