"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Icon } from "./Icon";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * 離線支援：註冊 service worker（只在正式版），
 * 有網路時請它在背景更新存下來的頁面；沒網路時在角落提示。
 */
export function OfflineSupport() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async () => {
        const reg = await navigator.serviceWorker.ready;
        if (navigator.onLine) reg.active?.postMessage({ type: "refresh" });
      })
      .catch(() => {
        /* 不支援或被瀏覽器擋住時，網站照常可以用，只是不能離線 */
      });
  }, []);

  if (online) return null;
  return (
    <div
      role="status"
      className="fixed bottom-3 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white shadow-lg"
    >
      <Icon name="info" className="h-4 w-4 shrink-0" strokeWidth={2.4} />
      目前離線，使用已儲存的版本
    </div>
  );
}
