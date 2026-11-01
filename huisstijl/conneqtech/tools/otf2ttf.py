import sys
from fontTools.ttLib import TTFont, newTable
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
def conv(src,dst):
    f=TTFont(src); gs=f.getGlyphSet(); glyf={}
    for n in f.getGlyphOrder():
        p=TTGlyphPen(gs); gs[n].draw(Cu2QuPen(p,1.0,reverse_direction=True)); glyf[n]=p.glyph()
    del f['CFF ']; 
    if 'VORG' in f: del f['VORG']
    f['loca']=newTable('loca'); t=f['glyf']=newTable('glyf'); t.glyphOrder=f.getGlyphOrder(); t.glyphs=glyf
    f['maxp'].tableVersion=0x00010000
    for a in ['maxZones','maxTwilightPoints','maxStorage','maxFunctionDefs','maxInstructionDefs','maxStackElements','maxSizeOfInstructions','maxComponentElements']: setattr(f['maxp'],a,0)
    f['maxp'].maxZones=1
    f['head'].glyphDataFormat=0
    post=f['post']; post.formatType=2.0; post.extraNames=[]; post.mapping={}; post.glyphOrder=f.getGlyphOrder()
    f.sfntVersion='\x00\x01\x00\x00'; f.save(dst)
for s in sys.argv[1:]: conv(s, s.replace('.otf','.ttf'))
