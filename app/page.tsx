import Link from "next/link";
import { Icon, type IconName } from "@/app/components/Icon";
import { Logo, TOOLS, btn, type ToolKey } from "@/app/components/ToolHeader";

/** 首頁四個大入口：用「我要做什麼」來找工具。 */
const TASKS: { tool: ToolKey; href: string; task: string; hint: string; short: string }[] = [
  { tool: "draw", href: "/draw", task: "我要抽籤", hint: "點名、分組、抽獎都能用", short: "點名、分組、抽獎" },
  { tool: "timer", href: "/timer", task: "我要計時", hint: "投影現在時間、節次與考程", short: "課堂流程、考試考程" },
  { tool: "classroom", href: "/classroom", task: "我要開始課堂模式", hint: "安靜作業、小組討論，一鍵投影指令", short: "投影課堂指令與倒數" },
  { tool: "countdown", href: "/countdown", task: "我要看放假倒數", hint: "離寒暑假還有幾天、還要上幾天班", short: "寒暑假倒數與工作量" },
];

const FEATURES: { icon: IconName; title: string; desc: string }[] = [
  { icon: "noLogin", title: "不用登入", desc: "打開網址就能用，不必註冊帳號。" },
  { icon: "lock", title: "不會上傳學生名單", desc: "名單只在你的瀏覽器裡處理。" },
  { icon: "drive", title: "設定保存在這台裝置", desc: "下次打開，課表和名單都還在。" },
  { icon: "maximize", title: "支援全螢幕投影", desc: "控制台和投影畫面分開，學生只看到重點。" },
  { icon: "devices", title: "手機、平板、電腦都能用", desc: "在手機上設定，投影用電腦。" },
];

/** 工具介紹：加上「適合什麼時候用」。 */
const DETAILS: { tool: ToolKey; href: string; scene: string; desc: string; features: string[]; cta: string }[] = [
  {
    tool: "draw",
    href: "/draw",
    scene: "點名、分組、抽獎都能用",
    desc: "適合課堂點名、分組活動與課堂小獎勵。抽中的名字會用大字顯示，全班都看得清楚。",
    features: ["貼上名單就好，自動去除空白、提醒重複", "每人機率相同，同一輪不會重複抽到", "依順序記錄抽中名單，可隨時放回"],
    cta: "開始抽籤",
  },
  {
    tool: "timer",
    href: "/timer",
    scene: "適合投影到教室前方",
    desc: "學生可以直接看到目前進度與剩餘時間。老師在控制台編課表，投影畫面只顯示重點。",
    features: ["課堂流程與考試考程兩種模式", "時間重疊、填反會立刻提醒", "內建國小、國中課表與段考範例"],
    cta: "開始計時",
  },
  {
    tool: "classroom",
    href: "/classroom",
    scene: "一個按鍵切換課堂指令",
    desc: "安靜作業、小組討論、看老師⋯⋯投影幕直接顯示現在要做什麼，搭配倒數與環境音。",
    features: ["五種模式，數字鍵 1–5 切換", "內建倒數與時間到鈴聲", "白噪音、背景音樂即時合成"],
    cta: "開始課堂模式",
  },
  {
    tool: "countdown",
    href: "/countdown",
    scene: "看得到倒數，也看得到走了多遠",
    desc: "寒暑假倒數到秒，扣掉週末與國定假日，算出真正還要上幾天班、幾小時。",
    features: ["內建 115 學年度行事曆（可自行修改）", "加入校慶補休等自訂假日", "顯示下一個平日放假"],
    cta: "看放假倒數",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-[72px] sm:px-6">
          <Logo />
          <nav aria-label="工具" className="hidden gap-1 md:flex">
            {TASKS.map((t) => (
              <Link
                key={t.tool}
                href={t.href}
                className="rounded-xl px-3.5 py-3 text-[15px] font-bold text-muted hover:bg-paper hover:text-ink"
              >
                {TOOLS[t.tool].name}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* 第一屏：標題＋四個任務入口 */}
        <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-14 pt-8 sm:gap-10 sm:px-6 sm:pt-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-2xl flex-col gap-3">
              <h1 className="text-[30px] font-black leading-tight sm:text-5xl">
                老師上課馬上用的 4 個小工具
              </h1>
              <p className="text-base leading-7 text-muted sm:text-lg">
                抽籤、計時、投影指令、放假倒數，免登入，打開就能使用。
              </p>
            </div>
            <div className="hidden shrink-0 gap-3 sm:flex">
              <a href="#tools" className={`${btn.base} ${btn.secondary} min-h-[52px] px-5 text-base`}>
                選擇工具
              </a>
              <Link href="/timer" className={`${btn.base} min-h-[52px] bg-timer px-5 text-base text-white hover:brightness-110`}>
                <Icon name="clock" className="h-5 w-5" strokeWidth={2.2} />
                最常用：開始課堂時鐘
              </Link>
            </div>
          </div>

          <nav aria-label="選擇工具" className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {TASKS.map((t) => {
              const c = TOOLS[t.tool];
              return (
                <Link
                  key={t.tool}
                  href={t.href}
                  className="group flex items-center gap-4 rounded-[20px] border-[1.5px] border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg sm:min-h-[232px] sm:flex-col sm:items-start sm:rounded-3xl sm:p-7"
                >
                  <span className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl sm:h-[60px] sm:w-[60px] ${c.tint} ${c.text}`}>
                    <Icon name={c.icon} className="h-7 w-7 sm:h-8 sm:w-8" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-2">
                    <span className="text-[19px] font-black sm:text-[26px] sm:leading-tight">{t.task}</span>
                    <span className="text-sm text-muted sm:hidden">{t.short}</span>
                    <span className="hidden text-[15px] leading-6 text-muted sm:block">{t.hint}</span>
                  </span>
                  <Icon name="chevronRight" className={`h-[22px] w-[22px] shrink-0 sm:hidden ${c.text}`} strokeWidth={2.4} />
                  <span className={`hidden text-[15px] font-bold sm:block ${c.text}`}>
                    開始使用 <span className="inline-block transition group-hover:translate-x-0.5">→</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </section>

        {/* 特色：建立信任 */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <section className="flex flex-col gap-5 rounded-[20px] bg-ink px-5 py-6 text-white sm:rounded-3xl sm:px-10 sm:py-9">
            <h2 className="text-lg font-black sm:text-[22px]">這個網站的特色</h2>
            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-5">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2.5">
                  <Icon name={f.icon} className="h-[22px] w-[22px] shrink-0 text-[#f3d9a8] sm:h-7 sm:w-7" />
                  <span className="text-[15px] font-bold sm:text-[17px]">{f.title}</span>
                  <span className="hidden text-sm leading-6 text-[#d6d0c5] sm:block">{f.desc}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* 工具介紹 */}
        <section id="tools" className="mx-auto flex max-w-6xl scroll-mt-24 flex-col gap-7 px-4 py-14 sm:px-6 sm:py-18">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-black sm:text-[32px]">每個工具適合什麼時候用</h2>
            <p className="text-base text-muted">挑一個符合你現在情境的工具就好。</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 md:gap-6">
            {DETAILS.map((d) => {
              const c = TOOLS[d.tool];
              return (
                <article
                  key={d.tool}
                  id={d.tool}
                  className="flex scroll-mt-24 flex-col gap-4 rounded-3xl border-[1.5px] border-line bg-white p-6 sm:p-8"
                >
                  <div className="flex items-center gap-3.5">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-[14px] ${c.tint} ${c.text}`}>
                      <Icon name={c.icon} className="h-[26px] w-[26px]" />
                    </span>
                    <h3 className="text-2xl font-black">{c.name}</h3>
                  </div>
                  <p className={`text-lg font-bold ${c.text}`}>{d.scene}</p>
                  <p className="text-[15px] leading-7 text-muted">{d.desc}</p>
                  <ul className="flex flex-col gap-2 text-[15px]">
                    {d.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5">
                        <Icon name="check" className={`h-[18px] w-[18px] shrink-0 ${c.text}`} strokeWidth={2.6} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={d.href} className={`${btn.base} mt-1 self-start px-5 text-base text-white hover:brightness-110 ${c.bg}`}>
                    {d.cta}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-8">
          <span className="flex items-center gap-2">
            <Icon name="lock" className="h-[18px] w-[18px] shrink-0" />
            所有設定只會儲存在這台裝置的瀏覽器，不會上傳到雲端。
          </span>
          <span>© {new Date().getFullYear()} 小張的小工具箱</span>
        </div>
      </footer>
    </div>
  );
}
