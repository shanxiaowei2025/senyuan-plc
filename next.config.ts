import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // 禁用严格模式以消除Swagger UI的生命周期警告
  eslint: {
    ignoreDuringBuilds: true, // 构建时忽略ESLint错误
  },
  typescript: {
    ignoreBuildErrors: true, // 构建时忽略TypeScript错误
  },
  output: 'standalone', // 用于生产部署
};

export default nextConfig;
