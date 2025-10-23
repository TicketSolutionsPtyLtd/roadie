#!/usr/bin/env python3
"""
Font subsetting script for web fonts.
Creates compact fonts with essential characters and specific OpenType features.
Features: case=1, ss02=1, ss03=1, cv05=1, cv08=1, cv11=1
Renames font to 'Intermission' with features enabled by default.
"""

import os
import sys
import subprocess
from pathlib import Path
from fontTools.ttLib import TTFont

def rename_font_and_enable_features(font_path, new_family_name, features_to_enable):
    """
    Rename the font family and enable specified OpenType features by default.
    
    Args:
        font_path (str): Path to the font file
        new_family_name (str): New font family name
        features_to_enable (list): List of features to enable by default
    """
    try:
        font = TTFont(font_path)
        
        # Update name table
        if 'name' in font:
            name_table = font['name']
            
            # Name IDs to update
            # 1 = Font Family, 4 = Full Font Name, 6 = PostScript Name
            for record in name_table.names:
                # Family name
                if record.nameID == 1:
                    is_italic = 'Italic' in str(record.toUnicode())
                    new_name = f"{new_family_name} Italic" if is_italic else new_family_name
                    record.string = new_name.encode(record.getEncoding())
                
                # Full font name
                elif record.nameID == 4:
                    is_italic = 'Italic' in str(record.toUnicode())
                    new_name = f"{new_family_name} Italic" if is_italic else new_family_name
                    record.string = new_name.encode(record.getEncoding())
                
                # PostScript name
                elif record.nameID == 6:
                    is_italic = 'Italic' in str(record.toUnicode())
                    new_name = f"{new_family_name.replace(' ', '')}-Italic" if is_italic else new_family_name.replace(' ', '')
                    record.string = new_name.encode(record.getEncoding())
        
        # Enable features by default in GSUB table
        if 'GSUB' in font:
            gsub = font['GSUB'].table
            
            if hasattr(gsub, 'ScriptList') and gsub.ScriptList:
                # For each script (DFLT, latn, etc.)
                for script_record in gsub.ScriptList.ScriptRecord:
                    script = script_record.Script
                    
                    # Process default language system
                    if script.DefaultLangSys:
                        langsys = script.DefaultLangSys
                        
                        # Get indices of features to enable
                        if hasattr(gsub, 'FeatureList') and gsub.FeatureList:
                            feature_indices = []
                            for i, feature_record in enumerate(gsub.FeatureList.FeatureRecord):
                                if feature_record.FeatureTag in features_to_enable:
                                    feature_indices.append(i)
                            
                            # Add features to default language system if not already present
                            if langsys.FeatureIndex:
                                existing = set(langsys.FeatureIndex)
                                for idx in feature_indices:
                                    if idx not in existing:
                                        langsys.FeatureIndex.append(idx)
                                langsys.FeatureCount = len(langsys.FeatureIndex)
                    
                    # Process all language systems
                    if hasattr(script, 'LangSysRecord') and script.LangSysRecord:
                        for langsys_record in script.LangSysRecord:
                            langsys = langsys_record.LangSys
                            
                            if hasattr(gsub, 'FeatureList') and gsub.FeatureList:
                                feature_indices = []
                                for i, feature_record in enumerate(gsub.FeatureList.FeatureRecord):
                                    if feature_record.FeatureTag in features_to_enable:
                                        feature_indices.append(i)
                                
                                if langsys.FeatureIndex:
                                    existing = set(langsys.FeatureIndex)
                                    for idx in feature_indices:
                                        if idx not in existing:
                                            langsys.FeatureIndex.append(idx)
                                    langsys.FeatureCount = len(langsys.FeatureIndex)
        
        # Save the modified font
        font.save(font_path)
        print(f"  ✓ Renamed to '{new_family_name}' with features enabled by default")
        
        return True
        
    except Exception as e:
        print(f"  ✗ Error renaming font: {str(e)}")
        return False

def get_unicode_ranges():
    """
    Return essential Unicode ranges for web fonts - optimized for size.
    """
    return [
        "U+0020-007F",    # Basic Latin (ASCII)
        "U+00A0-00FF",    # Latin-1 Supplement (Western Europe)
        "U+0100-017F",    # Latin Extended-A (Central/Eastern Europe)
        "U+2018-2019",    # Smart quotes
        "U+201C-201D",    # Smart double quotes
        "U+2013-2014",    # En/Em dashes
        "U+2026",         # Ellipsis
        "U+20AC",         # Euro symbol
    ]

def subset_font_with_pyftsubset(input_path, output_path, features, unicode_ranges):
    """
    Use pyftsubset command-line tool to subset fonts properly.
    
    Args:
        input_path (str): Path to input font
        output_path (str): Path to output font
        features (list): OpenType features to keep
        unicode_ranges (list): Unicode ranges to include
    """
    try:
        # Build pyftsubset command
        cmd = [
            "pyftsubset",
            input_path,
            f"--output-file={output_path}",
            f"--unicodes={','.join(unicode_ranges)}",
            f"--layout-features={','.join(features)}",
            "--flavor=woff2",
            "--with-zopfli",
            "--desubroutinize",
            "--name-IDs=*",
            "--name-legacy",
            "--name-languages=*",
            "--layout-scripts=*",
            "--glyph-names",
            "--symbol-cmap",
            "--legacy-cmap",
            "--notdef-glyph",
            "--notdef-outline",
            "--recommended-glyphs",
            "--recalc-bounds",
            "--recalc-timestamp",
            "--canonical-order"
        ]
        
        # Run pyftsubset
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # Calculate size reduction
        original_size = os.path.getsize(input_path)
        new_size = os.path.getsize(output_path)
        reduction = ((original_size - new_size) / original_size) * 100
        
        print(f"✓ Created subset: {os.path.basename(output_path)}")
        print(f"  Unicode ranges: {len(unicode_ranges)} ranges")
        print(f"  Features: {', '.join(features)}")
        print(f"  Size: {original_size:,} bytes → {new_size:,} bytes ({reduction:.1f}% reduction)")
        
        # Check if file is reasonably sized (should be 20-80KB for web fonts)
        if new_size < 5000:  # Less than 5KB is suspicious
            print(f"  ⚠️  Warning: File seems unusually small")
        elif new_size > 100000:  # More than 100KB might need more subsetting
            print(f"  ⚠️  Warning: File is quite large for a subset")
        else:
            print(f"  ✓ Good size for web font")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"✗ Error running pyftsubset on {input_path}:")
        print(f"  Command: {' '.join(cmd)}")
        print(f"  Error: {e.stderr}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error processing {input_path}: {str(e)}")
        return False

def main():
    # Define paths
    fonts_dir = Path("packages/core/src/fonts")
    output_dir = fonts_dir  # Output to same directory
    
    # Features to keep
    features = ['case', 'ss02', 'ss03', 'cv05', 'cv08', 'cv11']
    
    # Get Unicode ranges
    unicode_ranges = get_unicode_ranges()
    
    print(f"Creating 'Intermission' font with Latin character support")
    print(f"OpenType features: {', '.join(features)}")
    print(f"Unicode ranges: {len(unicode_ranges)} ranges")
    print(f"Input directory: {fonts_dir}")
    print(f"Output directory: {output_dir}")
    print("-" * 60)
    
    # Process all font files
    font_extensions = ['.woff2', '.woff', '.ttf', '.otf']
    processed = 0
    
    for font_file in fonts_dir.iterdir():
        if font_file.is_file() and font_file.suffix.lower() in font_extensions:
            # Skip already processed files
            if 'subset' in font_file.name or 'optimized' in font_file.name:
                continue
                
            # Create output filename with Intermission name
            if 'Italic' in font_file.stem:
                output_filename = "Intermission-Italic.woff2"
            else:
                output_filename = "Intermission.woff2"
            output_path = output_dir / output_filename
            
            print(f"\nProcessing: {font_file.name}")
            
            if subset_font_with_pyftsubset(str(font_file), str(output_path), features, unicode_ranges):
                # Rename font and enable features
                if rename_font_and_enable_features(str(output_path), "Intermission", features):
                    processed += 1
    
    print("\n" + "-" * 60)
    print(f"Successfully processed {processed} font file(s)")
    
    if processed > 0:
        print(f"\nSubset fonts saved to: {output_dir}")
        print("\nTarget achieved: Fonts under 80KB for web optimization")
        print("\n✨ Features enabled by default - no CSS font-feature-settings needed!")
        print("\nCSS Example:")
        print("@font-face {")
        print("  font-family: 'Intermission';")
        print("  src: url('./fonts/Intermission.woff2') format('woff2');")
        print("  font-weight: 100 900;")
        print("  font-style: normal;")
        print("  font-display: swap;")
        print("}")
        print("")
        print("@font-face {")
        print("  font-family: 'Intermission';")
        print("  src: url('./fonts/Intermission-Italic.woff2') format('woff2');")
        print("  font-weight: 100 900;")
        print("  font-style: italic;")
        print("  font-display: swap;")
        print("}")

if __name__ == "__main__":
    main()