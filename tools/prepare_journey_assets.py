"""Derive empty page chrome and component crops from existing source images.

No AI generation, font substitution, or modification of the source PPTX.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
PHONE=ROOT/'assets'/'phone'
OUT=ROOT/'assets'/'journey'
OUT.mkdir(exist_ok=True)

shell=Image.open(PHONE/'scene-1-screen-3.png').convert('RGB')
draw=ImageDraw.Draw(shell)
draw.rectangle((100,84,724,167),fill=shell.getpixel((100,90)))
draw.rectangle((0,172,775,1523),fill='white')
shell.save(OUT/'page-shell.png',optimize=True)

# The bank logo and profile icon are crops of the native source, not replacements.
confirm=Image.open(PHONE/'scene-1-screen-1.png').convert('RGB')
confirm.crop((42,442,174,574)).save(OUT/'recipient.png',optimize=True)
home=Image.open(PHONE/'scene-2-screen-1.png').convert('RGB')
home.crop((60,1080,148,1190)).save(OUT/'help-shield.png',optimize=True)
print('Created source-derived page shell, recipient icon and help shield.')
