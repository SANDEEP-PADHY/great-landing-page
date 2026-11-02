import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ['postgres', 'sharp', 'bcryptjs'],
  env: { NEXT_PUBLIC_COMMIT: process.env.COMMIT_SHA ?? '' },
};
export default config;
