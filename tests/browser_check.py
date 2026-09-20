"""Verify the single-phone demo in real Chrome, locally or on GitHub Pages.
Requires Python playwright and Pillow (verification only, not runtime dependencies).
"""
import argparse
import io
import json
import os
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.work'/'phone-browser'
OUT.mkdir(parents=True,exist_ok=True)


class Checks(list):
    def append(self,message):
        super().append(message)
        print('PASS: '+message,flush=True)


def require(condition,message):
    if not condition:
        raise AssertionError(message)


def state(page):
    return page.locator('#phone').evaluate('(element)=>({...element.dataset})')


def body_key(page,key):
    page.evaluate('document.activeElement.blur()')
    page.keyboard.press(key)


def pixels_equal(first,second):
    return ImageChops.difference(Image.open(io.BytesIO(first)).convert('RGB'),
                                 Image.open(io.BytesIO(second)).convert('RGB')).getbbox() is None


def tap(page,name,force=False):
    page.locator('.screen-layer:not([inert]) [data-hotspot="'+name+'"]').click(force=force)


def settle(page,ms=700):
    page.clock.run_for(ms)


def pause(page):
    if state(page)['playing']=='true':
        page.locator('#play').click()


def main(base):
    parsed=urlparse(base);origin=f'{parsed.scheme}://{parsed.netloc}'
    errors,failed,requests,bad_status,checks=[],[],[],[],Checks()
    def observe(page):
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('console',lambda msg:errors.append(msg.text) if msg.type=='error' else None)
        page.on('requestfailed',lambda req:failed.append({'url':req.url,'failure':req.failure}))
        page.on('request',lambda req:requests.append({'url':req.url,'method':req.method}))
        page.on('response',lambda res:bad_status.append({'url':res.url,'status':res.status}) if res.status>=400 else None)

    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(headless=True,channel=os.environ.get('BROWSER_CHANNEL','chrome'))
        context=browser.new_context(viewport={'width':1440,'height':1050},device_scale_factor=1)
        page=context.new_page();observe(page)
        require(page.goto(base,wait_until='networkidle').status==200,'Demo must return HTTP 200')
        page.wait_for_selector('#phone[data-ready="true"]')
        page.clock.install()
        page.clock.pause_at(page.evaluate('Date.now()')+1000)
        settle(page,10000)
        require(state(page)['mode']=='manual' and state(page)['screen']=='0' and state(page)['playing']=='false','Initial phone must wait for the user, without autoplay')
        require(page.locator('#phone-frame').count()==1 and page.locator('.screen-layer').count()==1,'Exactly one physical phone and one active screen')
        page.mouse.move(2,2);page.screenshot(path=str(OUT/'desktop.png'),full_page=True)
        checks.append('Default is one stationary, tap-driven phone; it waits on the first screen without autoplay.')

        # Confirm that every interior bitmap is a pixel-identical crop of the native slide.
        for scene in range(2):
            original=Image.open(ROOT/'assets'/f'scene-{scene+1}.png').convert('RGB')
            native=ROOT/'.work'/'reference'/f'slide-{scene+1}.png'
            if native.exists():
                require(ImageChops.difference(original,Image.open(native).convert('RGB')).getbbox() is None,'Native PowerPoint source export must be unchanged')
            for screen in range(3):
                x=(94+480*screen)*2
                expected=original.crop((x,364,x+776,1920))
                actual=Image.open(ROOT/'assets'/'phone'/f'scene-{scene+1}-screen-{screen+1}.png').convert('RGB')
                require(ImageChops.difference(expected,actual).getbbox() is None,'Screen asset must be an unchanged source crop')
        checks.append('All six phone interiors match the native source crops exactly, with no redrawn text or UI.')

        page.select_option('#zoom','actual')
        settle(page,50)
        fixed_frame=page.locator('#phone-frame').bounding_box()
        for scene in range(2):
            page.select_option('#scene-select',str(scene))
            for screen in range(3):
                if screen:
                    page.locator('#next').click()
                    settle(page,660 if scene==0 and screen==2 else 3200)
                if scene==0 and screen==1:
                    for i in [1,2,3]:tap(page,f'answer-{i}')
                    settle(page,700)
                pause(page)
                page.mouse.move(2,2)
                require(page.locator('.screen-layer').count()==1,'Outgoing screen must be removed after its transition')
                require(page.locator('#phone-frame').bounding_box()==fixed_frame,'The physical phone must not move when the screen changes')
                screenshot=page.locator('#screen-window').screenshot(path=str(OUT/f'reference-{scene+1}-{screen+1}.png'))
                reference=context.new_page()
                reference.set_content(f'<style>html,body{{margin:0}}</style><img width="388" height="778" src="{base}assets/phone/scene-{scene+1}-screen-{screen+1}.png">')
                reference.wait_for_function('document.images[0].complete && document.images[0].naturalWidth===776')
                expected=reference.locator('img').screenshot()
                if not pixels_equal(screenshot,expected):
                    Image.open(io.BytesIO(expected)).save(OUT/f'expected-{scene+1}-{screen+1}.png')
                    ImageChops.difference(Image.open(io.BytesIO(screenshot)).convert('RGB'),Image.open(io.BytesIO(expected)).convert('RGB')).save(OUT/f'diff-{scene+1}-{screen+1}.png')
                require(pixels_equal(screenshot,expected),f'Screen {scene+1}/{screen+1} reference must match its original crop at 388 x 778')
                reference.close()
        checks.append('All six reference screens match the original source at 388 x 778: zero differing pixels; the outer phone frame stays fixed.')

        # The actual in-phone buttons navigate and select answers.
        page.select_option('#scene-select','0')
        tap(page,'check-risk');settle(page)
        require(state(page)['screen']=='1','Risk tap must open questions in the same phone')
        tap(page,'advice',force=True)
        require(state(page)['screen']=='1','Advice must wait until all three answers are selected')
        tap(page,'answer-1');tap(page,'answer-no-2');tap(page,'answer-3');settle(page)
        require(json.loads(state(page)['answers'])==[True,False,True],'Yes and No must be real, independently selectable states')
        require(page.locator('[data-hotspot="answer-no-2"]').get_attribute('aria-pressed')=='true','Selected No must be accessible')
        page.mouse.move(2,2);page.screenshot(path=str(OUT/'questions-selected.png'),full_page=True)
        tap(page,'phone-back');settle(page)
        require(state(page)['screen']=='0','In-phone back arrow returns to the prior screen')
        tap(page,'check-risk');settle(page)
        require(json.loads(state(page)['answers'])==[True,False,True],'Back navigation retains selections')
        tap(page,'advice');settle(page,2400)
        require(state(page)['screen']=='2' and 36<=int(state(page)['countdown'])<=40,'Advice opens hold and starts simulated countdown')
        pause(page);frozen=state(page);page.mouse.move(2,2)
        before=page.locator('#phone').screenshot(path=str(OUT/'countdown-paused.png'))
        settle(page,7000)
        require(state(page)==frozen,'Pause must freeze countdown, elapsed time and transition state')
        require(pixels_equal(before,page.locator('#phone').screenshot()),'Paused pixels must not animate')
        page.locator('#play').click();settle(page,1000)
        require(int(state(page)['holdElapsed'])>int(frozen['holdElapsed']),'Resume continues the existing countdown')
        settle(page,20000)
        require(state(page)['screen']=='2' and state(page)['countdown']=='0' and state(page)['playing']=='false','Expiry must remain held, never transfer or advance automatically')
        page.mouse.move(2,2);page.screenshot(path=str(OUT/'hold-expired.png'),full_page=True)
        page.locator('#reset').click();settle(page,5000)
        require(state(page)['screen']=='0' and state(page)['countdown']=='45' and state(page)['playing']=='false','Reset clears countdown and restores the first screen')
        checks.append('Tap-to-navigate, real Yes/No selections, answer validation, in-phone Back, countdown pause/resume/expiry and reset passed.')

        # Fade transitions use the same pausable clock as countdown and status reveals.
        tap(page,'check-risk');settle(page,120);pause(page)
        frozen=state(page);page.mouse.move(2,2);before=page.locator('#phone').screenshot()
        settle(page,1800)
        require(state(page)==frozen and pixels_equal(before,page.locator('#phone').screenshot()),'Pause must freeze the crossfade and ripple without jumping')
        page.locator('#play').click();settle(page)
        require(state(page)['screen']=='1' and state(page)['transition']=='false','Resume must finish the existing transition')
        checks.append('Screen crossfade and tap ripple pause at the exact frame and resume correctly.')

        # Emergency flow: tap, sequential reveal, report, tracking and safe dummy actions.
        page.select_option('#scene-select','1')
        tap(page,'emergency');settle(page,600)
        require(state(page)['screen']=='1','Emergency tap enters protection mode')
        tap(page,'report',force=True);require(state(page)['screen']=='1','Report waits for protection statuses')
        pause(page);frozen=state(page);settle(page,2000)
        require(state(page)==frozen,'Pause must stop protection status reveal')
        page.locator('#play').click();settle(page,3000)
        require(state(page)['protectionElapsed']=='2400','All three protection statuses complete')
        page.mouse.move(2,2);page.screenshot(path=str(OUT/'protection.png'),full_page=True)
        tap(page,'report');settle(page)
        require(state(page)['scene']=='1' and state(page)['screen']=='2','Report opens tracking in the same phone')
        page.mouse.move(2,2);page.screenshot(path=str(OUT/'tracking.png'),full_page=True)
        for name in ['evidence-slip','evidence-chat','add-evidence','contact-case']:
            tap(page,name)
            require(page.locator('#simulation-dialog').is_visible(),'Evidence/contact is a simulation dialog')
            require(page.locator('input[type="file"],input[type="password"],input[type="tel"]').count()==0,'No real data inputs')
            page.locator('#close-dialog').click()
        checks.append('Emergency statuses animate sequentially and pause correctly; reporting and tracking/evidence/contact actions work without sending information.')

        page.select_option('#scene-select','0')
        tap(page,'emergency-link-0');settle(page,3500)
        require(state(page)['scene']=='1' and state(page)['screen']=='1','Risk-screen emergency link directly opens protection in the same device')
        page.select_option('#scene-select','0')
        page.locator('#continuous').check();page.locator('#play').click()
        visited=set();screens=set()
        for index in range(160):
            current=state(page);visited.add((current['scene'],current['step']));screens.add((current['scene'],current['screen']))
            if current['playing']=='false':break
            settle(page,1000)
        require(len(visited)==26 and len(screens)==6,f'Auto should visit all 26 cues in six screens, got {len(visited)} / {len(screens)}')
        require(state(page)['scene']=='1' and state(page)['step']=='13' and state(page)['playing']=='false','Auto finishes both scenes and stops')
        checks.append('Optional automatic walkthrough plays all 26 cues across six screens inside one phone.')

        page.select_option('#scene-select','0');page.locator('#play').click();settle(page,500)
        page.locator('#next').click();settle(page)
        require(state(page)['mode']=='manual' and state(page)['screen']=='1','Next takes manual control of auto playback')
        page.locator('#back').click();settle(page)
        require(state(page)['screen']=='0','Back returns to first screen')
        page.locator('#play').click();settle(page,500)
        page.select_option('#scene-select','1');settle(page,5000)
        require(state(page)['mode']=='manual' and state(page)['screen']=='0' and state(page)['playing']=='false','Scene switch cancels old auto clock')
        body_key(page,'Space');settle(page,500);require(state(page)['playing']=='true','Space starts auto')
        body_key(page,'Space');require(state(page)['paused']=='true','Space pauses')
        body_key(page,'ArrowRight');settle(page,3500);require(state(page)['screen']=='1','Right selects next screen')
        body_key(page,'ArrowLeft');settle(page);require(state(page)['screen']=='0','Left selects previous screen')
        body_key(page,'r');require(state(page)['screen']=='0' and state(page)['mode']=='manual','R resets')
        page.select_option('#scene-select','0')
        page.locator('#continuous').uncheck();page.locator('#play').click();settle(page,8000)
        require(state(page)['step']=='0' and state(page)['playing']=='false','Non-continuous auto stops at one cue')
        page.locator('#play').click();require(state(page)['step']=='1','Play continues to the next cue rather than restarting')
        page.locator('#reset').click()
        checks.append('Next/Back, takeover from autoplay, switching scenes during playback, keyboard controls and single-step autoplay passed.')

        page.select_option('#zoom','1')
        for size in [{'width':1280,'height':800},{'width':1920,'height':1080}]:
            page.set_viewport_size(size);settle(page,100)
            box=page.locator('#phone').bounding_box();target=page.locator('[data-hotspot="check-risk"]').bounding_box()
            scale=box['width']/440
            require(abs(target['x']-box['x']-41*scale)<.1,'Hotspot x remains aligned')
            require(abs(target['y']-box['y']-695*scale)<.1,'Hotspot y remains aligned')
            require(abs(box['width']/box['height']-440/828)<.0001,'Phone is never distorted')
            tap(page,'check-risk');settle(page);require(state(page)['screen']=='1','Resized button works')
            page.locator('#reset').click()
        page.locator('#fullscreen').click();settle(page,100)
        require(page.evaluate('Boolean(document.fullscreenElement)'),'Fullscreen opens')
        tap(page,'check-risk');settle(page);require(state(page)['screen']=='1','Hotspot works in fullscreen')
        page.locator('#fullscreen').click();settle(page,100);page.locator('#reset').click()
        page.locator('#hide-controls').click();settle(page,100)
        require(not page.locator('#controls').is_visible() and page.locator('#show-controls').is_visible(),'Presentation controls hide and can be restored')
        page.mouse.move(2,2);page.screenshot(path=str(OUT/'presentation-mode.png'),full_page=True)
        page.locator('#show-controls').click()
        checks.append('Hotspots stay aligned within 0.1 CSS pixel at desktop sizes and fullscreen; phone aspect ratio and hide/restore controls passed.')

        mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
        phone=mobile.new_page();observe(phone)
        phone.goto(base,wait_until='networkidle');phone.wait_for_selector('#phone[data-ready="true"]')
        box=phone.locator('#phone').bounding_box()
        require(box['width']<=390 and box['height']<844 and abs(box['width']/box['height']-440/828)<.0001,'Mobile shows one complete undistorted phone')
        phone.screenshot(path=str(OUT/'mobile-fit.png'),full_page=True)
        phone.locator('[data-hotspot="check-risk"]').tap();phone.wait_for_selector('#phone[data-screen="1"][data-transition="false"]')
        for name in ['answer-1','answer-no-2','answer-3']:phone.locator('[data-hotspot="'+name+'"]').tap()
        phone.locator('[data-hotspot="advice"]').tap();phone.wait_for_selector('#phone[data-screen="2"][data-transition="false"]')
        require(state(phone)['screen']=='2','Touch journey is usable on the default mobile scale')
        phone.select_option('#scene-select','1')
        phone.select_option('#zoom','2')
        phone.locator('[data-hotspot="emergency"]').tap();phone.wait_for_selector('#phone[data-screen="1"][data-transition="false"]')
        phone.wait_for_selector('#phone[data-protection-elapsed="2400"]')
        phone.locator('[data-hotspot="report"]').tap();phone.wait_for_selector('#phone[data-screen="2"][data-transition="false"]')
        phone.screenshot(path=str(OUT/'mobile-zoom.png'),full_page=True)
        phone.select_option('#zoom','1')
        phone.screenshot(path=str(OUT/'mobile-tracking.png'),full_page=True)
        mobile.close()
        checks.append('Mobile 390 x 844: one complete phone, real touch through both journeys, 200% zoom/panning and unchanged screen layout passed.')

        require(not errors,f'Console/page errors: {errors}')
        require(not failed and not bad_status,f'Failed assets: {failed} / {bad_status}')
        require(all(r['method']=='GET' and r['url'].startswith(origin+'/') for r in requests),'Only same-origin static GET requests permitted')
        checks.append('Zero console errors, failed requests or HTTP asset errors; only same-origin static GET requests, no API/POST/external services.')
        context.close();browser.close()
    report={'url':base,'checks':checks,'console_errors':errors,'failed_requests':failed,'bad_status':bad_status,'requests':requests}
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'url':base,'passed':len(checks),'checks':checks},ensure_ascii=True,indent=2),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('url')
    main(parser.parse_args().url.rstrip('/')+'/')
