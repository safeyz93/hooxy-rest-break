# Preflight Chrome Web Store: cek SEMUA batas field manifest sekaligus,
# biar nggak upload berulang kali gara-gara error satu-satu.
import json, os, re

ROOT = r"C:\Users\WIN 11\OneDrive\Desktop\coffee-time"
manifest = json.load(open(os.path.join(ROOT, "manifest.json"), encoding="utf-8"))

# Batas resmi Chrome Web Store
LIMITS = {
    "name":                (45,  "nama extension"),
    "description":         (132, "deskripsi singkat"),
    "version":             (None, "format x.y.z atau x.y.z.w"),
    "short_name":          (12,  "nama pendek"),
}

problems, passed = [], []

def chk(label, cond, detail=""):
    (passed if cond else problems).append(f"{label} {detail}".strip())

# ---- name ----
name = manifest.get("name", "")
mx, desc = LIMITS["name"]
chk(f"name ({len(name)}/{mx})", 0 < len(name) <= mx, f"'{name}'")

# ---- description ----
descr = manifest.get("description", "")
mx, _ = LIMITS["description"]
chk(f"description ({len(descr)}/{mx})", 0 < len(descr) <= mx, f"'{descr}'")

# ---- version ----
ver = manifest.get("version", "")
chk("version format", bool(re.fullmatch(r"\d+(\.\d+){1,3}", ver)), f"'{ver}'")
chk("version bukan 0.0", ver.strip("0.") != "", f"'{ver}'")

# ---- manifest_version ----
chk("manifest_version == 3", manifest.get("manifest_version") == 3)

# ---- file yang dirujuk beneran ada ----
refs = []
refs += manifest.get("content_scripts", [{}])[0].get("js", [])
refs += [manifest.get("background", {}).get("service_worker", "")]
refs += [manifest.get("action", {}).get("default_popup", "")]
refs += list(manifest.get("icons", {}).values())
refs += list(manifest.get("action", {}).get("default_icon", {}).values())
for grp in manifest.get("web_accessible_resources", []):
    refs += grp.get("resources", [])
refs = [r for r in refs if r]
missing = [r for r in refs if not os.path.isfile(os.path.join(ROOT, r))]
chk(f"semua {len(refs)} file yang dirujuk ada", not missing, f"hilang: {missing}")

# ---- permission yang sah ----
KNOWN = {"storage","tabs","alarms","scripting","activeTab","notifications","alarms",
         "contextMenus","idle","cookies","webNavigation","declarativeContent"}
perms = manifest.get("permissions", [])
unknown = [p for p in perms if p not in KNOWN]
chk(f"permission dikenal ({', '.join(perms)})", not unknown, f"aneh: {unknown}")

# ---- host_permissions ----
hp = manifest.get("host_permissions", [])
chk("host_permissions ada", bool(hp), f"{hp}")

# ---- version cocok sama nama zip ----
zip_file = os.path.join(os.path.dirname(ROOT), f"coffee-time-v{ver}.zip")
chk(f"zip v{ver} sudah dibuild", os.path.isfile(zip_file),
    f"cari: {os.path.basename(zip_file)}")

print("LULUS:")
for p in passed:
    print("  OK   " + p)
if problems:
    print("\nPERLU DIPERBAIKI:")
    for p in problems:
        print("  FAIL " + p)
    raise SystemExit(1)
print(f"\n{len(passed)} cek lolos — siap upload ke Chrome Web Store")
if os.path.isfile(zip_file):
    sz = os.path.getsize(zip_file)
    print(f"zip: {os.path.basename(zip_file)}  ({sz/1024:.1f} KB)")
