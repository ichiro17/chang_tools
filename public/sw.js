/*
 * 小張的小工具箱：離線用的 service worker。
 *
 * - 網頁（HTML）優先抓網路：有網路時一定拿到最新版，沒網路才用存下來的版本。
 * - 程式與字型（/_next/static/…）每個版本檔名都不同，存下來就一直能用。
 * - 安裝時先把四個工具的頁面和它們需要的檔案都存好，沒打開過的工具也能離線用。
 */

const VERSION = "v1";
const PAGES = `chang-pages-${VERSION}`;
const ASSETS = `chang-assets-${VERSION}`;
const ROUTES = ["/", "/draw", "/timer", "/timer/display", "/classroom", "/countdown"];
const EXTRA = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon.png",
  "/apple-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/fonts/jf-openhuninn-1.1/0.woff2",
];

/** 抓下每個頁面，並把頁面裡用到的程式、樣式、字型一起存起來。 */
async function precache() {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(ASSETS);
  const urls = new Set(EXTRA);
  await Promise.all(
    ROUTES.map(async (route) => {
      try {
        const res = await fetch(route, { cache: "no-cache" });
        if (!res.ok) return;
        await pages.put(route, res.clone());
        const html = await res.text();
        for (const m of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) urls.add(m[0]);
      } catch {
        /* 沒網路就等下次 */
      }
    }),
  );
  await Promise.all(
    [...urls].map(async (url) => {
      if (await assets.match(url)) return;
      try {
        const res = await fetch(url);
        if (res.ok) await assets.put(url, res);
      } catch {
        /* 個別檔案失敗不影響其他 */
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("chang-") && key !== PAGES && key !== ASSETS) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

// 頁面載入後會通知這裡，在背景把存下來的版本更新成最新的
self.addEventListener("message", (event) => {
  if (event.data?.type === "refresh") event.waitUntil(precache());
});

const isAsset = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  url.pathname.startsWith("/fonts/") ||
  EXTRA.includes(url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isAsset(url)) {
    event.respondWith(
      (async () => {
        // 圖示網址後面會帶版本參數（?icon.xxx），比對時忽略
        const hit = await caches.match(req, { ignoreSearch: !url.pathname.startsWith("/_next/") });
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) (await caches.open(ASSETS)).put(req, res.clone());
        return res;
      })(),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok && ROUTES.includes(url.pathname)) (await caches.open(PAGES)).put(url.pathname, res.clone());
          return res;
        } catch {
          const cached = (await caches.match(url.pathname)) ?? (await caches.match("/"));
          return (
            cached ??
            new Response("目前沒有網路，而且這個頁面還沒有存到這台裝置。請連上網路後再打開一次。", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
  }
  // 其他請求（例如頁面切換時的資料）照常走網路；離線時 Next.js 會改用整頁載入，由上面的規則接手
});
