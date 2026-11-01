# Roll-up 85x200 cm (+3 mm afloop) in CMYK, Conneqtech huisstijl.
import sys, numpy as np
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import CMYKColor, Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from reportlab.graphics import renderPDF
from svglib.svglib import svg2rlg

import os
F=os.environ.get('CT_FONTS','fonts/')  # map met neris/*.ttf en cera/*.ttf (niet in git: licentie)
pdfmetrics.registerFont(TTFont('NerisBlack',F+'neris/Neris-Black.ttf'))
pdfmetrics.registerFont(TTFont('NerisSemi',F+'neris/Neris-SemiBold.ttf'))
pdfmetrics.registerFont(TTFont('CeraReg',F+'cera/CeraPro-Regular.ttf'))
pdfmetrics.registerFont(TTFont('CeraMed',F+'cera/CeraPro-Medium.ttf'))
pdfmetrics.registerFont(TTFont('CeraBold',F+'cera/CeraPro-Bold.ttf'))

def cmyk(c,m,y,k): return CMYKColor(c/100,m/100,y/100,k/100)
# Brandbook (jan 2026)
BLUE=(85,50,1,0); DARK=(96,65,20,4); MID=(90,56,5,0)
GL=(22,16,16,0); GM=(32,24,25,4); G=(40,31,32,10); BG=(7,5,5,0); WHITE=(0,0,0,0)
TXT=(80,60,45,60)  # donkere tekstkleur (bijna zwart, koel)
HEXMAP={'d0cfd0':GL,'d0d0d2':GL,'1e71b7':BLUE,'1f71b8':BLUE,'b5b4b3':GM,'b5b5b5':GM,
        '03558d':DARK,'0b66ab':MID,'9c9b9a':G,'9d9d9c':G,'7d7c7c':(52,43,43,30)}

W,H=856,2006   # mm incl. 3 mm afloop
out=sys.argv[1] if len(sys.argv)>1 else 'rollup-cmyk.pdf'
from reportlab.graphics import shapes as _sh
_sh.STATE_DEFAULTS['fontName']='CeraReg'
c=canvas.Canvas(out,pagesize=(W*mm,H*mm),initialFontName='CeraReg',initialFontSize=12)
c.setTrimBox((3*mm,3*mm,(W-3)*mm,(H-3)*mm)); c.setBleedBox((0,0,W*mm,H*mm))
c.setTitle('Conneqtech roll-up Fleet Expo 2026'); c.setAuthor('Conneqtech')
Y=lambda t:(H-t)*mm
X=lambda x:x*mm

def poly(pts,col):
    p=c.beginPath(); p.moveTo(X(pts[0][0]),Y(pts[0][1]))
    for x,y in pts[1:]: p.lineTo(X(x),Y(y))
    p.close(); c.setFillColor(cmyk(*col)); c.drawPath(p,stroke=0,fill=1)

def text(s,x,top,font,size,col,ls=0,anchor='l'):
    c.setFillColor(cmyk(*col))
    w=pdfmetrics.stringWidth(s,font,size*mm)+ls*mm*(len(s)-1)
    if anchor=='c': x=x-w/mm/2
    t=c.beginText(); t.setFont(font,size*mm); t.setCharSpace(ls*mm)
    asc=pdfmetrics.getFont(font).face.ascent/1000
    t.setTextOrigin(X(x),Y(top+size*asc*0.92)); t.textOut(s); c.drawText(t); return w/mm

# --- achtergrondvlakken (grijs) ---
poly([(W*0.62,0),(W,0),(W,300)],GL)
poly([(W*0.80,0),(W,0),(W,150)],BG)

# --- logo (vector, uit CONNEQTECH_LOGO_Q_DEF.svg) ---
d=svg2rlg('logo.svg')
def recolor(n):
    for ch in getattr(n,'contents',[]) or []: recolor(ch)
    fc=getattr(n,'fillColor',None)
    if fc is not None and hasattr(fc,'hexval'):
        hx=fc.hexval()[2:].lower()
        if hx in HEXMAP: n.fillColor=cmyk(*HEXMAP[hx])
        else: raise SystemExit('onbekende logokleur '+hx)
recolor(d)
bx0,by0,bx1,by1=d.getBounds()
LW=650; s=LW*mm/(bx1-bx0); lx,ltop=103,92
c.saveState(); c.translate(X(lx)-bx0*s, Y(ltop)-by1*s); c.scale(s,s)
renderPDF.draw(d,c,0,0); c.restoreState()

# --- fotoblok met blauw verloop (gerasterd in CMYK, overlay met exacte merkwaarden) ---
PT,PH=330,820; PPM=3.0
pw,ph=int(W*PPM),int(PH*PPM)
src=Image.open('photo-src.jpg').convert('RGB')
bh=1050; bw=bh*src.width/src.height
ox=(W-bw)*0.22; oy=(PH-bh)*0.40
im=src.resize((int(bw*PPM),int(bh*PPM)),Image.LANCZOS)
canvas_rgb=Image.new('RGB',(pw,ph)); canvas_rgb.paste(im,(int(ox*PPM),int(oy*PPM)))
a=np.asarray(canvas_rgb).astype(np.float32)/255
k=1-a.max(axis=2); den=np.maximum(1-k,1e-6)
cc=(1-a[...,0]-k)/den; mm_=(1-a[...,1]-k)/den; yy=(1-a[...,2]-k)/den
# lichte GCR: deel van K terug naar CMY voor rijkere donkers
img=np.stack([cc*(1-k)+k*0.55, mm_*(1-k)+k*0.45, yy*(1-k)+k*0.40, k*0.85],axis=2)
img=np.clip(img*0.92,0,1)  # licht ontzadigen
def blend(img,col,alpha):
    col=np.array(col,np.float32)/100
    return img*(1-alpha[...,None])+col*alpha[...,None]
ys=np.linspace(0,1,ph)[:,None]*np.ones((1,pw)); xs=np.ones((ph,1))*np.linspace(0,1,pw)[None,:]
def ramp(t,stops):
    tp=[s[0] for s in stops]; vp=[s[1] for s in stops]; return np.interp(t,tp,vp)
# verticaal: transparant boven -> diep blauw onder
a1=ramp(ys,[(0,.05),(.35,.15),(.68,.85),(1,.97)])
img=blend(img,BLUE,a1); img=blend(img,DARK,np.clip((ys-.6)/.4,0,1)*.85)
a2=ramp(xs,[(0,.55),(.6,0),(1,0)]); img=blend(img,DARK,a2)
cm=Image.fromarray((np.clip(img,0,1)*255).astype(np.uint8),'CMYK')
p=c.beginPath(); pts=[(0,PT+0.09*PH),(W,PT),(W,PT+0.91*PH),(0,PT+PH)]
p.moveTo(X(pts[0][0]),Y(pts[0][1]))
for x,y in pts[1:]: p.lineTo(X(x),Y(y))
p.close()
c.saveState(); c.clipPath(p,stroke=0,fill=0)
c.drawImage(ImageReader(cm),0,Y(PT+PH),W*mm,PH*mm); c.restoreState()

# pil-label
lbl='FLEET EXPO 2026'; fs=26; ls=5
tw=pdfmetrics.stringWidth(lbl,'CeraMed',fs*mm)/mm+ls*(len(lbl)-1)
c.setStrokeColor(cmyk(*WHITE)); c.setLineWidth(2.6*mm)
c.roundRect(X(68),Y(668+fs+18),(tw+52)*mm,(fs+18)*mm,(fs+18)/2*mm,stroke=1,fill=0)
text(lbl,68+26,668+9.5,'CeraMed',fs,WHITE,ls)

# kop
lines=['Efficiënter werken.','Minder fouten.','Meer resultaat.']
maxw=720; hs=200
while max(pdfmetrics.stringWidth(l,'NerisBlack',hs*mm) for l in lines)/mm>maxw: hs-=1
for i,l in enumerate(lines): text(l,68,768+i*hs*1.05,'NerisBlack',hs,WHITE)
HEAD=hs

# grijze driehoek linksonder
poly([(0,1476),(W*0.45,H),(0,H)],BG)

# producten
text('Slimme integraties met',68,1158,'NerisSemi',40,BLUE)
names=['RentWise','LeaseWise','Plan-IT']; cols=[BLUE,MID,DARK]
gap=18; bw_=(720-2*gap)/3; ps=48
while max(pdfmetrics.stringWidth(n,'NerisBlack',ps*mm) for n in names)/mm>bw_-36: ps-=1
for i,(n,col) in enumerate(zip(names,cols)):
    x=68+i*(bw_+gap); c.setFillColor(cmyk(*col))
    c.roundRect(X(x),Y(1225+115),bw_*mm,115*mm,57.5*mm,stroke=0,fill=1)
    asc=pdfmetrics.getFont('NerisBlack').face.ascent/1000
    capH=ps*0.70
    c.setFillColor(cmyk(*WHITE)); c.setFont('NerisBlack',ps*mm)
    c.drawCentredString(X(x+bw_/2),Y(1225+57.5+capH/2),n)

# voordelen
items=['Actuele voertuigdata, automatisch','Minder handmatige invoer','Snellere werkprocessen','Grip op wagenpark & kosten']
rh=78; top0=1385
for i,s in enumerate(items):
    cy=top0+i*rh+rh/2
    c.setStrokeColor(cmyk(*BLUE)); c.setLineWidth(3.4*mm); c.setFillColor(cmyk(*WHITE))
    c.circle(X(68+28),Y(cy),26.3*mm,stroke=1,fill=1)
    c.setLineCap(1); c.setLineJoin(1); c.setLineWidth(4.2*mm)
    pth=c.beginPath(); pth.moveTo(X(68+28-11),Y(cy+0.5)); pth.lineTo(X(68+28-3.5),Y(cy+8)); pth.lineTo(X(68+28+12),Y(cy-8)); c.drawPath(pth,stroke=1,fill=0)
    c.setFillColor(cmyk(*TXT)); c.setFont('CeraMed',37*mm)
    c.drawString(X(68+56+26),Y(cy+37*0.36),s)
    if i<len(items)-1:
        c.setStrokeColor(cmyk(*GL)); c.setLineWidth(1.2*mm); c.setLineCap(0)
        c.line(X(68),Y(top0+(i+1)*rh),X(68+720),Y(top0+(i+1)*rh))

# hoekdriehoeken + CTA-band
poly([(W,1520),(W,H),(W-300,H)],MID)
poly([(W,1690),(W,H),(W-180,H)],DARK)
poly([(0,1712),(W,1747),(W,H),(0,H)],BLUE)
cta='Bespaar tijd en kosten. Vraag ons hoe!'; cs=60
while pdfmetrics.stringWidth(cta,'NerisBlack',cs*mm)/mm>720: cs-=1
text(cta,68,1768,'NerisBlack',cs,WHITE)
text('www.conneqtech.com',68,1838,'CeraMed',30,WHITE)
c.showPage(); c.save(); print('ok',out,'kop',HEAD,'prod',ps)
