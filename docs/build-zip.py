# Build the Chrome Web Store upload package.
#
# Files must sit at the ROOT of the zip, not inside a folder, or the store
# rejects the upload with "manifest.json not found".
#
# Excluded from the package: docs/, test_logic.js, README.md, LICENSE,
# fonts/build_fonts.py, .gitignore — none of them are needed at runtime
# (excluding them also keeps the review smaller and faster).
import os
import zipfile

ROOT = r"C:\Users\WIN 11\OneDrive\Desktop\coffee-time"
OUT = r"C:\Users\WIN 11\OneDrive\Desktop\coffee-time-v3.3.1.zip"

# Everything the extension actually needs at runtime.
INCLUDE = [
    "manifest.json",
    "background.js",
    "content.js",
    "popup.html",
    "popup.js",
    "cursor/cursor.png",
    "cursor/cursor32.png",
    "icons/icon16.png",
    "icons/icon48.png",
    "icons/icon128.png",
    "fonts/nunito-local.css",
    "fonts/nunito-latin-var.woff2",
]

missing = [f for f in INCLUDE if not os.path.isfile(os.path.join(ROOT, f))]
if missing:
    raise SystemExit("MISSING FILES:\n  " + "\n  ".join(missing))

if os.path.exists(OUT):
    os.remove(OUT)

with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for rel in INCLUDE:
        src = os.path.join(ROOT, rel)
        # forward slashes are required inside a zip
        z.write(src, rel.replace("\\", "/"))

size = os.path.getsize(OUT)
print(f"created: {OUT}")
print(f"size   : {size:,} bytes ({size/1024:.1f} KB)")
print(f"entries: {len(INCLUDE)}")
print()

# verify: manifest.json must be at the root
with zipfile.ZipFile(OUT) as z:
    names = z.namelist()
    bad = z.testzip()
    print("zip integrity:", "OK" if bad is None else f"CORRUPT at {bad}")
    print()
    print("contents:")
    for n in sorted(names):
        info = z.getinfo(n)
        print(f"  {info.file_size:>8,}  {n}")
    print()
    root_manifest = "manifest.json" in names
    no_wrapper = not any(n.startswith("coffee-time/") for n in names)
    print("manifest.json at root :", "YES" if root_manifest else "NO  <-- store will reject")
    print("no wrapper folder     :", "YES" if no_wrapper else "NO  <-- store will reject")
    if not (root_manifest and no_wrapper and bad is None):
        raise SystemExit(1)
    print()
    print("READY TO UPLOAD")
