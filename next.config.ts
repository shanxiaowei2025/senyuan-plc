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
  // 不使用 standalone，直接打包完整的 node_modules
};

export default nextConfig;
