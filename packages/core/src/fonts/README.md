# Intermission

Intermission is Oztix version of Inter. It's has certain open type features enabled by default to improve legibility and aesthetics.

It's also a subset of Inter that only includes the weights and character sets we use across Oztix products, which helps reduce file size.

## How to replicate creation of Intermission

1. Download the latest version of Inter from [rsms.me/inter](https://rsms.me/inter/).
2. Use [Fonttools OpenType Feature Freezer](https://twardoch.github.io/fonttools-opentype-feature-freezer/) with the following settings:
   - Features to freeze: `case,ss03,cv01,cv02,cv03,cv04,cv05,cv08,cv09,cv10,cv11`
   - Output format: `ttf`
3. Use fonttools to subset the fonts to Basic Latin (U+0020-007F) and convert to WOFF2:
   ```bash
   # Install fonttools (one-time setup)
   brew install fonttools

   # Subset both regular and italic variants
   pyftsubset Intermission.ttf \
     --output-file=Intermission.woff2 \
     --flavor=woff2 \
     --unicodes="U+0020-007F,U+2018-201F" \
     --layout-features="*" \
     --no-hinting

   pyftsubset Intermission-Italic.ttf \
     --output-file=Intermission-Italic.woff2 \
     --flavor=woff2 \
     --unicodes="U+0020-007F,U+2018-201F" \
     --layout-features="*" \
     --no-hinting
   ```

   This preserves the variable font axes (weight: 100-900, optical size: 14-32) while reducing file size by including only:
   - Basic Latin characters (U+0020-007F)
   - Typographic quotes (U+2018-201F): ' ' " "

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
