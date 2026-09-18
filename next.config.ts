import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server's HMR socket work when opened via the Mac's LAN IP
  // (e.g. from a real phone, or the Simulator's Safari) instead of
  // localhost — without this, Next silently blocks the cross-origin dev
  // resource and the page never hydrates (looks fine, nothing is clickable).
  allowedDevOrigins: ["192.168.1.15"],
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
