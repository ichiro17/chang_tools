"""
把 jf open 粉圓（jf-openhuninn）切成好幾份 woff2，並產生 app/fonts.css。

第 0 份是網站介面上用到的字＋英數標點（頁面一打開就載入），其餘中文字每 1200 字一份，
瀏覽器靠 unicode-range 只下載畫面上真的用到的那幾份。

原字型的 "huninn"、"open huninn" 是 SIL OFL 的保留字型名稱（Reserved Font Name），
切分後屬於修改版本，所以字型內部名稱與 CSS 都改叫 ChangToolsRound，版權與授權資訊保留。

介面文字改了很多時，重新執行一次即可（需要 fonttools 與 brotli）：
    python3 scripts/build-font.py /path/to/jf-openhuninn-1.1.ttf
"""

import glob
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

SRC = sys.argv[1] if len(sys.argv) > 1 else "jf-openhuninn-1.1.ttf"
OUT = "public/fonts/jf-openhuninn-1.1"
CHUNK = 1200
FAMILY = "ChangToolsRound"

cps = set(TTFont(SRC).getBestCmap())

ui = set()
for p in glob.glob("app/**/*.ts*", recursive=True):
    ui |= {ord(c) for c in open(p, encoding="utf-8").read() if ord(c) > 127}
base = (
    set(range(0x20, 0x7F))  # 英數
    | set(range(0xA0, 0x100))  # Latin-1 標點
    | set(range(0x2000, 0x2070))  # 一般標點（…、—）
    | set(range(0x2190, 0x2200))  # 箭頭
    | set(range(0x3000, 0x3040))  # 中文標點
    | set(range(0xFF00, 0xFFF0))  # 全形符號
)
first = sorted((ui | base) & cps)
rest = sorted(cps - set(first))
slices = [first] + [rest[i : i + CHUNK] for i in range(0, len(rest), CHUNK)]


def ranges(cs):
    out, s, p = [], cs[0], cs[0]
    for c in cs[1:]:
        if c == p + 1:
            p = c
            continue
        out.append((s, p))
        s = p = c
    out.append((s, p))
    return ",".join(f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in out)


os.makedirs(OUT, exist_ok=True)
css = [
    "/*",
    " * 字型：jf open 粉圓 1.1（jf-openhuninn）切分版，依 SIL OFL 1.1 改名為 ChangToolsRound。",
    " * 字型切成好幾份，用 unicode-range 讓瀏覽器只下載畫面上用到的那幾份：",
    " * 第 0 份是介面文字與英數標點，其餘是其他中文字（例如名單裡的少見字）。",
    " * 由 scripts/build-font.py 產生，請勿手動修改。",
    " */",
]
for i, cs in enumerate(slices):
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.hinting = False
    opts.notdef_outline = True
    font = TTFont(SRC)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=cs)
    sub.subset(font)
    # 依 OFL 保留字型名稱規定改名（版權 0、授權 13/14 等其他欄位保留）
    name = font["name"]
    for nid in (16, 17, 21, 22):
        name.removeNames(nameID=nid)
    for nid, value in ((1, FAMILY), (2, "Regular"), (3, f"{FAMILY}-Regular-subset{i}"), (4, f"{FAMILY} Regular"), (6, f"{FAMILY}-Regular")):
        name.setName(value, nid, 3, 1, 0x409)
        name.setName(value, nid, 1, 0, 0)
    path = f"{OUT}/{i}.woff2"
    font.flavor = "woff2"
    font.save(path)
    print(f"{i}: {len(cs)} 字 {os.path.getsize(path) // 1024} KB")
    css.append(
        "@font-face {\n"
        f'  font-family: "{FAMILY}";\n'
        "  font-style: normal;\n"
        "  font-weight: 400;\n"
        "  font-display: swap;\n"
        f'  src: url("/fonts/jf-openhuninn-1.1/{i}.woff2") format("woff2");\n'
        f"  unicode-range: {ranges(cs)};\n"
        "}"
    )
open("app/fonts.css", "w", encoding="utf-8").write("\n".join(css) + "\n")
