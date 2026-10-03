import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { OfflineSupport } from "./components/OfflineSupport";
import "./fonts.css";
import "./globals.css";

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
  // 介面文字那一份字型先下載，其餘的等用到再載
  preload("/fonts/jf-openhuninn-1.1/0.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html
      lang="zh-Hant"
      className="h-full scroll-smooth antialiased"
    >
      <body className="min-h-full flex flex-col">
        {children}
        <OfflineSupport />
      </body>
    </html>
  );
}
