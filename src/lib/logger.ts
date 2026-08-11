export type LogLevel = "info" | "warn" | "error";

export function logEvent(level: LogLevel, event: string, fields: Record<string, unknown> = {}) {
  const entry: Record<string, unknown> = { level, event, ...fields };
  if (level === "error") console.error(event, entry);
  else if (level === "warn") console.warn(event, entry);
  else console.log(event, entry);

  try {
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/log-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(entry),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
