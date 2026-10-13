const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const M = x => `<math ${NS}>${x}</math>`;
const cell = '<mtd/>';
const contexts = [
  { key: 'matrix', name: 'Matrix 2x2 with parentheses', mml: M('<mfenced><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced>') },
  { key: 'table', name: 'Table 2x2 without fence', mml: M('<mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable>') },
  { key: 'piecewise', name: 'Piecewise function', mml: M('<mfenced open="{" close=""><mtable columnalign="left"><mtr><mtd><mi>x</mi></mtd></mtr><mtr><mtd><mi>y</mi></mtd></mtr></mtable></mfenced>') },
  { key: 'aligned', name: 'Aligned equations', mml: M('<mtable columnalign="right left"><mtr><mtd><mi>a</mi></mtd><mtd><mo>=</mo><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mo>=</mo><mi>d</mi></mtd></mtr></mtable>') },
  { key: 'fence', name: 'Fenced expression (square brackets)', mml: M('<mfenced open="[" close="]"><mi>x</mi><mo>+</mo><mn>1</mn></mfenced>') },
  { key: 'fraction', name: 'Fraction', mml: M('<mfrac><mi>a</mi><mi>b</mi></mfrac>') },
  { key: 'operator', name: 'Operator in expression', mml: M('<mi>x</mi><mo>+</mo><mi>y</mi>') },
  { key: 'multiline', name: 'Multi-line expression (Enter)', mml: M('<mi>a</mi><mspace linebreak="newline"/><mi>b</mi>') },
  { key: 'longdiv', name: 'Long division', mml: M('<mlongdiv longdivstyle="lefttop"><mn>3</mn><mn>12</mn><mn>4</mn></mlongdiv>') },
  { key: 'stack', name: 'Stacked addition', mml: M('<mstack><mn>12</mn><msrow><mo>+</mo><mn>34</mn></msrow><msline/></mstack>') },
  { key: 'mspace', name: 'Existing mspace element', mml: M('<mi>a</mi><mspace width="1em" height="3ex" depth="2ex"/><mi>b</mi>') },
  { key: 'numsep', name: 'Number with separator', mml: M('<mn>1</mn><mo>.</mo><mn>5</mn>') },
  { key: 'symbol', name: 'Single symbol', mml: M('<mi>x</mi>') },
  { key: 'sum', name: 'Big operator (sum)', mml: M('<munderover><mo>&#x2211;</mo><mi>i</mi><mi>n</mi></munderover>') },
  { key: 'root', name: 'Square root', mml: M('<msqrt><mi>x</mi></msqrt>') },
];
module.exports = { contexts, M };
