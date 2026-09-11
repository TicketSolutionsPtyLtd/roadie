#!/usr/bin/env python3
"""Build Intermission (Oztix's Inter) from stock Inter.

Pipeline: pyftfeatfreeze -> repair_frozen_alternates -> pyftsubset(woff2)

Why the repair pass: pyftfeatfreeze freezes a character variant by repointing
cmap at the alternate glyph (U+0031 -> one.ss01). It does not rewrite GSUB, so
every single-substitution lookup still keyed on the pre-freeze glyph name
(`one` -> `one.tf`) becomes unreachable. That silently kills tnum, pnum, numr,
dnom, subs, sups... for the frozen glyphs only. The pass re-adds those entries
under the frozen glyph names.
"""
import argparse, subprocess, sys
from pathlib import Path
from fontTools.ttLib import TTFont

FREEZE_FEATURES = "case,ss03,cv01,cv02,cv03,cv04,cv05,cv08,cv09,cv10,cv11"
UNICODES = "U+0020-007F,U+2018-201F"
RENAME = "Inter Variable/Intermission,InterVariable/Intermission"


def suffixes(name):
    base, _, rest = name.partition(".")
    return base, frozenset(rest.split(".")) if rest else frozenset()


def single_subst_subtables(font):
    if "GSUB" not in font:
        return
    gsub = font["GSUB"].table
    for record in gsub.FeatureList.FeatureRecord:
        for index in record.Feature.LookupListIndex:
            for subtable in gsub.LookupList.Lookup[index].SubTable:
                if getattr(subtable, "mapping", None) is not None:
                    yield record.FeatureTag, subtable


def repair_frozen_alternates(font, stock_cmap, only=None):
    """Re-key single substitutions onto the glyphs freezing put in cmap."""
    frozen = {
        stock: font.getBestCmap()[cp]
        for cp, stock in stock_cmap.items()
        if cp in font.getBestCmap() and font.getBestCmap()[cp] != stock
    }
    by_shape = {}
    for name in font.getGlyphOrder():
        by_shape.setdefault(suffixes(name), name)

    added = []
    for tag, subtable in single_subst_subtables(font):
        if only and tag not in only:
            continue
        for stock, frozen_glyph in frozen.items():
            target = subtable.mapping.get(stock)
            if target is None or frozen_glyph in subtable.mapping:
                continue
            base, target_sfx = suffixes(target)
            wanted = by_shape.get((base, target_sfx | suffixes(frozen_glyph)[1]))
            if wanted and wanted != frozen_glyph:
                subtable.mapping[frozen_glyph] = wanted
                added.append((tag, frozen_glyph, wanted))
    return added


def run(cmd):
    print("  $", " ".join(str(c) for c in cmd))
    subprocess.run(cmd, check=True)


def build(stock, out_woff2, workdir, bindir, repair_features):
    frozen_ttf = workdir / (out_woff2.stem + ".ttf")
    run([bindir / "pyftfeatfreeze", "-f", FREEZE_FEATURES, "-R", RENAME,
         str(stock), str(frozen_ttf)])

    # The repair works by diffing the frozen cmap against the stock one, so the
    # input must be the pre-freeze font. Handing it an already-frozen file
    # would compare that file with itself and repair nothing.
    stock_cmap = TTFont(stock).getBestCmap()
    font = TTFont(frozen_ttf)
    added = repair_frozen_alternates(font, stock_cmap, repair_features)
    print(f"  repaired {len(added)} substitutions:")
    for tag, src, dst in added:
        print(f"    {tag}: {src} -> {dst}")
    font.save(frozen_ttf)

    run([bindir / "pyftsubset", str(frozen_ttf),
         f"--output-file={out_woff2}", "--flavor=woff2",
         f"--unicodes={UNICODES}", "--layout-features=*", "--no-hinting"])


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--roman", required=True, help="stock InterVariable.ttf")
    p.add_argument("--italic", required=True, help="stock InterVariable-Italic.ttf")
    p.add_argument("--outdir", default="dist")
    p.add_argument("--workdir", default="build")
    p.add_argument("--bindir", default=str(Path(sys.executable).parent))
    p.add_argument("--repair-features", default="*",
                   help='comma-separated feature tags to repair, or "*" for all '
                        '(tnum alone costs ~0.3KB; all costs ~3KB)')
    a = p.parse_args()

    outdir, workdir, bindir = Path(a.outdir), Path(a.workdir), Path(a.bindir)
    outdir.mkdir(parents=True, exist_ok=True)
    workdir.mkdir(parents=True, exist_ok=True)
    for src, name in ((a.roman, "Intermission.woff2"), (a.italic, "Intermission-Italic.woff2")):
        print(f"\n== {name}")
        build(Path(src), outdir / name, workdir, bindir,
              None if a.repair_features == "*" else set(a.repair_features.split(",")))


if __name__ == "__main__":
    main()
