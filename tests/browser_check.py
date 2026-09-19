"""Real Chromium checks, with screenshots, request audit and virtual-clock playback.

Requires Python's playwright and Pillow only for verification, not for the website.
Usage: python tests/browser_check.py http://127.0.0.1:4173/kplus-scambreak-demo/
"""
import argparse
import io
import json
import os
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".work" / "browser"
OUT.mkdir(parents=True, exist_ok=True)


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def state(page):
    return page.locator('#slide').evaluate('(element) => ({...element.dataset})')


def click_body_key(page, key):
    page.locator('body').evaluate('(element)=>element.focus()')
    page.evaluate('document.activeElement.blur()')
    page.keyboard.press(key)


def main(base):
    parsed = urlparse(base)
    origin = f'{parsed.scheme}://{parsed.netloc}'
    errors, failed_requests, requests = [], [], []
    checks = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True,channel=os.environ.get('BROWSER_CHANNEL','chrome'))
        context = browser.new_context(viewport={'width':1680,'height':1200},device_scale_factor=1)
        page = context.new_page()
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('console',lambda message:errors.append(message.text) if message.type == 'error' else None)
        page.on('requestfailed',lambda request:failed_requests.append({'url':request.url,'failure':request.failure}))
        page.on('request',lambda request:requests.append({'url':request.url,'method':request.method}))
        response=page.goto(base,wait_until='networkidle')
        require(response.status==200,'Published page must respond HTTP 200')
        page.wait_for_selector('#slide[data-ready="true"]')
        page.select_option('#zoom','actual')
        page.mouse.move(2,2)
        page.screenshot(path=str(OUT/'desktop.png'),full_page=True)
        for scene in [0,1]:
            page.select_option('#scene-select',str(scene))
            page.mouse.move(2,2)
            page.wait_for_function('document.querySelector("#slide-image").complete')
            screenshot=page.locator('#slide').screenshot(path=str(OUT/f'reference-scene-{scene+1}.png'))
            # Compare against an independently displayed, untouched source render,
            # at the exact same pixel size, with the same browser's image sampler.
            reference=context.new_page()
            reference.set_content(f'<style>html,body{{margin:0}}</style><img width="1536" height="1024" src="{base}assets/scene-{scene+1}.png">')
            reference.wait_for_function('document.images[0].complete && document.images[0].naturalWidth===3072')
            expected=reference.locator('img').screenshot()
            diff=ImageChops.difference(Image.open(io.BytesIO(screenshot)).convert('RGB'),Image.open(io.BytesIO(expected)).convert('RGB'))
            if diff.getbbox() is not None:
                Image.open(io.BytesIO(expected)).save(OUT/f'expected-scene-{scene+1}.png')
                diff.save(OUT/f'diff-scene-{scene+1}.png')
            require(diff.getbbox() is None,f'Scene {scene+1}: reference screenshot differs from original render')
            reference.close()
        checks.append('Both reference scenes exactly match the native source-render assets at 1536 × 1024 (pixel difference: zero).')
        for number in [1,2]:
            native=ROOT/'.work'/'reference'/f'slide-{number}.png'
            if native.exists():
                diff=ImageChops.difference(Image.open(native).convert('RGB'),Image.open(ROOT/'assets'/f'scene-{number}.png').convert('RGB'))
                require(diff.getbbox() is None,f'Scene {number}: website asset differs from independent PowerPoint export')
        checks.append('Published image assets also match the independent native PowerPoint exports.')

        page.select_option('#scene-select','0')
        page.locator('[data-hotspot="check-risk"]').click()
        require(state(page)['step']=='3','Risk hotspot opens questions')
        for number,step in [(1,4),(2,5),(3,6)]:
            page.locator(f'[data-hotspot="answer-{number}"]').click()
            require(state(page)['step']==str(step),f'Answer {number} advances the story')
        page.locator('[data-hotspot="advice"]').click()
        require(state(page)['step']=='9','Advice hotspot opens the hold screen')
        page.locator('#next').click()
        require(state(page)['step']=='10','Next reaches countdown')
        page.locator('#continuous').uncheck()
        page.clock.install()
        page.locator('#play').click()
        page.clock.run_for(2400)
        require(36 <= int(state(page)['countdown']) <= 40,'Countdown is progressing')
        page.locator('#play').click()
        paused=state(page)
        page.mouse.move(2,2)
        pause_before=page.locator('#slide').screenshot(path=str(OUT/'countdown-paused.png'))
        page.clock.run_for(3700)
        require(state(page)==paused,'Pause freezes the exact timeline and countdown')
        require(pause_before==page.locator('#slide').screenshot(),'Pause freezes all animation pixels')
        page.locator('#play').click()
        page.clock.run_for(700)
        resumed=state(page)
        require(int(resumed['elapsed'])>int(paused['elapsed']),'Resume continues from paused elapsed time')
        require(int(resumed['countdown'])<int(paused['countdown']),'Resume continues the same countdown')
        page.locator('#reset').click()
        page.clock.run_for(5000)
        require(state(page)['step']=='-1' and state(page)['countdown']=='45' and state(page)['playing']=='false','Reset restores reference and cancels previous clock')
        checks.append('Manual risk/questions/advice route, pause pixel freeze, resume and reset all passed.')

        page.locator('#play').click();page.clock.run_for(120);page.locator('#play').click()
        early=state(page)
        t=min(1,int(early['elapsed'])/650)
        expected_opacity=.48*t*t*(3-2*t)
        require(abs(float(page.locator('#phone-focus').get_attribute('opacity'))-expected_opacity)<.005,'Pausing inside the entrance fade must not jump its opacity')
        page.clock.run_for(1000)
        require(state(page)==early,'Early-fade pause preserves time')
        page.locator('#reset').click()

        page.locator('#continuous').check()
        page.locator('#play').click()
        visited=[]
        for index in range(155):
            page.clock.run_for(1000)
            current=state(page)
            pair=(current['scene'],current['step'])
            if pair not in visited:
                visited.append(pair)
            if pair==('1','12') and not (OUT/'evidence-animation.png').exists():
                page.mouse.move(2,2)
                page.locator('#slide').screenshot(path=str(OUT/'evidence-animation.png'))
            if current['playing']=='false':
                break
        require(len(visited)==26,f'Expected to visit all 26 animation steps, visited {visited}')
        require(state(page)['scene']=='1' and state(page)['step']=='13' and state(page)['playing']=='false','Both scenes play to completion and stop')
        checks.append('Played every animation step in order: 12 steps in scene 1 and 14 in scene 2.')

        page.locator('#reset').click()
        page.locator('[data-hotspot="emergency"]').click()
        require(state(page)['step']=='2','Emergency hotspot enters protection mode')
        for number in [1,2,3]:
            page.locator(f'[data-hotspot="protection-{number}"]').click()
            require(state(page)['step']==str(number+2),'Protection status hotspot responds')
        page.locator('[data-hotspot="report"]').click()
        require(state(page)['step']=='8','Report hotspot opens case tracking')
        page.locator('[data-hotspot="add-evidence"]').click()
        require(page.locator('#simulation-dialog').is_visible(),'Evidence simulation dialog opens')
        require(page.locator('input[type="file"],input[type="password"]').count()==0,'No file/password inputs')
        page.locator('#close-dialog').click()
        page.locator('[data-hotspot="contact-case"]').click()
        require(page.locator('#simulation-dialog').is_visible(),'Contact simulation opens')
        page.keyboard.press('Escape')
        checks.append('Emergency, protection rows, case tracking, evidence and contact actions work without external actions.')

        page.locator('#play').click()
        page.clock.run_for(450)
        page.locator('#next').click()
        require(state(page)['playing']=='false' and state(page)['elapsed']=='0','Next while playing clears elapsed time')
        page.locator('#back').click()
        page.locator('#play').click()
        page.clock.run_for(450)
        page.select_option('#scene-select','0')
        page.clock.run_for(3000)
        require(state(page)['scene']=='0' and state(page)['step']=='-1' and state(page)['playing']=='false','Scene switch cancels old playback')
        click_body_key(page,'Space');page.clock.run_for(500)
        require(state(page)['playing']=='true','Space starts playback')
        click_body_key(page,'Space')
        require(state(page)['playing']=='false','Space pauses playback')
        click_body_key(page,'ArrowRight');require(state(page)['step']=='1','Right arrow advances')
        click_body_key(page,'ArrowLeft');require(state(page)['step']=='0','Left arrow goes back')
        click_body_key(page,'r');require(state(page)['step']=='-1','R restores source reference')
        page.locator('#continuous').uncheck();page.locator('#play').click();page.clock.run_for(8000)
        require(state(page)['step']=='0' and state(page)['playing']=='false','Step-by-step mode stops at current step')
        page.locator('#reset').click()
        checks.append('Keyboard shortcuts, next/back, scene switch during playback and single-step mode passed.')

        page.select_option('#zoom','1')
        for size in [{'width':1280,'height':800},{'width':1920,'height':1080}]:
            page.set_viewport_size(size)
            page.clock.run_for(100)
            target=page.locator('[data-hotspot="check-risk"]').bounding_box()
            stage=page.locator('#slide').bounding_box()
            scale=stage['width']/1536
            require(abs(target['x']-stage['x']-109*scale)<.1,'Hotspot x scales with the slide')
            require(abs(target['y']-stage['y']-853*scale)<.1,'Hotspot y scales with the slide')
            require(abs(stage['width']/stage['height']-1.5)<.001,'The original 3:2 slide ratio is retained')
            page.locator('[data-hotspot="check-risk"]').click()
            require(state(page)['step']=='3','Resized hotspot activates correctly')
            page.locator('#reset').click()
        page.locator('#fullscreen').click()
        require(page.evaluate('Boolean(document.fullscreenElement)'),'Fullscreen opens')
        page.locator('[data-hotspot="check-risk"]').click()
        require(state(page)['step']=='3','Hotspot works in fullscreen')
        page.locator('#fullscreen').click()
        page.locator('#reset').click()
        page.locator('#hide-controls').click()
        require(not page.locator('#controls').is_visible(),'Controls can be hidden outside the slide')
        require(page.locator('#show-controls').is_visible(),'Restore control remains reachable')
        page.locator('#show-controls').click()
        checks.append('Hotspots retain measured positions at multiple desktop sizes and in fullscreen; controls hide/restore correctly.')

        mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
        phone=mobile.new_page()
        phone.on('pageerror',lambda error:errors.append(str(error)))
        phone.goto(base,wait_until='networkidle');phone.wait_for_selector('#slide[data-ready="true"]')
        box=phone.locator('#slide').bounding_box()
        require(box['width']<=390 and abs(box['width']/box['height']-1.5)<.001,'Mobile fits the complete original slide')
        phone.screenshot(path=str(OUT/'mobile-fit.png'),full_page=True)
        phone.select_option('#zoom','3')
        phone.locator('[data-hotspot="check-risk"]').tap()
        require(state(phone)['step']=='3','Zoomed mobile hotspot works after scrolling')
        phone.screenshot(path=str(OUT/'mobile-zoom.png'),full_page=True)
        phone.select_option('#scene-select','1')
        phone.locator('[data-hotspot="emergency"]').tap()
        require(state(phone)['step']=='2','Mobile scene 2 hotspot works')
        mobile.close()
        checks.append('Mobile 390 × 844: complete slide, 300% zoom, panning and both scene hotspots passed.')
        require(not errors,f'Browser console errors: {errors}')
        require(not failed_requests,f'Failed asset requests: {failed_requests}')
        require(all(r['method']=='GET' and r['url'].startswith(origin+'/') for r in requests),'Only same-origin static GET requests are allowed')
        checks.append('No console errors or failed asset requests; only same-origin static GET requests observed.')
        context.close();browser.close()
    report={'url':base,'checks':checks,'console_errors':errors,'failed_requests':failed_requests,'requests':requests}
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'url':base,'passed':len(checks),'checks':checks},ensure_ascii=True,indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('url');args=parser.parse_args()
    main(args.url.rstrip('/')+'/')
