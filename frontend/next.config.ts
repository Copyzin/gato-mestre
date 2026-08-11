import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Permite importar tipos de ../shared (fora da raiz do frontend)
    externalDir: true,
  },
};

export default nextConfig;
