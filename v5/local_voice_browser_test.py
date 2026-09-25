"""Actual Vosk WASM decoding of synthetic PCM fixtures in Chromium, never a user's mic.
Run with --en /path/to/en.wav --zh /path/to/zh.wav. No paid speech/provider calls.
"""
import argparse, base64, json, os, pathlib, shutil, socket, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright, expect

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/v6';OUT.mkdir(parents=True,exist_ok=True)
args=argparse.ArgumentParser();args.add_argument('--en',required=True);args.add_argument('--zh',required=True);args=args.parse_args()
with socket.socket() as sock:
    sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
runtime=tempfile.mkdtemp(prefix='vc53-asr-');server=None;checks=[]
def check(name,result):
    assert result,name
    checks.append({'name':name,'passed':True})
try:
    server=subprocess.Popen(['node','v5/server.js'],cwd=ROOT,env={**os.environ,'PORT':str(port),'LOCAL_DATA_DIR':runtime},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    url=f'http://127.0.0.1:{port}'
    for _ in range(80):
        try:urllib.request.urlopen(url+'/api/v5/status',timeout=1);break
        except Exception:time.sleep(.2)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        page=browser.new_page(viewport={'width':1440,'height':1100})
        errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
        page.on('console',lambda m:print('Browser:',m.text[:250],flush=True) if m.type=='error' else None)
        page.goto(url)
        # Test-only getUserMedia feeds a synthetic PCM source into the actual controller.
        page.add_script_tag(url=url+'/vosk.js')
        for language,fixture,expected in [('en-US',args.en,'shanghai'),('zh-CN',args.zh,'上海')]:
            audio=base64.b64encode(pathlib.Path(fixture).read_bytes()).decode()
            page.evaluate('''async (b64)=>{
              window.__fixtureAudio=new AudioContext();
              const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
              const buffer=await __fixtureAudio.decodeAudioData(bytes.buffer);
              window.__fixtureTracks=[];
              navigator.mediaDevices.getUserMedia=async()=>{
                const dest=__fixtureAudio.createMediaStreamDestination();
                window.__playFixture=()=>{const source=__fixtureAudio.createBufferSource();source.buffer=buffer;source.connect(dest);source.start(__fixtureAudio.currentTime+.4);};
                await __fixtureAudio.resume();__playFixture();
                window.__fixtureTracks.push(...dest.stream.getTracks());return dest.stream;
              };
              Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],cancel(){},speak(){throw Error('Unexpected cloud TTS');}}});
            }''',audio)
            before=page.evaluate('TravelApp.getState().history.length')
            page.locator('#voice-language').select_option(language)
            page.locator('#start-call').click();page.locator('#mic-consent').check();page.locator('#consent-start').click()
            page.wait_for_function("()=>['listening','unavailable','permission_denied','voice_error'].includes(TravelApp.getCall().phase)",timeout=150000)
            assert page.evaluate("TravelApp.getCall().phase==='listening'"),page.locator('#call-hint').inner_text()
            check(language+' actual WASM model listens',True)
            page.wait_for_function("()=>document.querySelector('#voice-level').value>0.005",timeout=15000)
            check(language+' microphone level reflects PCM energy',True)
            page.wait_for_function('({word,before})=>TravelApp.getState().history.slice(before).some(h=>h.text.toLowerCase().includes(word))',arg={'word':expected,'before':before},timeout=45000)
            check(language+' actual audio becomes saved transcript',True)
            page.wait_for_function("()=>TravelApp.getCall().phase==='listening'",timeout=15000)
            check(language+' automatically listens for the next turn',True)
            if language=='en-US':
                previous=page.evaluate('TravelApp.getState().history.length')
                page.evaluate('__playFixture()')
                page.wait_for_function('(n)=>TravelApp.getState().history.length>n',arg=previous,timeout=45000)
                check('second actual audio turn submits without Send or restarting call',True)
            check(language+' first request remains visible',bool(page.locator('#initial-request').text_content()))
            page.locator('#hangup').click()
            check(language+' microphone track stopped',page.evaluate('__fixtureTracks.every(t=>t.readyState==="ended")'))
            page.evaluate('__fixtureAudio.close()')
        check('bilingual audio builds shared trip context',page.evaluate('TravelApp.getState().facts.city==="Shanghai" && TravelApp.getState().facts.party==="with parents"'))
        check('hotel need is not confused with a booked flight',page.evaluate('TravelApp.getState().facts.hotel==="not_booked"'))
        check('final speech remains visible after hangup','地铁票' in page.locator('#messages .user').last.inner_text() and not page.locator('#live-caption').is_visible())
        check('no external speech or paid API requests',all(r.startswith(url) for r in requests))
        check('no uncaught browser errors',not errors)
        page.screenshot(path=str(OUT/'local-voice-real-asr.png'),full_page=True)
        report={'checks':checks,'state':page.evaluate('TravelApp.getState()'),'scope':'Real WASM recognition, synthetic English and Chinese audio routed through a test MediaStream. No real human microphone, noise, accent, or latency study.'}
        (OUT/'local-asr-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps({'passed':len(checks),'transcripts':[h['text'] for h in report['state']['history']]}))
        browser.close()
finally:
    if server:server.terminate();server.wait(timeout=10)
    resolved=pathlib.Path(runtime).resolve()
    assert resolved.parent==pathlib.Path(tempfile.gettempdir()).resolve() and resolved.name.startswith('vc53-asr-')
    shutil.rmtree(resolved,ignore_errors=True)
