/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@bsr/shared", "@bsr/db"],
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
