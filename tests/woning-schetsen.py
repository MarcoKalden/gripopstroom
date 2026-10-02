#!/usr/bin/env python3
"""Tekent de voorbeeldwoning (tussenwoning, circa 1980) per stap als SVG-schets.

Deze schetsen staan op de site tot de fotorealistische renders er zijn
(zie REDESIGN.md §4b en assets/woning/LEESMIJ.md). Dezelfde compositie dient
als voorbeeld voor wie de renders maakt. Geen warmtepomp in beeld.

Gebruik: python3 tests/woning-schetsen.py
"""
import os

W, H = 1600, 1000
SKY, SKY2 = '#DCE8E8', '#C9DCDD'
BRICK, BRICK_L, MORTAR = '#8E4F3E', '#7A4334', '#A9685A'
NEIGH, NEIGH_R = '#B9A49C', '#5E6670'
ROOF, ROOF_L = '#3B4149', '#2E3339'
GLASS, GLOW = '#A9C3CC', '#F3C979'
GREEN, NAVY = '#1F7A63', '#0A2A5E'

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'woning')


def brick_rows(x, y, w, h, color=MORTAR):
    return ''.join(
        f'<line x1="{x}" y1="{y + i * 16 + 16}" x2="{x + w}" y2="{y + i * 16 + 16}" stroke="{color}" stroke-width="1.2" opacity=".55"/>'
        for i in range(int(h // 16)))


def window(x, y, w, h, new, glow=True):
    frame = '#FFFFFF' if new else '#8A7562'
    fw = 7 if new else 11
    gx, gy, gw, gh = x + fw, y + fw, w - 2 * fw, h - 2 * fw
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{frame}" rx="2"/>'
    s += f'<rect x="{gx}" y="{gy}" width="{gw}" height="{gh}" fill="{GLASS}"/>'
    if glow:
        s += f'<rect x="{gx}" y="{gy + gh * 0.35}" width="{gw}" height="{gh * 0.65}" fill="{GLOW}" opacity=".75"/>'
    s += f'<rect x="{x + w / 2 - fw / 2}" y="{y}" width="{fw}" height="{h}" fill="{frame}"/>'
    if new:
        s += f'<line x1="{gx + 8}" y1="{gy + gh - 10}" x2="{gx + gw * 0.4}" y2="{gy + 10}" stroke="#FFFFFF" stroke-width="3" opacity=".5"/>'
    s += f'<rect x="{x - 6}" y="{y + h}" width="{w + 12}" height="8" fill="#D9D4CC"/>'
    return s


def house(o):
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">']
    s.append(f'<rect width="{W}" height="{H}" fill="{SKY}"/><rect width="{W}" height="260" fill="{SKY2}" opacity=".6"/>')
    for cx, cy, r in [(180, 420, 120), (1450, 400, 140), (1300, 450, 90)]:
        s.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#9DB7A8" opacity=".7"/>')
    # grond, oprit, voortuin
    s.append(f'<rect y="760" width="{W}" height="240" fill="#B9C6BF"/>')
    s.append('<polygon points="900,760 1240,760 1460,1000 980,1000" fill="#C8C3BA"/>')
    s.append('<rect x="300" y="760" width="560" height="60" fill="#7FA286"/>')
    s.append('<rect x="300" y="742" width="560" height="26" rx="13" fill="#5F8A6A"/>')
    # buren links en rechts
    for x0, w0, wx in [(0, 300, 70), (1240, 360, 1330)]:
        s.append(f'<rect x="{x0}" y="380" width="{w0}" height="380" fill="{NEIGH}"/>{brick_rows(x0, 380, w0, 380, "#A5908A")}')
        s.append(f'<polygon points="{x0},380 {x0 + w0},380 {x0 + w0},230 {x0},230" fill="{NEIGH_R}"/>')
        s.append(window(wx, 470, 165, 120, False, glow=False))
    # open carport rechts van de woning
    s.append('<rect x="900" y="520" width="340" height="16" fill="#E9ECEB"/><rect x="1210" y="536" width="16" height="224" fill="#E9ECEB"/>')
    # woning en dak
    s.append(f'<rect x="300" y="380" width="600" height="380" fill="{BRICK}"/>{brick_rows(300, 380, 600, 380)}')
    s.append(f'<rect x="300" y="560" width="600" height="10" fill="{BRICK_L}"/>')
    s.append(f'<polygon points="290,382 910,382 860,200 340,200" fill="{ROOF}"/>')
    for i in range(1, 8):
        y = 200 + i * 23
        d = (i * 23) * 50 / 182
        s.append(f'<line x1="{340 - d}" y1="{y}" x2="{860 + d}" y2="{y}" stroke="{ROOF_L}" stroke-width="2"/>')
    s.append('<rect x="280" y="376" width="640" height="12" fill="#E6E6E2"/>')
    if o.get('isolatie'):
        s.append(f'<polygon points="340,200 470,200 440,382 300,382" fill="#F0D36E" stroke="{GREEN}" stroke-width="3"/>')
        s.extend(f'<line x1="{310 + i * 18}" y1="380" x2="{350 + i * 16}" y2="204" stroke="#D9B13F" stroke-width="3"/>' for i in range(8))
        s.append(f'<rect x="300" y="760" width="600" height="26" fill="#F0D36E" stroke="{GREEN}" stroke-width="3"/>')
        s.extend(f'<line x1="{304 + i * 20}" y1="784" x2="{316 + i * 20}" y2="762" stroke="#D9B13F" stroke-width="3"/>' for i in range(30))
    if o.get('zon'):
        for r in range(2):
            for c in range(5):
                x, y = 372 + c * 92 - r * 12, 222 + r * 72
                s.append(f'<rect x="{x}" y="{y}" width="84" height="62" rx="3" fill="#15191E" stroke="#3E4650" stroke-width="2"/>')
                s.append(f'<line x1="{x + 42}" y1="{y}" x2="{x + 42}" y2="{y + 62}" stroke="#2A3038" stroke-width="1.5"/><line x1="{x}" y1="{y + 31}" x2="{x + 84}" y2="{y + 31}" stroke="#2A3038" stroke-width="1.5"/>')
    new = o.get('kozijnen', False)
    s.append(window(350, 415, 230, 120, new))
    s.append(window(620, 415, 230, 120, new))
    s.append(window(520, 610, 330, 130, new))
    s.append(f'<rect x="360" y="600" width="110" height="160" fill="{"#FFFFFF" if new else "#8A7562"}"/>')
    s.append(f'<rect x="372" y="612" width="86" height="148" fill="{NAVY if new else "#6B5545"}"/>')
    s.append(f'<rect x="388" y="630" width="54" height="40" fill="{GLOW}" opacity=".8"/><circle cx="446" cy="700" r="4" fill="#D9D4CC"/>')
    s.append('<rect x="355" y="760" width="120" height="10" fill="#9C9C96"/>')
    if o.get('batterij'):
        s.append('<rect x="920" y="590" width="70" height="110" rx="8" fill="#FAFAF8" stroke="#C9CFCD" stroke-width="2"/>')
        s.append(f'<rect x="946" y="606" width="18" height="6" rx="3" fill="{GREEN}"/>')
    if o.get('airco'):
        s.append('<rect x="1090" y="600" width="104" height="72" rx="6" fill="#F2F3F1" stroke="#C3C9C7" stroke-width="2"/>')
        s.append('<circle cx="1120" cy="636" r="24" fill="#DDE2E0" stroke="#AEB6B3" stroke-width="2"/>')
        s.extend(f'<line x1="1152" y1="{614 + i * 11}" x2="1184" y2="{614 + i * 11}" stroke="#AEB6B3" stroke-width="2"/>' for i in range(5))
        s.append('<line x1="1092" y1="672" x2="1092" y2="690" stroke="#8D9592" stroke-width="4"/><line x1="1192" y1="672" x2="1192" y2="690" stroke="#8D9592" stroke-width="4"/>')
    if o.get('laadpaal'):
        s.append(f'<rect x="488" y="630" width="26" height="54" rx="6" fill="#FAFAF8" stroke="#C9CFCD" stroke-width="2"/><circle cx="501" cy="648" r="5" fill="{GREEN}"/>')
        s.append('<path d="M501 684 C 520 780, 700 820, 905 830" fill="none" stroke="#2E3339" stroke-width="5"/>')
        s.append('<path d="M930 900 L930 840 Q940 800 990 790 L1060 760 Q1100 748 1160 748 L1230 748 Q1280 750 1300 790 L1330 840 L1330 900 Z" fill="#3E5F7A"/>')
        s.append(f'<path d="M1010 788 L1068 764 Q1100 756 1150 756 L1150 790 Z" fill="{GLASS}"/><path d="M1162 756 L1228 756 Q1262 760 1278 790 L1162 790 Z" fill="{GLASS}"/>')
        s.append('<circle cx="1010" cy="905" r="38" fill="#1E2328"/><circle cx="1010" cy="905" r="16" fill="#9AA3A8"/><circle cx="1250" cy="905" r="38" fill="#1E2328"/><circle cx="1250" cy="905" r="16" fill="#9AA3A8"/>')
    s.append('</svg>')
    return ''.join(s)


STEPS = {
    'woning-stap-0-start': {},
    'woning-stap-1-kozijnen': {'kozijnen': True},
    'woning-stap-2-isolatie': {'kozijnen': True, 'isolatie': True},
    'woning-stap-3-zonnepanelen': {'kozijnen': True, 'zon': True},
    'woning-stap-4-thuisbatterij': {'kozijnen': True, 'zon': True, 'batterij': True},
    'woning-stap-5-laadpaal': {'kozijnen': True, 'zon': True, 'batterij': True, 'laadpaal': True},
    'woning-totaal': {'kozijnen': True, 'zon': True, 'batterij': True, 'laadpaal': True, 'airco': True},
}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, opts in STEPS.items():
        with open(os.path.join(OUT, name + '.svg'), 'w') as f:
            f.write(house(opts))
    print('Geschreven: %d schetsen in assets/woning/' % len(STEPS))
