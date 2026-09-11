"""Confirm the default (feature-off) glyph outlines are byte-identical old vs new."""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen

a, b = TTFont(sys.argv[1]), TTFont(sys.argv[2])
ga, gb = a.getGlyphSet(), b.getGlyphSet()
ca, cb = a.getBestCmap(), b.getBestCmap()
assert set(ca) == set(cb), (set(ca) ^ set(cb))
bad = []
for cp in sorted(ca):
    pa, pb = DecomposingRecordingPen(ga), DecomposingRecordingPen(gb)
    ga[ca[cp]].draw(pa); gb[cb[cp]].draw(pb)
    if pa.value != pb.value:
        bad.append(cp)
print(f"codepoints compared: {len(ca)}  outline mismatches: {len(bad)}",
      [hex(c) for c in bad])
