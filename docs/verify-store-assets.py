# Verify the store assets against Chrome Web Store requirements.
import os
from PIL import Image

OUT = r"C:\Users\WIN 11\OneDrive\Desktop\coffee-time\store-assets"

# filename -> (expected size, requirement label)
SPEC = {
    "screenshot-1-overlay.png":     ((1280, 800),  "screenshot"),
    "screenshot-2-popup.png":       ((1280, 800),  "screenshot"),
    "promo-small-440x280.png":      ((440, 280),   "small promo tile"),
    "promo-marquee-1400x560.png":   ((1400, 560),  "marquee promo"),
    "store-icon-128x128.png":       ((128, 128),   "store icon"),
}

ok, bad = [], []

for name, (want, label) in SPEC.items():
    path = os.path.join(OUT, name)
    if not os.path.isfile(path):
        bad.append(f"{name} — MISSING")
        continue

    im = Image.open(path)
    size_kb = os.path.getsize(path) / 1024
    problems = []

    if im.size != want:
        problems.append(f"size {im.size} != {want}")

    # PNG must be 24-bit with no alpha
    if im.mode == "RGBA":
        alpha = im.getchannel("A").getextrema()
        problems.append(f"has alpha channel {alpha} (store requires no alpha)")

    # JPEG is fine too, but ours are PNG so must be RGB or P
    if im.format == "PNG" and im.mode not in ("RGB", "P"):
        problems.append(f"mode {im.mode} not 24-bit RGB")

    if problems:
        bad.append(f"{name} [{label}] — " + "; ".join(problems))
    else:
        ok.append(f"{name:<30} {str(im.size):>12}  {im.mode:<4}  {size_kb:>7.1f} KB  ({label})")

print("SIAP UPLOAD:")
for o in ok:
    print("  OK   " + o)

if bad:
    print("\nMASALAH:")
    for b in bad:
        print("  FAIL " + b)
    raise SystemExit(1)

print(f"\n{len(ok)} aset lolos semua syarat Chrome Web Store")
