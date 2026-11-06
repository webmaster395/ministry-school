#!/usr/bin/env python3
"""Extract embedded MAPP result images into cacheable static assets."""

from __future__ import annotations

import base64
import hashlib
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "public/apps/profil-mapp/preview/profil-mapp-complet.html"
OUTPUT_DIR = ROOT / "public/apps/profil-mapp/preview/embedded"
DATA_IMAGE = re.compile(r"data:image/(?P<kind>png|jpeg|webp);base64,(?P<data>[A-Za-z0-9+/=]+)")
STATIC_PNG = re.compile(r"/apps/profil-mapp/preview/embedded/(?P<name>result-[a-f0-9]+)\.png")
EMBEDDED_IMG = re.compile(r'<img(?![^>]*\bloading=)(?P<attrs>[^>]*src="/apps/profil-mapp/preview/embedded/[^"]+"[^>]*)>')


def replace(match: re.Match[str]) -> str:
    payload = base64.b64decode(match.group("data"))
    extension = "jpg" if match.group("kind") == "jpeg" else match.group("kind")
    digest = hashlib.sha256(payload).hexdigest()[:16]
    filename = f"result-{digest}.{extension}"
    (OUTPUT_DIR / filename).write_bytes(payload)
    return f"/apps/profil-mapp/preview/embedded/{filename}"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    source = HTML_PATH.read_text(encoding="utf-8")
    optimized, count = DATA_IMAGE.subn(replace, source)
    if count not in (0, 5):
        raise SystemExit(f"Expected 0 or 5 embedded images, found {count}")

    def convert(match: re.Match[str]) -> str:
        name = match.group("name")
        source_path = OUTPUT_DIR / f"{name}.png"
        output_path = OUTPUT_DIR / f"{name}.webp"
        if not output_path.exists():
            subprocess.run(
                ["cwebp", "-quiet", "-q", "88", str(source_path), "-o", str(output_path)],
                check=True,
            )
        source_path.unlink(missing_ok=True)
        return f"/apps/profil-mapp/preview/embedded/{name}.webp"

    optimized, converted = STATIC_PNG.subn(convert, optimized)
    optimized = EMBEDDED_IMG.sub(r'<img loading="lazy" decoding="async"\g<attrs>>', optimized)
    HTML_PATH.write_text(optimized, encoding="utf-8")
    print(
        f"Extracted {count} images, converted {converted} references; "
        f"HTML: {len(source)} -> {len(optimized)} bytes"
    )


if __name__ == "__main__":
    main()
