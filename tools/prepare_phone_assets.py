"""Crop the source into six screens inside one fixed, original phone frame."""
import ctypes
import hashlib
import json
from pathlib import Path

from PIL import Image
import win32com.client

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
OUT = ASSETS / 'phone'
OUT.mkdir(exist_ok=True)
FRAME = [68, 158, 440, 828]
SCREEN = [94, 182, 388, 778]


def crop(image, box):
    x,y,w,h=box
    return image.crop((x*2,y*2,(x+w)*2,(y+h)*2))


def prepare(source):
    original_hash=hashlib.sha256(source.read_bytes()).hexdigest()
    for scene in [1,2]:
        image=Image.open(ASSETS/f'scene-{scene}.png').convert('RGB')
        if scene==1:crop(image,FRAME).save(OUT/'frame.png',optimize=True)
        for screen in range(3):
            box=[SCREEN[0]+480*screen,*SCREEN[1:]]
            crop(image,box).save(OUT/f'scene-{scene}-screen-{screen+1}.png',optimize=True)

    fonts=list((ASSETS/'fonts').glob('*.ttf'))
    for font in fonts:assert ctypes.windll.gdi32.AddFontResourceExW(str(font),0,None)
    app=win32com.client.DispatchEx('PowerPoint.Application');app.AutomationSecurity=3
    pres=None
    try:
        pres=app.Presentations.Open(str(source.resolve()),ReadOnly=True,WithWindow=False)
        slide=pres.Slides(1);shapes={s.Id:s for s in slide.Shapes}
        selected=shapes[125].Line.ForeColor.RGB
        unchecked=shapes[127].Line.ForeColor.RGB
        selected_text=shapes[124].TextFrame.TextRange.Font.Color.RGB
        for panel,circle,dot,no_circle,no_text in [(123,125,126,127,128),(131,133,134,135,136),(139,141,142,143,144)]:
            shapes[panel].Left+=178*.75
            shapes[circle].Line.ForeColor.RGB=unchecked
            shapes[dot].Left+=173*.75
            shapes[dot].ZOrder(0)  # Keep the selected dot above the original No circle.
            shapes[no_circle].Line.ForeColor.RGB=selected
            shapes[no_text].TextFrame.TextRange.Font.Color.RGB=selected_text
        scratch=str(ROOT/'.work'/'phone-options.png')
        slide.Export(scratch,'PNG',3072,2048)
        image=Image.open(scratch).convert('RGB')
        atlas=Image.new('RGB',(668,70*3),'white')
        for i,y in enumerate([494,607,720]):atlas.paste(crop(image,[601,y,334,35]),(0,i*70))
        atlas.save(OUT/'answer-no-atlas.png',optimize=True)
        for number in range(145,150):shapes[number].Visible=0
        slide.Export(scratch,'PNG',3072,2048)
        crop(Image.open(scratch).convert('RGB'),[588,789,360,90]).save(OUT/'question-pending.png',optimize=True)
    finally:
        if pres:pres.Close()
        app.Quit()
        for font in fonts:ctypes.windll.gdi32.RemoveFontResourceExW(str(font),0,None)
    assert hashlib.sha256(source.read_bytes()).hexdigest()==original_hash
    metadata={'source_sha256':original_hash,'frame_box':FRAME,'screen_box':SCREEN,'screen_spacing':480,
              'phone_coordinate_size':[440,828],'screen_offset_in_phone':[26,24],
              'assets':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.glob('*.png')}}
    (OUT/'source.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'created':list(metadata['assets']),'source_unchanged':True}))


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('source',type=Path)
    prepare(parser.parse_args().source)
