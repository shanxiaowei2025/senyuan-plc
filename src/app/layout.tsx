import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// 导入PLCProvider
import { PLCProvider } from "@/lib/plc-context";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PLC管理系统",
  description: "PLC管理系统，用于PLC设备的监控和控制",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${inter.variable} antialiased`}
      >
        <PLCProvider>
        {children}
        </PLCProvider>
      </body>
    </html>
  );
}
