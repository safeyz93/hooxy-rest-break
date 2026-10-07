# Simulate what Chrome does when it loads the packed extension:
# check every file the manifest references actually ships inside the zip,
# and sanity-check the JS/HTML for things that break at load time.
import json
import os
import re
import zipfile

ZIP = r"C:\Users\WIN 11\OneDrive\Desktop\coffee-time-v3.3.1.zip"

z = zipfile.ZipFile(ZIP)
names = set(z.namelist())

problems, passed = [], []

def chk(label, cond, detail=""):
    (passed if cond else problems).append(f"{label} {detail}".strip())

# ---- 1. manifest ada di root ----
chk("manifest.json di root zip", "manifest.json" in names)
chk("tidak ada wrapper folder", not any("/" in n and n.split("/")[0] in ("coffee-time", "coffee-time-v3.3.1") for n in names))

manifest = json.loads(z.read("manifest.json").decode("utf-8"))

# ---- 2. semua rujukan file ada di zip ----
refs = []
refs += manifest.get("content_scripts", [{}])[0].get("js", [])
refs.append(manifest.get("background", {}).get("service_worker", ""))
refs.append(manifest.get("action", {}).get("default_popup", ""))
refs += list(manifest.get("icons", {}).values())
refs += list(manifest.get("action", {}).get("default_icon", {}).values())
for grp in manifest.get("web_accessible_resources", []):
    refs += grp.get("resources", [])
refs = [r for r in refs if r]

missing = [r for r in refs if r not in names]
chk(f"semua {len(refs)} file rujukan ada di zip", not missing, f"\n     HILANG: {missing}")

# ---- 3. popup.html merujuk aset yang ada ----
popup = z.read("popup.html").decode("utf-8")
popup_refs = re.findall(r'@import\s+url\(["\']?([^"\')]+)["\']?\)', popup)
for r in popup_refs:
    chk(f"popup @import '{r}' ada di zip", r in names, "<-- popup bakal tanpa font")

# script yang dimuat popup
for m in re.finditer(r'<script\s+src=["\']([^"\']+)["\']', popup):
    chk(f"popup script '{m.group(1)}' ada", m.group(1) in names)

# ---- 4. font css merujuk file font yang ada ----
css = z.read("fonts/nunito-local.css").decode("utf-8")
for m in re.finditer(r"url\(['\"]?([^'\")]+)['\"]?\)", css):
    ref = "fonts/" + m.group(1).lstrip("./")
    chk(f"font file '{ref}' ada", ref in names, "<-- font bakal gagal load")

# ---- 5. content.js merujuk cursor yang ada ----
content = z.read("content.js").decode("utf-8")
for m in re.finditer(r'getURL\(["\']([^"\']+)["\']\)', content):
    chk(f"cursor '{m.group(1)}' ada", m.group(1) in names, "<-- kursor bakal rusak")

# ---- 6. cek pola yang bikin extension gagal dimuat ----
chk("tidak ada eval()", "eval(" not in content and "eval(" not in z.read("background.js").decode("utf-8"))
chk("tidak ada URL remote (CSP)", not re.search(r"https?://(?!www\.w3\.org)[\w.-]+\.(com|org|net|io)", popup))
chk("manifest_version 3", manifest.get("manifest_version") == 3)
chk("description <= 132", len(manifest["description"]) <= 132, f"({len(manifest['description'])})")
chk("name <= 45", len(manifest["name"]) <= 45, f"({len(manifest['name'])})")

# ---- 7. semua JS valid secara sintaks (cek kasar: kurung seimbang) ----
for js in ("background.js", "content.js", "popup.js"):
    src = z.read(js).decode("utf-8")
    bal = src.count("{") - src.count("}")
    par = src.count("(") - src.count(")")
    chk(f"{js} kurung seimbang", bal == 0 and par == 0, f"{{}}={bal} ()={par}")

print("LULUS:")
for p in passed:
    print("  OK   " + p)

if problems:
    print("\nMASALAH:")
    for p in problems:
        print("  FAIL " + p)
    raise SystemExit(1)

print(f"\n{len(passed)} cek lolos — extension bakal dimuat tanpa error")
print(f"zip: {os.path.basename(ZIP)}  ({os.path.getsize(ZIP)/1024:.1f} KB)")
