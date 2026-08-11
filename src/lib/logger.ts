export type LogLevel = "info" | "warn" | "error";

const FORWARD_LEVELS: LogLevel[] = ["warn", "error"];
const FLUSH_THRESHOLD = 10;
const FLUSH_DELAY_MS = 1000;

let buffer: Record<string, unknown>[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function send(batch: Record<string, unknown>[]) {
  try {
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/log-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

function flush() {
  if (timer != null) {
    clearTimeout(timer);
    timer = null;
  }
  if (buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  send(batch);
}

function enqueue(entry: Record<string, unknown>) {
  buffer.push(entry);
  if (buffer.length >= FLUSH_THRESHOLD) {
    flush();
    return;
  }
  if (timer == null) {
    timer = setTimeout(flush, FLUSH_DELAY_MS);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
}

export function logEvent(level: LogLevel, event: string, fields: Record<string, unknown> = {}) {
  const entry: Record<string, unknown> = { level, event, ...fields };
  if (level === "error") console.error(event, entry);
  else if (level === "warn") console.warn(event, entry);
  else console.log(event, entry);

  if (FORWARD_LEVELS.includes(level)) enqueue(entry);
}
