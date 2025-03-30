/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["ddragon.leagueoflegends.com"],
  },
  env: {
    // Define a fallback as empty string when env var is not available
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "",
  },
};

module.exports = nextConfig;
