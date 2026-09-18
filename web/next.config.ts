import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phones reach the dev server through a tunnel host.
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok.app", "*.ngrok-free.dev"],
};

export default nextConfig;
