# Bundled fonts

| files | font | licence |
| --- | --- | --- |
| `LiberationSans-*.ttf` | Liberation Sans (letters, digits) | SIL OFL 1.1 |
| `MtxArabic-*.ttf` | DejaVu Sans subset to the Arabic blocks (default Arabic face; `tools/gen/subset_arabic.py`) | Bitstream Vera / DejaVu licence |
| `MtxAmiri-*.ttf` | Amiri, Arabic blocks only | SIL OFL 1.1 – © The Amiri Project Authors |
| `MtxScheherazade-*.ttf` | Scheherazade New, Arabic blocks only | SIL OFL 1.1 – © SIL Global |
| `MtxNotoNaskh-*.ttf`, `MtxNotoKufi-*.ttf` | Noto Naskh Arabic, Noto Kufi Arabic, Arabic blocks only | SIL OFL 1.1 – © Google LLC |

The `Mtx*` files are subsets (tools/gen/subset_arabic_fonts.py) and carry the renamed family "MTX …", as the OFL asks of
modified versions; copyright and licence notes are kept in each font's name table. The same faces ship as woff2 in
`public/fonts` for browsers. The full licence text: <https://openfontlicense.org/>.
