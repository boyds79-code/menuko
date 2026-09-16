import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Menu photos and payment QR images are served from Supabase Storage's
    // public CDN, which is always a *.supabase.co subdomain.
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  experimental: {
    serverActions: {
      // Payment proof screenshots are compressed client-side first (same
      // as menu photos), but phone screenshots can still be a couple MB
      // before that kicks in — leave headroom over the 1MB default.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
