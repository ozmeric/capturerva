#!/usr/bin/env bash
# Downloads the event photos and logo from the current WordPress site into assets/img/
# Run ONCE from the repo root before switching DNS away from WordPress:
#   bash _build/fetch_images.sh
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - <<'PY'
import json, os, subprocess, urllib.parse
items = json.load(open("_build/images.json"))
for it in items:
    dest = it["local"]
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        print("skip", dest); continue
    url = urllib.parse.quote(it["url"], safe=":/")
    tmp = dest + ".download"
    subprocess.run(["curl", "-fsSL", url, "-o", tmp], check=True)
    # convert PNG/large originals to a web-sized JPEG when Pillow is available
    try:
        from PIL import Image
        im = Image.open(tmp)
        if dest.endswith(".png"):
            im.save(dest, optimize=True)
        else:
            im = im.convert("RGB")
            im.thumbnail((1400, 1400))
            im.save(dest, "JPEG", quality=82, optimize=True, progressive=True)
        os.remove(tmp)
    except Exception:
        os.replace(tmp, dest)
    print("ok  ", dest)
PY
echo "Done. Commit assets/img/ to the repo."
