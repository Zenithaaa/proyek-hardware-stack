/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      timeout: 120, // Meningkatkan timeout menjadi 120 detik
    },
  },
};

module.exports = nextConfig;
