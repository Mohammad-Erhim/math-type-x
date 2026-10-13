// formulas of the contextual-tab differential (tools/ctx_matrix.js)
const cases = [
 {
  "name": "plain",
  "mml": "<mi>a</mi><mo>+</mo><mi>b</mi>"
 },
 {
  "name": "number",
  "mml": "<mn>12</mn><mo>.</mo><mn>5</mn>"
 },
 {
  "name": "sup",
  "mml": "<msup><mi>x</mi><mn>2</mn></msup>"
 },
 {
  "name": "sub",
  "mml": "<msub><mi>x</mi><mn>1</mn></msub>"
 },
 {
  "name": "subsup",
  "mml": "<msubsup><mi>x</mi><mn>1</mn><mn>2</mn></msubsup>"
 },
 {
  "name": "frac",
  "mml": "<mfrac><mi>a</mi><mi>b</mi></mfrac>"
 },
 {
  "name": "bevel",
  "mml": "<mfrac bevelled=\"true\"><mi>a</mi><mi>b</mi></mfrac>"
 },
 {
  "name": "sqrt",
  "mml": "<msqrt><mi>x</mi></msqrt>"
 },
 {
  "name": "root",
  "mml": "<mroot><mi>x</mi><mn>3</mn></mroot>"
 },
 {
  "name": "paren",
  "mml": "<mfenced><mi>x</mi><mo>+</mo><mn>1</mn></mfenced>"
 },
 {
  "name": "square",
  "mml": "<mfenced open=\"[\" close=\"]\"><mi>x</mi></mfenced>"
 },
 {
  "name": "curly",
  "mml": "<mfenced open=\"{\" close=\"}\"><mi>x</mi></mfenced>"
 },
 {
  "name": "abs",
  "mml": "<mfenced open=\"|\" close=\"|\"><mi>x</mi></mfenced>"
 },
 {
  "name": "angle",
  "mml": "<mfenced open=\"&#x27E8;\" close=\"&#x27E9;\"><mi>x</mi><mi>y</mi></mfenced>"
 },
 {
  "name": "matrix",
  "mml": "<mfenced><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced>"
 },
 {
  "name": "matrix3",
  "mml": "<mfenced open=\"[\" close=\"]\"><mtable><mtr><mtd><mn>1</mn></mtd><mtd><mn>2</mn></mtd><mtd><mn>3</mn></mtd></mtr><mtr><mtd><mn>4</mn></mtd><mtd><mn>5</mn></mtd><mtd><mn>6</mn></mtd></mtr></mtable></mfenced>"
 },
 {
  "name": "table",
  "mml": "<mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable>"
 },
 {
  "name": "piecewise",
  "mml": "<mfenced open=\"{\" close=\"\"><mtable columnalign=\"left\"><mtr><mtd><mi>x</mi></mtd></mtr><mtr><mtd><mi>y</mi></mtd></mtr></mtable></mfenced>"
 },
 {
  "name": "aligned",
  "mml": "<mtable columnalign=\"right left\"><mtr><mtd><mi>a</mi></mtd><mtd><mo>=</mo><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mo>=</mo><mi>d</mi></mtd></mtr></mtable>"
 },
 {
  "name": "multiline",
  "mml": "<mi>a</mi><mspace linebreak=\"newline\"/><mi>b</mi>"
 },
 {
  "name": "sum",
  "mml": "<munderover><mo>&#x2211;</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover><msub><mi>a</mi><mi>i</mi></msub>"
 },
 {
  "name": "int",
  "mml": "<msubsup><mo>&#x222B;</mo><mn>0</mn><mn>1</mn></msubsup><mi>x</mi><mi>d</mi><mi>x</mi>"
 },
 {
  "name": "lim",
  "mml": "<munder><mi>lim</mi><mrow><mi>x</mi><mo>&#x2192;</mo><mn>0</mn></mrow></munder><mi>f</mi>"
 },
 {
  "name": "hat",
  "mml": "<mover><mi>x</mi><mo>^</mo></mover>"
 },
 {
  "name": "bar",
  "mml": "<mover><mi>x</mi><mo>&#xAF;</mo></mover>"
 },
 {
  "name": "underline",
  "mml": "<munder><mi>x</mi><mo>&#xAF;</mo></munder>"
 },
 {
  "name": "overbrace",
  "mml": "<mover><mover><mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow><mo>&#x23DE;</mo></mover><mi>n</mi></mover>"
 },
 {
  "name": "underbrace",
  "mml": "<munder><munder><mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow><mo>&#x23DF;</mo></munder><mi>n</mi></munder>"
 },
 {
  "name": "box",
  "mml": "<menclose notation=\"box\"><mi>x</mi></menclose>"
 },
 {
  "name": "circle",
  "mml": "<menclose notation=\"circle\"><mi>x</mi></menclose>"
 },
 {
  "name": "strike",
  "mml": "<menclose notation=\"updiagonalstrike\"><mi>x</mi></menclose>"
 },
 {
  "name": "longdivision",
  "mml": "<menclose notation=\"longdiv\"><mn>12</mn></menclose>"
 },
 {
  "name": "text",
  "mml": "<mtext>hello world</mtext>"
 },
 {
  "name": "mspace",
  "mml": "<mi>a</mi><mspace width=\"1em\"/><mi>b</mi>"
 },
 {
  "name": "func",
  "mml": "<mi>sin</mi><mo>&#x2061;</mo><mfenced><mi>x</mi></mfenced>"
 },
 {
  "name": "arrowover",
  "mml": "<mover><mo>&#x2192;</mo><mi>f</mi></mover>"
 },
 {
  "name": "stackadd",
  "mml": "<mstack><mn>12</mn><msrow><mo>+</mo><mn>34</mn></msrow><msline/></mstack>"
 },
 {
  "name": "longdiv",
  "mml": "<mlongdiv longdivstyle=\"lefttop\"><mn>3</mn><mn>12</mn><mn>4</mn></mlongdiv>"
 },
 {
  "name": "nestedfrac",
  "mml": "<mfrac><mfrac><mi>a</mi><mi>b</mi></mfrac><mi>c</mi></mfrac>"
 },
 {
  "name": "fracinfence",
  "mml": "<mfenced><mfrac><mi>a</mi><mi>b</mi></mfrac></mfenced>"
 },
 {
  "name": "mmulti",
  "mml": "<mmultiscripts><mi>x</mi><mn>1</mn><mn>2</mn><mprescripts/><mn>3</mn><mn>4</mn></mmultiscripts>"
 },
 {
  "name": "degree",
  "mml": "<mn>30</mn><mo>&#xB0;</mo>"
 },
 {
  "name": "greek",
  "mml": "<mi>&#x3B1;</mi><mo>+</mo><mi>&#x3B2;</mi>"
 },
 {
  "name": "binom",
  "mml": "<mfenced><mfrac linethickness=\"0\"><mi>n</mi><mi>k</mi></mfrac></mfenced>"
 }
];
module.exports = { cases };
