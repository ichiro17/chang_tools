import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { OfflineSupport } from "./components/OfflineSupport";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "小張的小工具箱",
  description: "老師上課馬上用的 4 個小工具：抽籤、計時、投影指令、放假倒數。免登入，打開就能使用。",
  applicationName: "小工具箱",
  appleWebApp: { capable: true, title: "小工具箱", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f6f3ed",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <OfflineSupport />
      </body>
    </html>
  );
}
