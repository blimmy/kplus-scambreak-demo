"""Fetch the exact named open fonts used by the source PPTX, with their licenses."""
from pathlib import Path
from urllib.request import urlopen
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "assets" / "fonts"
SOURCES = {
    "NotoSansThaiLooped-Regular.ttf": "https://raw.githubusercontent.com/notofonts/thai/gh-pages/fonts/NotoSansThaiLooped/full/ttf/NotoSansThaiLooped-Regular.ttf",
    "NotoSansThaiLooped-SemiBold.ttf": "https://raw.githubusercontent.com/notofonts/thai/gh-pages/fonts/NotoSansThaiLooped/full/ttf/NotoSansThaiLooped-SemiBold.ttf",
    "Kanit-ExtraBold.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/kanit/Kanit-ExtraBold.ttf",
    "OFL-NotoSansThaiLooped.txt": "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansthailooped/OFL.txt",
    "OFL-Kanit.txt": "https://raw.githubusercontent.com/google/fonts/main/ofl/kanit/OFL.txt",
}


def download(item):
    name, url = item
    with urlopen(url, timeout=40) as response:
        payload = response.read()
    (FONT_DIR / name).write_bytes(payload)
    return f"{name}: {len(payload)} bytes"


if __name__ == "__main__":
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=5) as pool:
        for result in pool.map(download, SOURCES.items()):
            print(result)
