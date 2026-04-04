/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled to avoid double socket connections in dev
  images: {
    domains: ['api.dicebear.com', 'avatars.githubusercontent.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000',
  },
};

module.exports = nextConfig;
