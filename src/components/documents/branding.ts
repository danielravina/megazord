import type { SupabaseClient } from "@/lib/supabase/types";
import type { TaxSettings } from "@/components/finance/finance-types";
import type { InvoiceBranding } from "./invoice-pdf";

// Branding images live in the public "branding" bucket; only the storage
// path is persisted in tax_settings. For PDF capture the images are inlined
// as data URIs (html2canvas needs no CORS / no expiring signed URLs).
const BRANDING_BUCKET = "branding";

const dataUriCache = new Map<string, string>();

async function pathToDataUri(supabase: SupabaseClient, path: string): Promise<string | null> {
  const cached = dataUriCache.get(path);
  if (cached) return cached;
  const { data } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) return null;
  try {
    const res = await fetch(data.publicUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    dataUriCache.set(path, dataUri);
    return dataUri;
  } catch {
    return null;
  }
}

// Resolve cover + logo data URIs for a user's settings. Returns {} when no
// images are configured; failures degrade silently to a plain document.
export async function resolveBranding(
  supabase: SupabaseClient,
  settings: TaxSettings | null,
): Promise<InvoiceBranding> {
  const branding: InvoiceBranding = {};
  if (!settings) return branding;
  const [cover, logo] = await Promise.all([
    settings.cover_image_path ? pathToDataUri(supabase, settings.cover_image_path) : null,
    settings.logo_path ? pathToDataUri(supabase, settings.logo_path) : null,
  ]);
  if (cover) branding.coverDataUri = cover;
  if (logo) branding.logoDataUri = logo;
  return branding;
}