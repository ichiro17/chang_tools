import type { MetadataRoute } from "next";

/** 讓網站可以「加入主畫面」，像 App 一樣打開。 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "小張的小工具箱",
    short_name: "小工具箱",
    description: "老師上課馬上用的 4 個小工具：抽籤、計時、投影指令、放假倒數。免登入，打開就能使用。",
    lang: "zh-Hant",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f3ed",
    theme_color: "#f6f3ed",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // 長按主畫面圖示可以直接跳到某個工具
    shortcuts: [
      { name: "抽籤轉盤", url: "/draw" },
      { name: "課堂時鐘", url: "/timer" },
      { name: "課堂模式", url: "/classroom" },
      { name: "放假倒數", url: "/countdown" },
    ],
  };
}
