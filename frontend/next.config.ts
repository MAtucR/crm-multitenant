import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',   // Necesario para el Dockerfile multi-stage
  experimental: {
    // Permite leer variables de entorno del servidor en RSC
  },
};

export default nextConfig;
