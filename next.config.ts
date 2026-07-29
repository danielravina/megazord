import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://uqzlhaifylnhnbgrhdkw.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_sqZzClvEpEr5KQv3oy82uw_911bn0Qw",
  },
};

export default nextConfig;
