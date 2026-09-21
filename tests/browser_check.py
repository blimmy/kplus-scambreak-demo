"""Full connected demo: real-browser journeys, every button family, source pixels and privacy.
Usage: python tests/browser_check.py http://127.0.0.1:4173/kplus-scambreak-demo/
"""
import argparse
import io
import json
import os
from pathlib import Path
from urllib.parse import urlsplit,urlunsplit

from PIL import Image,ImageChops
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.work'/'journey-browser'
OUT.mkdir(parents=True,exist_ok=True)


def require(condition,message):
    if not condition:raise AssertionError(message)


def state(page):
    return page.locator('#phone').evaluate('(e)=>({...e.dataset})')


def same_pixels(first,second):
    return ImageChops.difference(Image.open(io.BytesIO(first)).convert('RGB'),Image.open(io.BytesIO(second)).convert('RGB')).getbbox() is None


def main(url):
    parsed=urlsplit(url);base=urlunsplit((parsed.scheme,parsed.netloc,parsed.path.rstrip('/')+'/', '', ''))
    origin=f'{parsed.scheme}://{parsed.netloc}'
    checks,errors,failed,requests,bad_status,clicked,visited=[],[],[],[],[],set(),set()
    reference_diffs=[]
    def passed(text):
        checks.append(text);print('PASS: '+text,flush=True)
    def observe(page):
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        page.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
        page.on('request',lambda r:requests.append({'url':r.url,'method':r.method}))
        page.on('response',lambda r:bad_status.append({'url':r.url,'status':r.status}) if r.status>=400 else None)

    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,channel=os.environ.get('BROWSER_CHANNEL','chrome'))
        context=browser.new_context(viewport={'width':1440,'height':1050},device_scale_factor=1)
        page=context.new_page();observe(page)
        require(page.goto(url,wait_until='networkidle').status==200,'Published page returns HTTP 200')
        page.wait_for_selector('#phone[data-ready="true"]')
        page.clock.install();page.clock.pause_at(page.evaluate('Date.now()')+1000)
        def run(ms=660):page.clock.run_for(ms)
        def click(action,value=None,ms=660,force=False,hotspot=None):
            route=state(page)['route'];visited.add(route)
            selector='.screen-layer:not([inert]) '+(f'[data-hotspot="{hotspot}"]' if hotspot else f'button[data-action="{action}"]'+(f'[data-value="{value}"]' if value is not None else ''))
            target=page.locator(selector).filter(visible=True).first
            clicked.add((route,action,str(value),str(hotspot)))
            target.click(force=force)
            run(ms);visited.add(state(page)['route'])
            require(page.locator('#phone-frame').count()==1,'Only one physical phone')
            require(page.locator('.screen-layer').count()<=2,'No stale screen layers')
        def reset():
            page.locator('#reset').click();run(700)
            require(state(page)['route']=='home' and state(page)['protected']=='false' and state(page)['caseSubmitted']=='false','Reset clears the complete journey')
        def pause():
            if state(page)['playing']=='true':page.locator('#play').click()
        def snapshot(name):
            page.mouse.move(2,2);page.screenshot(path=str(OUT/(name+'.png')),full_page=True)
        def enter_amount(value='50000'):
            click('transfer');click('recipient-select');page.locator('#amount-input').fill(value);click('amount-next')
        def hold(value='50000',answers=(True,True,True)):
            enter_amount(value);click('risk')
            for i,answer in enumerate(answers):click('answer',f'{i}:{str(answer).lower()}')
            click('advice')
        def report():
            click('emergency',ms=3100);click('report-start');click('select-prior');click('report-details');click('reason','phone');click('consent');click('report-review');click('report-send',ms=2600)
            require(state(page)['route']=='tracking' and state(page)['caseSubmitted']=='true','Case must be created only after the reporting form')
        def reference(scene,screen,name):
            pause();page.mouse.move(2,2)
            screenshot=page.locator('#screen-window').screenshot(path=str(OUT/(name+'.png')))
            ref=context.new_page();ref.set_content(f'<style>html,body{{margin:0}}</style><img width="388" height="778" src="{base}assets/phone/scene-{scene}-screen-{screen}.png">')
            ref.wait_for_function('document.images[0].complete && document.images[0].naturalWidth===776')
            expected=ref.locator('img').screenshot()
            difference=ImageChops.difference(Image.open(io.BytesIO(screenshot)).convert('RGB'),Image.open(io.BytesIO(expected)).convert('RGB'))
            changed=sum(1 for pixel in difference.getdata() if pixel!=(0,0,0))
            maximum=max(high for low,high in difference.getextrema())
            reference_diffs.append({'screen':name,'changed_pixels':changed,'max_channel_difference':maximum})
            if not same_pixels(screenshot,expected):
                Image.open(io.BytesIO(expected)).save(OUT/(name+'-expected.png'))
                ImageChops.difference(Image.open(io.BytesIO(screenshot)).convert('RGB'),Image.open(io.BytesIO(expected)).convert('RGB')).save(OUT/(name+'-diff.png'))
            require(changed<=12 and maximum<=2,'Reference mismatch: '+name+f' ({changed} pixels, max channel difference {maximum})')
            ref.close()

        run(7000);require(state(page)['route']=='home' and state(page)['playing']=='false','Default is a manual home screen, not two separate demos')
        snapshot('desktop-home');passed('One phone starts at the source home screen and waits for a tap.')
        page.select_option('#zoom','actual');run(100)
        phone_box=page.locator('#phone-frame').bounding_box()
        reference(2,1,'reference-home')
        enter_amount();reference(1,1,'reference-confirm')
        click('risk')
        for i in range(3):click('answer',f'{i}:true')
        reference(1,2,'reference-questions')
        click('advice');require(state(page)['countdown']=='45','Reference hold time starts at 00:45 after the screen fade')
        reference(1,3,'reference-hold')
        click('emergency',ms=3200);reference(2,2,'reference-emergency')
        click('go','account',hotspot='protected-balance');require(state(page)['route']=='account' and state(page)['protected']=='true','Viewing balance preserves emergency protection');click('back')
        click('report-start');click('select-prior');click('report-details');click('reason','phone');click('consent');click('report-review');click('report-send',ms=2600)
        reference(2,3,'reference-tracking')
        click('transaction','prior',hotspot='reported-transaction');require(state(page)['route']=='transaction','The reported-payment card opens the prior transaction');click('back')
        require(page.locator('#phone-frame').bounding_box()==phone_box,'Frame position stays fixed throughout the integrated story')
        passed('All six original screens match their reference states at 388 x 778 (at most 12 raster-rounding pixels, channel difference <= 2); one fixed phone frame.')

        reset();click('transfer');click('recipient-select')
        click('amount-next');require(state(page)['route']=='amount' and page.locator('#amount-error').is_visible(),'Empty amount shows inline validation')
        page.locator('#amount-input').fill('999999');click('amount-next');require(state(page)['route']=='amount','Insufficient demo funds cannot proceed')
        click('amount-key','clear')
        for digit in ['1','2','.','3','4','backspace','5']:click('amount-key',digit,ms=50)
        require(page.locator('#amount-input').input_value()=='12.35','Number pad edits exact decimal amount')
        click('amount-preset','5000');require(page.locator('#amount-input').input_value()=='5000','Preset sets the field')
        click('amount-key','clear');page.locator('#amount-input').fill('12345.67');snapshot('amount-entered')
        click('amount-next');require(state(page)['amount']=='1234567','Entered amount reaches confirmation')
        require(page.locator('.dynamic-amount').inner_text()=='12,345.67 บาท','The source confirmation shows the custom amount')
        snapshot('custom-amount-confirm')
        for hotspot in ['risk-new','risk-amount']:
            click('go','riskInfo',hotspot=hotspot);require(state(page)['route']=='riskInfo','Risk chips explain the source warnings');click('back')
        click('risk');click('advice',force=True);require(state(page)['route']=='questions','Unanswered questions cannot proceed')
        for i,value in enumerate([True,False,True]):click('answer',f'{i}:{str(value).lower()}')
        require(json.loads(state(page)['answers'])==[True,False,True],'Both Yes/No values persist')
        snapshot('answers-selected');click('back',hotspot='phone-back');require(state(page)['route']=='confirm','Source Back returns to the correct prior app screen')
        click('risk');require(json.loads(state(page)['answers'])==[True,False,True],'Back preserves answers')
        click('advice');run(1800);pause();before=state(page);page.mouse.move(2,2);pixels=page.locator('#phone').screenshot()
        page.clock.fast_forward(7000)
        require(state(page)==before and same_pixels(pixels,page.locator('#phone').screenshot()),'Pause freezes actual pixels, time and countdown')
        page.locator('#play').click();run(700);require(int(state(page)['holdElapsed'])>int(before['holdElapsed']),'Resume continues the existing timer')
        page.clock.fast_forward(20000);run(100)
        require(state(page)['route']=='hold' and state(page)['countdown']=='0' and state(page)['transferStatus']=='held','Expiry never transfers money or changes screens')
        click('cancel-request');snapshot('cancel-confirm');click('back');require(state(page)['route']=='hold','Cancel can be declined')
        click('cancel-request');click('cancel-yes');require(state(page)['transferStatus']=='cancelled','Cancellation changes the actual transaction state')
        snapshot('cancelled');click('home');require(state(page)['route']=='home','Cancellation has a path home')
        passed('Amount form/keypad/presets/validation, dynamic amount, Yes/No, Back, pause/resume/expiry and confirmed cancellation passed.')

        reset();hold('23456.78')
        click('emergency',ms=600);pause();before=state(page);page.clock.fast_forward(4000);require(state(page)==before,'Protection reveal pauses')
        page.locator('#play').click();run(3000)
        click('report-start');click('report-details');require(state(page)['route']=='select','A transaction must be selected')
        click('select-prior');snapshot('select-prior');click('report-details')
        click('report-review');require(state(page)['route']=='details','Incident type is required')
        click('reason','official');click('report-review');require(state(page)['route']=='details','Consent is required')
        click('consent');snapshot('report-details');click('report-review');snapshot('report-review')
        click('report-send',ms=700);pause();before=state(page);page.clock.fast_forward(4000);require(state(page)==before,'Submission animation pauses')
        page.locator('#play').click();run(1800)
        require(state(page)['route']=='tracking' and state(page)['amount']=='2345678' and state(page)['caseSubmitted']=='true','The entered held transaction survives through the separate prior-payment case')
        snapshot('tracking')
        passed('The two features run in one continuous session: entered transfer remains held; the prior payment gets a case only after selection, incident and consent.')

        for hotspot in ['evidence-slip','evidence-chat']:
            click('evidence-open',hotspot=hotspot);require(state(page)['route']=='viewer','Evidence opens a real preview screen');snapshot(hotspot);click('back')
        click('add-evidence');snapshot('evidence-picker')
        for key in ['call','profile']:click('evidence-toggle',key)
        click('evidence-save');require(state(page)['evidence']=='4','Evidence is actually attached to the case')
        snapshot('tracking-four-evidence');click('go','evidence')
        for key in ['slip','chat','call','profile']:
            click('evidence-open',key);require(state(page)['route']=='viewer','Every evidence type has content');click('back')
        click('track')
        for hotspot in ['case','status-received','status-investigation','case-next']:
            click('next-steps',hotspot=hotspot);require(state(page)['route']=='nextSteps','Case/status actions have a next-steps destination');click('back')
        click('go','aoc',hotspot='status-aoc');snapshot('aoc');click('aoc-ready');require(state(page)['route']=='nextSteps','AOC preparation updates a checklist without calling AOC')
        click('home');snapshot('home-with-case')
        click('track');require(state(page)['route']=='tracking','Home can reopen the same case')
        passed('All evidence previews, adding four sample attachments, case/status buttons, AOC preparation and reopening the case passed.')

        click('contact',hotspot='contact-case');snapshot('contact');click('chat')
        for topic in ['hold','case','security']:click('chat-choice',topic)
        snapshot('chat');click('back');click('call',ms=900);pause();before=state(page);page.clock.fast_forward(4000);require(state(page)==before,'Simulated call connection pauses')
        page.locator('#play').click();run(1500);require('เชื่อมต่อกับเจ้าหน้าที่จำลองแล้ว' in page.locator('#call-state').inner_text(),'Call has a connected state')
        snapshot('call');click('end-call');require(state(page)['route']=='contact','Hang up returns to contact choices')
        click('go','security');snapshot('security');click('go','devices');click('go','security');click('go','password');click('password-check')
        click('home')
        for hotspot in ['home-transfer','home-topup','home-bill','home-withdraw']:
            click('transfer' if hotspot=='home-transfer' else 'service-start',hotspot=hotspot)
            require(state(page)['route']=='blocked' and state(page)['protected']=='true','Protection must block money-out across the whole demo')
            click('home')
        passed('Contact chat/topics/call/hang-up and security screens work; protection persists across home and all money-out buttons.')

        # Exercise every visible home icon and tab, plus peripheral service completion.
        for hotspot,kind in [('home-topup','topup'),('home-bill','bill'),('home-withdraw','withdraw')]:
            reset();click('service-start',hotspot=hotspot)
            choices=page.locator('.custom-content [data-action="service-amount"]').count()
            for index in range(choices):
                value=page.locator('.custom-content [data-action="service-amount"]').nth(index).get_attribute('data-value')
                click('service-amount',value)
            snapshot(kind);click('service-next');click('service-confirm');require(state(page)['route']=='serviceDone','Peripheral service creates a demo receipt')
            snapshot(kind+'-done');click('go','transactions');click('transaction','service-1');click('home')
        reset();click('go','scan',hotspot='home-scan');snapshot('scan');click('scan-sample');require(state(page)['route']=='amount','QR sample joins the same transfer flow')
        click('home')
        click('go','account',hotspot='home-account');click('balance');require('123,456.78' in page.locator('.money').inner_text(),'Demo balance can be shown')
        click('balance');click('go','transactions');click('transaction','prior');snapshot('prior-transfer');click('evidence-open','slip');click('back');click('home')
        for hotspot,route in [('home-bell','notifications'),('nav-notifications','notifications'),('nav-transactions','transactions'),('home-services','services'),('nav-services','services')]:
            click('go',route,hotspot=hotspot);require(state(page)['route']==route,'Home tab/icon has a destination: '+hotspot);click('home')
        click('home',hotspot='nav-home')
        click('go','services');click('go','security');click('go','devices');click('devices-end');require('ออกจากระบบแล้ว' in page.locator('.custom-content').inner_text(),'End-other-device action changes state')
        click('home')
        passed('Every home icon and bottom tab has a working destination; top-up/bill/withdraw complete simulated receipts, QR enters transfer, balance/history/device actions work.')

        reset();click('transfer',ms=120);pause();before=state(page);page.mouse.move(2,2);pixels=page.locator('#phone').screenshot()
        page.clock.fast_forward(1800);require(state(page)==before and same_pixels(pixels,page.locator('#phone').screenshot()),'Fade and ripple freeze without jumping')
        page.locator('#play').click();run(700);require(state(page)['route']=='recipient' and state(page)['transition']=='false','Resume finishes the same fade')
        reset();page.locator('#play').click();visited_steps=set()
        for index in range(220):
            s=state(page)
            if s['mode']!='auto':break
            visited_steps.add(int(s['step']));visited.add(s['route']);page.clock.fast_forward(1000)
        run(800)
        require(len(visited_steps)==24,f'Full walkthrough must visit all 24 steps, got {visited_steps}')
        require(state(page)['route']=='home' and state(page)['caseSubmitted']=='true' and state(page)['evidence']=='3','Auto executes the complete connected case/evidence journey and returns home')
        reset();page.locator('#continuous').uncheck();page.locator('#play').click();run(6000)
        require(state(page)['paused']=='true' and state(page)['route']=='recipient','Step mode stops after applying one action')
        page.locator('#play').click();run(200);click('recipient-select');require(state(page)['mode']=='manual' and state(page)['route']=='amount','A tap takes control from autoplay')
        page.locator('#continuous').check();reset()
        page.evaluate('document.activeElement.blur()');page.keyboard.press('ArrowRight');run();require(state(page)['route']=='recipient','Right advances the real flow')
        page.evaluate('document.activeElement.blur()');page.keyboard.press('ArrowLeft');run();require(state(page)['route']=='home','Left goes back')
        page.evaluate('document.activeElement.blur()');page.keyboard.press('Space');run(300);page.keyboard.press('Space');require(state(page)['paused']=='true','Space starts and pauses')
        page.keyboard.press('r');run();require(state(page)['route']=='home' and state(page)['caseSubmitted']=='false','R fully resets')
        passed('Fade/ripple pause, all 24 real autoplay steps, step mode, manual takeover, keyboard controls and full reset passed.')

        page.select_option('#zoom','1')
        for size in [{'width':1280,'height':800},{'width':1920,'height':1080}]:
            page.set_viewport_size(size);run(100)
            frame=page.locator('#phone').bounding_box();target=page.locator('[data-hotspot="home-transfer"]').bounding_box();scale=frame['width']/440
            require(abs(target['x']-frame['x']-51*scale)<.1 and abs(target['y']-frame['y']-316*scale)<.1,'Home hotspot stays on the source button')
            require(abs(frame['width']/frame['height']-440/828)<.0001,'Uniform phone scaling')
            click('transfer');click('home')
        page.locator('#fullscreen').click();run(100);require(page.evaluate('!!document.fullscreenElement'),'Fullscreen opens')
        click('transfer');click('home');page.locator('#fullscreen').click();run(100)
        page.locator('#hide-controls').click();run(100);require(not page.locator('#controls').is_visible(),'Controls hide outside the phone');snapshot('presentation-mode')
        page.locator('#show-controls').click();run(100)
        passed('Uniform scaling, measured hotspots, fullscreen and hide/restore controls passed.')

        mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
        phone=mobile.new_page();observe(phone);phone.goto(url,wait_until='networkidle');phone.wait_for_selector('#phone[data-ready="true"]')
        def mobile_click(action,value=None):
            selector='.screen-layer:not([inert]) [data-action="'+action+'"]'+(f'[data-value="{value}"]' if value is not None else '')
            phone.locator(selector).filter(visible=True).first.tap();phone.wait_for_selector('#phone[data-transition="false"]')
        box=phone.locator('#phone-frame').bounding_box();require(box['width']<=390 and abs(box['width']/box['height']-440/828)<.0001,'Mobile fits one full phone')
        phone.screenshot(path=str(OUT/'mobile-home.png'))
        mobile_click('transfer');mobile_click('recipient-select');mobile_click('amount-preset','50000')
        phone.screenshot(path=str(OUT/'mobile-amount.png'))
        mobile_click('amount-next');mobile_click('risk')
        for i in range(3):mobile_click('answer',f'{i}:true')
        mobile_click('advice');mobile_click('emergency');phone.wait_for_selector('#phone[data-protection-elapsed="2400"]')
        mobile_click('report-start');mobile_click('select-prior');mobile_click('report-details');mobile_click('reason','phone');mobile_click('consent');mobile_click('report-review');mobile_click('report-send')
        phone.wait_for_selector('#phone[data-route="tracking"][data-transition="false"]');mobile_click('add-evidence');mobile_click('evidence-toggle','call');mobile_click('evidence-save')
        phone.screenshot(path=str(OUT/'mobile-tracking.png'))
        require(state(phone)['caseSubmitted']=='true' and state(phone)['evidence']=='3','Full unified journey works with touch on a small screen')
        phone.select_option('#zoom','2');mobile_click('next-steps');phone.screenshot(path=str(OUT/'mobile-zoom.png'))
        mobile.close();passed('390 x 844 touch: amount entry through risk, protection, reporting, case and evidence in one uninterrupted journey; 200% zoom works.')

        require(page.locator('input[type="file"],input[type="password"],input[type="tel"],textarea,form[action]').count()==0,'No sensitive-input or real-upload forms')
        require(page.evaluate('localStorage.length===0 && sessionStorage.length===0'),'State stays in memory only')
        require(not errors and not failed and not bad_status,f'Browser failures: {errors} / {failed} / {bad_status}')
        require(all(r['method']=='GET' and r['url'].startswith(origin+'/') for r in requests),'Only same-origin static GET requests')
        passed('Zero console/asset errors; no file/password/phone inputs, persistent storage, API, POST or external traffic.')
        context.close();browser.close()

    result={'url':url,'checks':checks,'reference_diffs':reference_diffs,'console_errors':errors,'failed_requests':failed,'bad_status':bad_status,
            'visited_routes':sorted(visited),'clicked':sorted(clicked),'requests':requests}
    (OUT/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'url':url,'passed':len(checks),'routes':len(visited),'button_variants_clicked':len(clicked)},ensure_ascii=True),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('url');main(parser.parse_args().url)
