import Link from "next/link";

type Tool = {
  emoji: string;
  title: string;
  subtitle: string;
  href: string;
  anchor: string;
  desc: string;
  features: string[];
  color: string;
  tint: string;
};

const TOOLS: Tool[] = [
  {
    emoji: "🎡",
    title: "抽籤轉盤",
    subtitle: "點名 · 分組 · 抽獎",
    href: "/draw",
    anchor: "draw",
    desc: "貼上一份名單，轉盤就會隨機抽人。想一次抽幾位都行，抽中的人自動從轉盤移除，不會重複抽到同一個。",
    features: [
      "支援換行、逗號、頓號分隔名單",
      "一次抽 1 位或多位",
      "抽中自動移除，可再放回",
      "中獎名單依輪次記錄",
    ],
    color: "#e11d48",
    tint: "rgba(225,29,72,0.12)",
  },
  {
    emoji: "🕐",
    title: "課堂時鐘 / 考程",
    subtitle: "現在時間 · 課表 · 考試",
    href: "/timer",
    anchor: "timer",
    desc: "投影幕上顯示現在時間，並依你排好的課堂流程或考程，自動秀出「現在進行的項目」和剩餘時間。考完的科目會自動消失。",
    features: [
      "翻頁時鐘 + 進度條",
      "自訂課堂流程與考程時刻",
      "進行中項目自動切換",
      "資料存在本機，全螢幕投影",
    ],
    color: "#4f46e5",
    tint: "rgba(79,70,229,0.12)",
  },
  {
    emoji: "🏫",
    title: "課堂模式",
    subtitle: "投影指令 · 倒數 · 環境音",
    href: "/classroom",
    anchor: "classroom",
    desc: "按一個按鈕，投影幕就切成清楚的課堂指令：安靜作業、小組討論、看老師⋯⋯搭配倒數、背景音樂、白噪音與提示音。",
    features: [
      "五種課堂模式一鍵切換",
      "內建倒數與時間到響鈴",
      "背景音樂 / 白噪音即時合成",
      "全螢幕投影 + 鍵盤快捷鍵",
    ],
    color: "#059669",
    tint: "rgba(5,150,105,0.12)",
  },
];

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <a
            href="#top"
            className="flex items-center gap-2 font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            <span className="text-xl">🧰</span>
            小張的小工具箱
          </a>
          <nav className="hidden gap-1 sm:flex">
            {TOOLS.map((t) => (
              <a
                key={t.anchor}
                href={`#${t.anchor}`}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                {t.title}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {/* Hero */}
        <section
          id="top"
          className="relative overflow-hidden border-b border-zinc-200/70 dark:border-zinc-800/70"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 text-zinc-400/40 dark:text-zinc-600/30"
            style={{
              backgroundImage:
                "radial-gradient(currentColor 1px, transparent 1px)",
              backgroundSize: "22px 22px",
              maskImage:
                "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
              WebkitMaskImage:
                "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-80 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-400/25 via-fuchsia-400/20 to-emerald-400/25 blur-3xl"
          />

          <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:py-28">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white/70 px-3 py-1 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">
              👋 給老師的課堂小工具
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
              小張的
              <span className="bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-500 bg-clip-text text-transparent">
                小工具箱
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              三個上課會用到的小工具，打開就能用 —— 免登入、免安裝。
              點名抽籤、課堂時鐘、投影指令，一個網站搞定。
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <a
                href="#tools"
                className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                看看有哪些工具 ↓
              </a>
              <Link
                href="/timer"
                className="rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-bold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                直接開課堂時鐘
              </Link>
            </div>
          </div>
        </section>

        {/* Tools */}
        <section id="tools" className="mx-auto max-w-5xl scroll-mt-20 px-5 py-16 sm:py-20">
          <div className="text-center">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              工具
            </h2>
            <p className="mt-2 text-2xl font-bold sm:text-3xl">
              三個工具，涵蓋一堂課的大小事
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TOOLS.map((t) => (
              <article
                key={t.anchor}
                id={t.anchor}
                className="group relative flex scroll-mt-20 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: t.color }}
                />
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
                  style={{ background: t.tint }}
                >
                  {t.emoji}
                </div>
                <h3 className="mt-5 text-lg font-bold">{t.title}</h3>
                <p
                  className="mt-1 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: t.color }}
                >
                  {t.subtitle}
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {t.desc}
                </p>
                <ul className="mt-4 flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className="mt-0.5 font-bold"
                        style={{ color: t.color }}
                      >
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={t.href}
                  className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98]"
                  style={{ background: t.color }}
                >
                  打開{t.title}
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-5 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-50">
            <span className="text-lg">🧰</span> 小張的小工具箱
          </div>
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
            {TOOLS.map((t) => (
              <Link
                key={t.anchor}
                href={t.href}
                className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {t.title}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} 小張 · 用 Next.js 打造
          </p>
        </div>
      </footer>
    </>
  );
}
