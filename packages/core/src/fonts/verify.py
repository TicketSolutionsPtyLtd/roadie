#!/usr/bin/env python3
"""Prove tnum works and default rendering is unchanged. HarfBuzz shaping, no browser."""
import sys, uharfbuzz as hb
from fontTools.ttLib import TTFont

UPEM_SCALE = 2048

def as_sfnt(path):
    """HarfBuzz has no woff2 decoder; round-trip through fontTools."""
    import io
    tt = TTFont(path); tt.flavor = None
    buf = io.BytesIO(); tt.save(buf)
    return buf.getvalue()


def shaper(path):
    face = hb.Face(as_sfnt(path)); font = hb.Font(face)
    font.scale = (UPEM_SCALE, UPEM_SCALE)
    order = TTFont(path).getGlyphOrder()
    def shape(text, features=None, variations=None):
        if variations:
            font.set_variations(variations)
        else:
            font.set_variations({"wght": 400, "opsz": 14})
        buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
        hb.shape(font, buf, features or {})
        return [(order[i.codepoint], p.x_advance)
                for i, p in zip(buf.glyph_infos, buf.glyph_positions)]
    return shape

def report(label, path):
    shape = shaper(path)
    print(f"\n### {label}  ({path})")
    for name, feats in (("default", None), ("tnum", {"tnum": True})):
        adv = [w for _, w in shape("0123456789", feats)]
        print(f"  {name:8} advances {adv}  uniform={len(set(adv))==1}")
    print(f"  0 default={shape('0')[0][1]}  0 tnum={shape('0',{'tnum':True})[0][1]}")
    print(f"  1 default={shape('1')[0][1]}  1 tnum={shape('1',{'tnum':True})[0][1]}")
    for w in (100, 400, 900):
        adv = [a for _, a in shape("0123456789", {"tnum": True}, {"wght": w, "opsz": 14})]
        print(f"  tnum @wght{w:3} uniform={len(set(adv)) == 1} ({adv[0]})")
    return shape

def compare_defaults(a, b):
    text = ("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
            " !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~‘’“”‚„")
    ga = [g for g, _ in a(text)]
    gb = [g for g, _ in b(text)]
    wa = [w for _, w in a(text)]
    wb = [w for _, w in b(text)]
    same = wa == wb
    print(f"\n### default rendering unchanged: advances identical = {same}")
    print(f"###   same glyph sequence length = {len(ga) == len(gb)}")
    if not same:
        for i, c in enumerate(text):
            if wa[i] != wb[i]:
                print(f"   {c!r}: {ga[i]}({wa[i]}) -> {gb[i]}({wb[i]})")

old = report("BEFORE (shipped)", sys.argv[1])
new = report("AFTER (rebuilt)", sys.argv[2])
compare_defaults(old, new)
