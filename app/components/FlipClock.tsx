"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./flipclock.module.css";

function FlipDigit({ value }: { value: string }) {
  const [pair, setPair] = useState({ prev: value, next: value });
  const prevRef = useRef(value);

  useEffect(() => {
    if (value === prevRef.current) return;
    const from = prevRef.current;
    prevRef.current = value;
    setPair({ prev: from, next: value });
    const t = window.setTimeout(
      () => setPair({ prev: value, next: value }),
      580,
    );
    return () => window.clearTimeout(t);
  }, [value]);

  const animating = pair.prev !== pair.next;

  return (
    <div className={styles.digit}>
      <div className={`${styles.half} ${styles.upper}`}>
        <span>{pair.next}</span>
      </div>
      <div className={`${styles.half} ${styles.lower}`}>
        <span>{animating ? pair.prev : pair.next}</span>
      </div>
      {animating && (
        <>
          <div className={`${styles.half} ${styles.upper} ${styles.flipTop}`}>
            <span>{pair.prev}</span>
          </div>
          <div
            className={`${styles.half} ${styles.lower} ${styles.flipBottom}`}
          >
            <span>{pair.next}</span>
          </div>
        </>
      )}
    </div>
  );
}

/** 翻頁時鐘數字排。`text` 例如 "05:00" 或 "1:00:00"；`fontSize` 設定整體字級（CSS 值）。 */
export function FlipClock({
  text,
  fontSize,
  className,
}: {
  text: string;
  fontSize: string;
  className?: string;
}) {
  return (
    <div
      className={`${styles.clock}${className ? ` ${className}` : ""}`}
      style={{ "--fs": fontSize } as CSSProperties}
    >
      {text.split("").map((ch, i) =>
        ch === ":" ? (
          <span key={`c${i}`} className={styles.colon}>
            :
          </span>
        ) : (
          <FlipDigit key={`d${i}`} value={ch} />
        ),
      )}
    </div>
  );
}

/** 進度條顏色：剩 10 秒內轉紅、剩 1/4 以內轉琥珀、其餘為綠。 */
export function barColor(fraction: number, secs: number) {
  if (secs <= 10) return "#ef4444";
  if (fraction <= 0.25) return "#f59e0b";
  return "#10b981";
}
