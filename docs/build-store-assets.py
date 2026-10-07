"""Build the Chrome Web Store visual assets.

Store requirements:
  - Screenshots      : 1280x800 (or 640x400), PNG 24-bit, NO alpha, max 5
  - Small promo tile : 440x280, PNG/JPEG 24-bit, NO alpha
  - Marquee promo    : 1400x560, PNG/JPEG 24-bit, NO alpha
  - Store icon       : 128x128

Everything is rendered flat onto an opaque background so there is no alpha
channel, which the store rejects.
"""
import os
import subprocess
import sys

ROOT = r"C:\Users\WIN 11\OneDrive\Desktop\coffee-time"
OUT = os.path.join(ROOT, "store-assets")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

os.makedirs(OUT, exist_ok=True)

FONT_CSS = "@import url('file:///C:/Users/WIN%2011/OneDrive/Desktop/coffee-time/fonts/nunito-local.css');"
CURSOR_B64 = None


def b64(path):
    import base64
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


# ---------- shared chrome / styling ----------
def base_css():
    return f"""
{FONT_CSS}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{
  font-family: 'Nunito', -apple-system, 'Segoe UI', sans-serif;
  background: #0e0e10; color: #f2f2f2;
  -webkit-font-smoothing: antialiased;
}}
"""


# ============================================================
# SCREENSHOT 1 — the effect on a real-looking page (1280x800)
# ============================================================
SHOT1 = """<!DOCTYPE html><html><head><meta charset="utf-8"><style>
{css}
.stage {{ width:1280px; height:800px; position:relative; overflow:hidden; background:#fff; }}

/* fake browser chrome */
.bbar {{ height:44px; background:#202124; display:flex; align-items:center; gap:9px; padding:0 14px; }}
.bdot {{ width:11px; height:11px; border-radius:50%; }}
.btab {{ height:30px; background:#35363a; border-radius:8px 8px 0 0; padding:0 15px;
         display:flex; align-items:center; gap:8px; color:#e8eaed; font-size:12px; font-weight:700;
         margin-left:8px; }}
.btab .ic {{ width:13px; height:13px; border-radius:3px; background:#8a5a3b; }}
.btab.blink {{ background:#5a2222; color:#ffb4ad; }}
.omni {{ flex:1; height:28px; background:#35363a; border-radius:99px; margin-left:12px;
         display:flex; align-items:center; padding:0 13px; color:#9aa0a6; font-size:11.5px; }}

/* fake page */
.page {{ padding:26px 30px; color:#111; }}
.plogo {{ font-size:21px; font-weight:800; color:#d92d20; }}
.pnav {{ display:flex; gap:26px; font-size:13.5px; color:#3c4043; margin:16px 0 24px;
         padding-bottom:12px; border-bottom:1px solid #eee; }}
h1 {{ font-size:30px; letter-spacing:-.02em; margin-bottom:9px; }}
.psub {{ color:#5f6368; font-size:14px; margin-bottom:24px; }}
.pgrid {{ display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }}
.pcard {{ border:1px solid #e4e4e4; border-radius:12px; padding:17px; }}
.pcard h3 {{ font-size:15px; margin-bottom:6px; }}
.pcard p {{ font-size:13px; color:#5f6368; line-height:1.55; }}
.pbar {{ height:150px; margin-top:24px; border-radius:12px;
         background:linear-gradient(90deg,#d92d20,#e8a33d,#38b26b,#3b82f6,#8b5cf6); }}

/* --- the extension overlay, frozen at peak --- */
.ov {{ position:absolute; inset:-5%; pointer-events:none; }}
.ov > div {{ position:absolute; inset:0; }}
.ov .d {{ background:radial-gradient(ellipse at center,
  rgba(0,0,0,.18) 0%, rgba(0,0,0,.44) 48%, rgba(0,0,0,.74) 76%, rgba(0,0,0,.92) 100%); }}
.ov .b1 {{ backdrop-filter:blur(3px) saturate(.75) brightness(.90);
           -webkit-backdrop-filter:blur(3px) saturate(.75) brightness(.90); }}
.ov .b2 {{ backdrop-filter:blur(8px) saturate(.45) brightness(.78);
           -webkit-backdrop-filter:blur(8px) saturate(.45) brightness(.78); }}
.ov .b3 {{ backdrop-filter:blur(16px) saturate(.22) brightness(.62);
           -webkit-backdrop-filter:blur(16px) saturate(.22) brightness(.62); }}
.ov .bl {{ background:rgba(0,0,0,.92); }}

/* the custom cursor, drawn in place */
.cur {{ position:absolute; left:742px; top:430px; width:112px; height:112px;
        filter:drop-shadow(0 6px 18px rgba(0,0,0,.55)); }}

/* caption strip so the store reviewer understands instantly */
.cap {{ position:absolute; left:0; right:0; bottom:0; padding:20px 30px 22px;
        background:linear-gradient(to top, rgba(0,0,0,.93), rgba(0,0,0,0));
        color:#fff; }}
.cap b {{ display:block; font-size:23px; font-weight:800; margin-bottom:5px; letter-spacing:-.01em; }}
.cap span {{ font-size:14px; color:#c9c9c9; }}
</style></head><body>
<div class="stage">

  <div class="bbar">
    <span class="bdot" style="background:#ff5f57"></span>
    <span class="bdot" style="background:#febc2e"></span>
    <span class="bdot" style="background:#28c840"></span>
    <div class="btab blink"><span class="ic"></span>Time to Rest</div>
    <div class="omni">https://example.com</div>
  </div>

  <div class="page">
    <div class="plogo">Streamly</div>
    <div class="pnav"><span>Home</span><span>Trending</span><span>Subscriptions</span><span>Library</span><span>History</span></div>
    <h1>Today's top stories</h1>
    <div class="psub">Recommended for you based on your watch history</div>
    <div class="pgrid">
      <div class="pcard"><h3>Field notes</h3><p>Long sessions in front of a screen add up faster than most people expect.</p></div>
      <div class="pcard"><h3>Short breaks</h3><p>A few minutes away from the display does more than another cup of coffee.</p></div>
      <div class="pcard"><h3>Daily habit</h3><p>Noticing how long you have been sitting there is the hardest part.</p></div>
    </div>
    <div class="pbar"></div>
  </div>

  <div class="ov">
    <div class="d" style="opacity:.85"></div>
    <div class="b1" style="opacity:.85"></div>
    <div class="b2" style="opacity:.55"></div>
    <div class="b3" style="opacity:.30"></div>
    <div class="bl" style="opacity:.18"></div>
  </div>

  <img class="cur" src="file:///C:/Users/WIN%2011/OneDrive/Desktop/coffee-time/cursor/cursor.png" alt="">

  <div class="cap">
    <b>Your cursor becomes a reminder</b>
    <span>Past your limit, every page dims, blurs and blinks the tab title. Nothing to install, nothing to dismiss.</span>
  </div>
</div>
</body></html>"""


# ============================================================
# SCREENSHOT 2 — the popup, three states side by side
# ============================================================
def popup_cell(status, status_cls, big, unit, big_cls, pct, elapsed, sub, sw_cls, row_cls, hint):
    return f"""
    <div class="cell">
      <div class="pop">
        <div class="head">
          <div class="title">Coffee Time</div>
          <div class="status {status_cls}">{status}</div>
          <div class="lw"><span class="ll">LIMIT</span><span class="sel">3 hours</span></div>
        </div>
        <div class="big {big_cls}">{big}<span class="unit">{unit}</span></div>
        <div class="meter"><i style="width:{pct}%"></i></div>
        <div class="meta"><span>{elapsed}</span><span>{pct}%</span></div>
        <div class="swrow {row_cls}">
          <div class="swt"><span class="swtitle">Reminder</span><span class="swsub">{sub}</span></div>
          <div class="switch {sw_cls}"><span class="knob"></span></div>
        </div>
        <div class="rst"><span class="rstbtn">
          <svg viewBox="0 -960 960 960"><path d="M440-122q-121-15-200.5-105.5T160-440q0-66 26-126.5T260-672l57 57q-38 34-57.5 79T240-440q0 88 56 155.5T440-202v80Zm80 0v-80q87-16 143.5-83T720-440q0-100-70-170t-170-70h-3l44 44-56 56-140-140 140-140 56 56-44 44h3q134 0 227 93t93 227q0 121-79.5 211.5T520-122Z"/></svg>
          Reset</span></div>
        <div class="hint">{hint}</div>
      </div>
    </div>"""


SHOT2 = """<!DOCTYPE html><html><head><meta charset="utf-8"><style>
{css}
body {{ padding:0; }}
.stage {{ width:1280px; height:800px; background:#151517;
          display:flex; flex-direction:column; align-items:center; justify-content:center; }}
.titlebar {{ text-align:center; margin-bottom:34px; }}
.titlebar h1 {{ font-size:32px; font-weight:800; letter-spacing:-.02em; }}
.titlebar p {{ font-size:15px; color:#8d8d8d; margin-top:7px; }}

.row {{ display:flex; gap:30px; }}
.cell {{ display:flex; flex-direction:column; gap:11px; }}
.cap {{ font:700 11px 'Nunito'; text-transform:uppercase; letter-spacing:.12em;
        color:#6a6a6a; text-align:center; }}

.pop {{ width:322px; padding:19px 17px 17px; background:#141414; border-radius:14px;
        border:1px solid #2a2a2a; box-shadow:0 22px 60px rgba(0,0,0,.6); }}
.head {{ display:flex; flex-direction:column; align-items:center; text-align:center; margin-bottom:17px; }}
.title {{ font-size:16px; font-weight:700; }}
.status {{ display:flex; align-items:center; gap:6px; margin-top:6px;
           font-size:12px; color:#8d8d8d; }}
.status::before {{ content:""; width:6px; height:6px; border-radius:50%; background:currentColor; }}
.s-on {{ color:#8d8d8d; }} .s-al {{ color:#ff6b6b; font-weight:700; }} .s-off {{ color:#e8a33d; font-weight:700; }}
.lw {{ display:flex; align-items:center; gap:8px; margin-top:13px; }}
.ll {{ font-size:10px; font-weight:700; letter-spacing:.1em; color:#6a6a6a; }}
.sel {{ padding:7px 30px 7px 12px; border-radius:9px; border:1px solid #3a3a3a;
        background:#1c1c1c; font-size:13px; font-weight:700; position:relative; }}
.sel::after {{ content:"⌄"; position:absolute; right:11px; top:6px; color:#8d8d8d; }}
.big {{ text-align:center; font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
        font-weight:700; -webkit-text-stroke:0.7px currentColor; font-size:37px;
        font-variant-numeric:tabular-nums; letter-spacing:-.03em; line-height:1.05; }}
.big .unit {{ display:block; font-family:'Nunito'; font-size:11px; font-weight:700;
              text-transform:uppercase; letter-spacing:.1em; color:#8d8d8d;
              margin-top:6px; -webkit-text-stroke:0; }}
.big-al {{ color:#ff6b6b; }} .big-off {{ color:#e8a33d; }}
.meter {{ height:6px; border-radius:99px; background:#262626; overflow:hidden; margin:15px 0 7px; }}
.meter i {{ display:block; height:100%; background:linear-gradient(90deg,#38b26b,#e8a33d 70%,#d92d20); }}
.meta {{ font-size:11.5px; color:#8d8d8d; display:flex; justify-content:space-between; margin-bottom:17px; }}
.swrow {{ display:flex; align-items:center; justify-content:space-between; gap:12px;
          padding:14px 15px; border-radius:12px; border:1px solid #2a2a2a; background:#1c1c1c; }}
.row-al {{ border-color:rgba(217,45,32,.5); background:rgba(30,14,13,.8); }}
.row-off {{ border-color:rgba(232,163,61,.4); background:rgba(30,24,12,.7); }}
.swt {{ display:flex; flex-direction:column; gap:2px; }}
.swtitle {{ font-size:13px; font-weight:700; }} .swsub {{ font-size:11px; color:#8d8d8d; }}
.switch {{ position:relative; width:52px; height:30px; border-radius:99px; flex:0 0 auto; }}
.knob {{ position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%;
         box-shadow:0 2px 6px rgba(0,0,0,.55); }}
.k-on {{ background:#38b26b; }} .k-on .knob {{ transform:translateX(22px); background:#fff; }}
.k-al {{ background:#d92d20; }} .k-al .knob {{ transform:translateX(22px); background:#fff; }}
.k-off {{ background:#3a3020; border:1px solid #e8a33d; }} .k-off .knob {{ background:#e8a33d; }}
.rst {{ display:flex; justify-content:center; margin-top:11px; }}
.rstbtn {{ display:inline-flex; align-items:center; gap:7px; padding:7px 12px;
           border-radius:9px; color:#8d8d8d; font-size:12px; font-weight:600; }}
.rstbtn svg {{ width:16px; height:16px; fill:currentColor; }}
.hint {{ font-size:11px; color:#6a6a6a; margin:11px auto 0; line-height:1.55;
         text-align:center; max-width:258px; }}
</style></head><body>
<div class="stage">
  <div class="titlebar">
    <h1>Coffee Time</h1>
    <p>Pick a limit, pause anytime, reset with one click</p>
  </div>
  <div class="row">
    {c1}
    {c2}
    {c3}
  </div>
</div>
</body></html>"""


# ============================================================
# PROMO TILES
# ============================================================
def tile(w, h, title_size, sub_size, show_cursor, cursor_px, show_popup):
    cur = (
        f'<img class="cur" src="file:///C:/Users/WIN%2011/OneDrive/Desktop/coffee-time/cursor/cursor.png" '
        f'style="width:{cursor_px}px;height:{cursor_px}px" alt="">'
        if show_cursor else ""
    )
    pop = ""
    if show_popup:
        pop = """
        <div class="mini">
          <div class="mt">Coffee Time</div>
          <div class="ms">Time to rest!</div>
          <div class="mb">3:00:00</div>
          <div class="mm"><i style="width:100%"></i></div>
          <div class="mr"><span>Reminder</span><span class="msw"></span></div>
        </div>"""
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
{css}
.stage {{ width:{w}px; height:{h}px; position:relative; overflow:hidden;
          background:radial-gradient(ellipse at 28% 42%, #241a16 0%, #100e0e 55%, #0a0a0b 100%);
          display:flex; align-items:center; padding:0 {int(w*0.055)}px; }}
.glow {{ position:absolute; width:{int(h*1.1)}px; height:{int(h*1.1)}px; border-radius:50%;
         left:-{int(h*0.22)}px; top:50%; transform:translateY(-50%);
         background:radial-gradient(circle, rgba(217,45,32,.30) 0%, rgba(217,45,32,0) 68%); }}
.txt {{ position:relative; z-index:2; max-width:{int(w*0.62)}px; }}
h1 {{ font-size:{title_size}px; font-weight:800; letter-spacing:-.025em; line-height:1.06; }}
h1 em {{ font-style:normal; color:#ff6b6b; }}
p {{ font-size:{sub_size}px; color:#a8a8a8; margin-top:{max(6,int(h*0.035))}px; line-height:1.45; }}
.cur {{ position:absolute; z-index:3; right:{int(w*0.05)}px; top:50%;
        transform:translateY(-50%) rotate(-8deg);
        filter:drop-shadow(0 10px 26px rgba(0,0,0,.65)); }}
.mini {{ position:absolute; right:{int(w*0.045)}px; top:50%; transform:translateY(-50%);
         z-index:3; width:{int(min(w,h)*0.52)}px; background:#141414; border:1px solid #333;
         border-radius:13px; padding:14px; box-shadow:0 20px 50px rgba(0,0,0,.7); }}
.mt {{ font-size:15px; font-weight:700; text-align:center; }}
.ms {{ font-size:11px; color:#ff6b6b; font-weight:700; text-align:center; margin-top:3px; }}
.mb {{ font-family:ui-monospace,Consolas,monospace; font-weight:700; font-size:29px;
       text-align:center; margin:9px 0 8px; -webkit-text-stroke:.6px currentColor;
       font-variant-numeric:tabular-nums; }}
.mm {{ height:5px; border-radius:99px; background:#262626; overflow:hidden; margin-bottom:10px; }}
.mm i {{ display:block; height:100%; background:linear-gradient(90deg,#38b26b,#e8a33d 70%,#d92d20); }}
.mr {{ display:flex; align-items:center; justify-content:space-between;
       padding:8px 10px; border-radius:9px; border:1px solid rgba(217,45,32,.5);
       background:rgba(30,14,13,.8); font-size:10.5px; font-weight:700; }}
.msw {{ width:30px; height:17px; border-radius:99px; background:#d92d20; position:relative; }}
.msw::after {{ content:""; position:absolute; top:2px; right:2px; width:13px; height:13px;
               border-radius:50%; background:#fff; }}
</style></head><body>
<div class="stage">
  <div class="glow"></div>
  <div class="txt">
    <h1>Time to <em>step away</em></h1>
    <p>A calm reminder that dims the page once your limit is reached</p>
  </div>
  {cur}{pop}
</div>
</body></html>"""


def render(html, png, w, h, label):
    """Write the html, screenshot it, then flatten onto opaque RGB."""
    tmp = os.path.join(OUT, f"_{label}.html")
    open(tmp, "w", encoding="utf-8").write(html)
    subprocess.run([
        CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
        f"--screenshot={png}", f"--window-size={w},{h}",
        "--virtual-time-budget=4000",
        "file:///" + tmp.replace("\\", "/"),
    ], capture_output=True)

    # store requires 24-bit with NO alpha -> flatten
    try:
        from PIL import Image
        im = Image.open(png)
        if im.mode in ("RGBA", "LA", "P"):
            bg = Image.new("RGB", im.size, (14, 14, 16))
            im = im.convert("RGBA")
            bg.paste(im, mask=im.split()[-1])
            im = bg
        else:
            im = im.convert("RGB")
        im.save(png, "PNG")
        return True, im.size
    except Exception as e:
        return False, str(e)


css = base_css()

c1 = popup_cell("Running normally", "s-on", "2:45:10", "remaining", "", 8,
                "Elapsed 14m 50s", "On", "k-on", "", "Cursor and dark overlay turn on after the limit is reached.")
c2 = popup_cell("Time to rest!", "s-al", "3:00:00", "limit reached", "big-al", 100,
                "Elapsed 3h 0m", "On — time to rest", "k-al", "row-al", "I will warn you if you are naughty")
c3 = popup_cell("Reminder is off", "s-off", "OFF", "", "big-off", 8,
                "Ran 14m 50s", "Off", "k-off", "row-off", "The reminder stays off until you turn it back on or restart Chrome.")

jobs = [
    (SHOT1.format(css=css),                          "screenshot-1-overlay.png",  1280, 800),
    (SHOT2.format(css=css, c1=c1, c2=c2, c3=c3),     "screenshot-2-popup.png",    1280, 800),
    (tile(440, 280, 34, 13, True, 92, False),        "promo-small-440x280.png",   440, 280),
    (tile(1400, 560, 60, 18, True, 150, False),      "promo-marquee-1400x560.png", 1400, 560),
]

print(f"{'file':<34}{'ukuran':>14}  status")
print("-" * 66)
fail = 0
for html, name, w, h in jobs:
    out = os.path.join(OUT, name)
    ok, info = render(html, out, w, h, name.replace(".png", ""))
    if ok:
        print(f"{name:<34}{str(info):>14}  OK  ({os.path.getsize(out)/1024:.1f} KB)")
    else:
        print(f"{name:<34}{'':>14}  FAIL: {info}")
        fail += 1

# store icon 128x128
import shutil
shutil.copy(os.path.join(ROOT, "icons", "icon128.png"),
            os.path.join(OUT, "store-icon-128x128.png"))
print(f"{'store-icon-128x128.png':<34}{'(128, 128)':>14}  OK  (copied)")

print()
print("READY" if fail == 0 else f"{fail} FAILED")
