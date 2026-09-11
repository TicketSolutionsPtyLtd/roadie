# Intermission

Intermission is Oztix version of Inter. It's has certain open type features enabled by default to improve legibility and aesthetics.

It's also a subset of Inter that only includes the weights and character sets we use across Oztix products, which helps reduce file size.

## How to replicate creation of Intermission

Run `build_intermission.py`. It performs three steps: feature freeze, an
alternate-substitution repair pass, then subset + WOFF2.

```bash
pip install fonttools brotli opentype-feature-freezer

python build_intermission.py \
  --roman  InterVariable.ttf \
  --italic InterVariable-Italic.ttf \
  --outdir .
```

Stock Inter comes from [rsms.me/inter](https://rsms.me/inter/); the current
build is Inter 4.001 (release v4.1, `git-9221beed3`).

### Why the repair pass exists

`pyftfeatfreeze` freezes a character variant by repointing **cmap** at the
alternate glyph — U+0031 stops mapping to `one` and maps to `one.ss01`. It does
not rewrite GSUB. Every single-substitution lookup still keyed on the
pre-freeze glyph name therefore stops matching.

Because Intermission freezes cv01/cv02/cv03/cv04 (alternate 1, open 4, open 6,
open 9), `tnum` lost its entries for exactly those four digits: `tnum` mapped
`one -> one.tf`, but the text now contains `one.ss01`, which has no entry. The
result was tabular figures that lined up 0 2 3 5 7 8 and left 1 4 6 9 at their
proportional widths — silently broken digit alignment in tables, countdowns and
currency columns. `numr`, `dnom`, `subs`, `sups` and `sinf` were broken the
same way.

The repair pass re-keys those substitutions onto the frozen glyph names
(`one.ss01 -> one.tf.ss01`). It only _adds_ entries, and only to features that
are off by default, so default rendering is unchanged.

### Verifying a build

```bash
python verify.py <old.woff2> <new.woff2>   # tnum advances, at wght 100/400/900
python outline_diff.py <old.woff2> <new.woff2>   # default outlines must match
```

All ten digits must report a single uniform advance under `tnum`, and
`outline_diff.py` must report 0 mismatches against the previous release.

### OpenType features enabled

Explore settings on the [Inter Labs website](https://rsms.me/inter/lab/?feat-case=1&feat-cv01=1&feat-cv02=1&feat-cv03=1&feat-cv04=1&feat-cv05=1&feat-cv08=1&feat-cv09=1&feat-cv10=1&feat-cv11=1&feat-ss03=1&opsz=23.64&sample=English&size=72)

#### Features

- **case**: Case-Sensitive Forms

#### Stylistic Sets

- **ss03**: Round quotes & commas

#### Character Variants

- **cv01**: Alternate one
- **cv02**: Open four
- **cv03**: Open six
- **cv04**: Open nine
- **cv05**: Lower case L with tail
- **cv08**: Upper-case i with serif
- **cv09**: Flat top three
- **cv10**: Capital G with spur
- **cv11**: Single-storey a
- **cv12**: Compact f
- **cv13**: Compact t
