"""Create lossless slide and animation assets from the source PowerPoint.

All modifications are in memory. The input PPTX is opened read-only and never saved.
"""
import argparse
import ctypes
import hashlib
import json
from pathlib import Path

import win32com.client
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
WORK = ROOT / ".work"


def crop_at(image, box):
    x, y, width, height = box
    return image.crop((x * 2, y * 2, (x + width) * 2, (y + height) * 2))


def main(source):
    fonts = list((ASSETS / "fonts").glob("*.ttf"))
    for font in fonts:
        assert ctypes.windll.gdi32.AddFontResourceExW(str(font), 0, None)
    app = win32com.client.DispatchEx("PowerPoint.Application")
    app.AutomationSecurity = 3
    pres = None
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    try:
        pres = app.Presentations.Open(str(source.resolve()), ReadOnly=True, WithWindow=False)
        slides = [pres.Slides(1), pres.Slides(2)]
        originals = []
        for number, slide in enumerate(slides, 1):
            destination = ASSETS / f"scene-{number}.png"
            slide.Export(str(destination), "PNG", 3072, 2048)
            originals.append(Image.open(destination).convert("RGB"))
        originals[0].crop((100, 35, 235, 170)).resize((128, 128), Image.Resampling.LANCZOS).save(ASSETS / "favicon.png")
        scratch = str(WORK / "animation-export.png")
        timer_box = [1186, 482, 124, 52]
        atlas = Image.new("RGB", (248, 104 * 46), "white")
        timer = next(s for s in slides[0].Shapes if s.TextFrame.HasText and s.TextFrame.TextRange.Text == "00:45")
        for frame, seconds in enumerate(range(45, -1, -1)):
            if frame == 0:
                rendered = originals[0]
            else:
                timer.TextFrame.TextRange.Text = f"00:{seconds:02d}"
                slides[0].Export(scratch, "PNG", 3072, 2048)
                rendered = Image.open(scratch).convert("RGB")
            atlas.paste(crop_at(rendered, timer_box), (0, frame * 104))
        atlas.save(ASSETS / "countdown-atlas.png", optimize=True)
        timer.TextFrame.TextRange.Text = "00:45"

        # Use the source shapes' own styles to produce unselected answer states.
        shape_map = {s.Id: s for s in slides[0].Shapes}
        for panel, circle, dot, unchecked in [(123, 125, 126, 127), (131, 133, 134, 135), (139, 141, 142, 143)]:
            shape_map[panel].Fill.ForeColor.RGB = 0xFFFFFF
            shape_map[circle].Line.ForeColor.RGB = shape_map[unchecked].Line.ForeColor.RGB
            shape_map[dot].Visible = 0
        slides[0].Export(scratch, "PNG", 3072, 2048)
        neutral = Image.open(scratch).convert("RGB")
        answer_boxes = [[601, y, 156, 35] for y in [494, 607, 720]]
        answer_atlas = Image.new("RGB", (312, 70 * 3), "white")
        for i, box in enumerate(answer_boxes):
            answer_atlas.paste(crop_at(neutral, box), (0, 70 * i))
        answer_atlas.save(ASSETS / "answer-neutral-atlas.png", optimize=True)

        # Reveal the exact source status rows, one at a time, during playback.
        for shape in slides[1].Shapes:
            if 145 <= shape.Id <= 153:
                shape.Visible = 0
        slides[1].Export(scratch, "PNG", 3072, 2048)
        neutral = Image.open(scratch).convert("RGB")
        status_boxes = [[600, y, 340, 37] for y in [483, 523, 563]]
        status_atlas = Image.new("RGB", (680, 74 * 3), "white")
        for i, box in enumerate(status_boxes):
            status_atlas.paste(crop_at(neutral, box), (0, 74 * i))
        status_atlas.save(ASSETS / "status-neutral-atlas.png", optimize=True)
        metadata = {"source": source.name, "source_sha256": source_hash,
                    "slide_size_emu": [14630400, 9753600], "coordinate_size": [1536, 1024],
                    "image_size": [3072, 2048], "renderer": "Microsoft PowerPoint native PNG export",
                    "fonts": ["Kanit ExtraBold", "Noto Sans Thai Looped", "Noto Sans Thai Looped SemiBold"],
                    "countdown_box": timer_box, "answer_boxes": answer_boxes, "status_boxes": status_boxes,
                    "countdown_seconds": 45, "demo_countdown_duration_ms": 15000,
                    "assets": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in ASSETS.glob("*.png")}}
        (ASSETS / "source.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        assert hashlib.sha256(source.read_bytes()).hexdigest() == source_hash
        print(json.dumps({"assets": list(metadata["assets"]), "source_unchanged": True}))
    finally:
        if pres:
            pres.Close()
        app.Quit()
        for font in fonts:
            ctypes.windll.gdi32.RemoveFontResourceExW(str(font), 0, None)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    main(parser.parse_args().source)
