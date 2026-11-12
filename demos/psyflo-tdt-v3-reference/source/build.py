#!/usr/bin/env python3
"""Assemble the single-file demo from src/. Run: OUT_NAME=final.html python3 build.py"""
import json, re, pathlib, os

ROOT = pathlib.Path(__file__).parent
SRC = pathlib.Path(os.environ['SRC_DIR']) if os.environ.get('SRC_DIR') else ROOT / 'src'
OUT = ROOT / 'out' / (os.environ.get('OUT_NAME') or 'prototype.html')

DC = {  # captured *.dc.html name -> route
    'Main': 'home', 'Referral': 'ref-review', 'Authorizations': 'auth-list', 'Partials': 'partials', 'Analytics': 'analytics',
    'ExtDPN': 'lauris-dpn', 'Case': 'draft-continued', 'InitialSRA': 'draft-initial', 'InfoRequest': 'info-request',
    'Submission': 'sent', 'PeerBrief': 'p2p-notes', 'ReferralForm': 'ref-form', 'FamilyLink': 'family-phone',
    'FamilyLinkSettings': 'family-settings', 'ExtScreening': 'lauris-screening', 'ExtCNA': 'lauris-cna',
    'ExtISP': 'lauris-isp', 'ExtSRA': 'lauris-dmas?case=R-0416',
}
NAV_MAP = {'Main': 'dash', 'Referral': 'ref', 'Authorizations': 'auth', 'Partials': 'di', 'Analytics': 'an'}
KIND = {'ref-form': 'public', 'family-phone': 'phone', 'lauris-home': 'ext', 'lauris-screening': 'ext', 'lauris-cna': 'ext',
        'lauris-isp': 'ext', 'lauris-sra': 'ext', 'lauris-dpn': 'ext'}


def process():
    """The captured design-board screens (platform side only; the Lauris screens are authored in src/screens)."""
    raw = json.loads((SRC / 'captured' / 'screens.json').read_text())
    out = {}
    for sid, v in raw.items():
        kind = KIND.get(sid, 'web')
        if kind == 'ext':
            continue
        html, css = v['html'], v['css']
        html = re.sub(r'<span class="sc-interp[^"]*">(.*?)</span>', r'\1', html, flags=re.S)
        html = re.sub(r'<span class="sc-interp[^"]*"></span>', '', html)
        css = re.sub(r'(^|[\s,}])body\s*\{', r'\1.psy-root{', css)
        css = re.sub(r'(^|[\s,}])html\s*\{[^}]*\}', r'\1', css)
        if kind == 'web':
            m = re.search(r'<aside style="flex: 0 0 240px.*?</aside>', html, flags=re.S)
            assert m, sid
            aside = m.group(0)
            active = ''
            for mm in re.finditer(r'<a class="nav( on)?" href="(\w+)\.dc\.html">', aside):
                if mm.group(1):
                    active = NAV_MAP.get(mm.group(2), '')
            html = html.replace(aside, '<!--SIDEBAR:%s-->' % active)
            html = re.sub(r'^(<div style="display: flex; flex-wrap: wrap; )min-height: \d+px', r'\1min-height: 100%', html)
        html = re.sub(r'href="(\w+)\.dc\.html"', lambda m: 'data-go="%s"' % DC[m.group(1)], html)
        html = re.sub(r'href="#(sign|send|up|help|privacy)"', r'data-act="frag-\1"', html)
        out[sid] = {'kind': kind, 'label': v['label'], 'title': v['title'], 'css': css, 'html': html, 'w': v['w'], 'h': v['h']}
    return out


def main():
    captured = process()
    font = (SRC / 'font.css').read_text() + (SRC / 'font-serif.css').read_text()
    shellcss = (SRC / 'shell.css').read_text()
    platcss = (SRC / 'platform.css').read_text()
    laurcss = (SRC / 'lauris.css').read_text()
    logo = (SRC / 'psyflo-logo-full-color.svg').read_text().replace('<svg ', '<svg role="img" aria-label="psyflo" ', 1)
    logo_rev = (SRC / 'psyflo-logo-full-color-reverse.svg').read_text().replace('<svg ', '<svg role="img" aria-label="psyflo" ', 1)
    parts = []
    parts.append('window.PSY=window.PSY||{};PSY.css={platform:%s,lauris:%s};PSY.assets={logo:%s,logoRev:%s};PSY.captured=%s;' % (
        json.dumps(platcss), json.dumps(laurcss), json.dumps(logo), json.dumps(logo_rev), json.dumps(captured, ensure_ascii=False)))
    for name in ['data.js', 'lauris-data.js', 'time.js', 'shell.js', 'scribe.js', 'lf-kit.js', 'reco.js', 'captured.js']:
        p = SRC / name
        if p.exists():
            parts.append('/* ---- %s ---- */\n' % name + p.read_text())
    scr = sorted((SRC / 'screens').glob('*.js'))
    for p in scr:
        parts.append('/* ---- screens/%s ---- */\n' % p.name + p.read_text())
    parts.append('PSY.boot();')
    # one <script> per source file: a syntax error in one file cannot take the others down
    js = '\n</script>\n<script>\n'.join(x.replace('</script', '<\\/script') for x in parts)
    html = f'''<meta charset="utf-8">
<title>Psyflo Harvest TDT authorization demo</title>
<style>
{font}
{shellcss}
</style>
<div id="win">
  <div id="tabs"><div class="dots"><i></i><i></i><i></i></div><div id="tabList"></div></div>
  <div id="tool">
    <button class="ib" id="tBack" title="Back"></button><button class="ib" id="tFwd" title="Forward"></button><button class="ib" id="tReload" title="Reload"></button>
    <div id="url"><span class="u"></span></div>
    <div id="extWrap"><button id="extBtn"><i></i>psyflo · <span id="extState">off</span></button><div id="extTip">Click to open Psyflo beside Lauris</div></div>
  </div>
  <div id="view"></div>
  <div id="toast"></div>
  <div id="overlay"><div id="modal"></div></div>
</div>
<script>
{js}
</script>
'''
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html)
    print('built', OUT, len(html), 'bytes;', len(captured), 'captured screens;', len(scr), 'authored files')


main()
