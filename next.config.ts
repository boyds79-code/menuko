import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Menu photos and payment QR images are served from Supabase Storage's
    // public CDN, which is always a *.supabase.co subdomain.
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

export default nextConfig;
