const { scenario } = require('./sc');
const seqs = [
 ['abc','Lowercase letters (auto italic variables)'],['ABC','Uppercase letters'],['123','Digits'],['x+y=z','Operators typed from keyboard'],
 ['sin','Function name sin (auto upright)'],['sinx','sin followed by variable'],['cos','cos'],['tan','tan'],['log','log'],['ln','ln'],['lim','lim'],['max','max'],['exp','exp'],['det','det'],['abcsin','Variable run containing a function name'],
 ['a b','Space between letters'],['2x','Digit then letter'],['3.14','Decimal number'],['1,000','Thousands separator comma'],['x.y','Dot between letters'],
 ['a/b','Autoformat: slash'],['a^b','Autoformat: caret'],['a_b','Autoformat: underscore'],['a*b','Autoformat: asterisk'],['a>=b','Autoformat: >='],['a<=b','Autoformat: <='],['a!=b','!= sequence'],['a->b','-> sequence'],['a<>b','<> sequence'],['a==b','== sequence'],['a+-b','+- sequence'],['...','Three dots'],
 ['(','Open parenthesis'],['[','Open square bracket'],['{','Open curly brace'],['(1+2)','Typing both parentheses'],['[1+2]','Typing both square brackets'],['{1+2}','Typing both braces'],['(0,1',"Interval typed 'open' then caret before auto-closer"],['|x|','Vertical bars'],['<','Less-than'],['>','Greater-than'],['=','Equals'],['!','Exclamation'],['%','Percent'],['&','Ampersand'],['#','Hash'],['$','Dollar'],['@','At'],["'",'Apostrophe'],['"','Double quote'],['\\','Backslash'],[';',';'],[':',':'],['?','?'],['~','Tilde'],['`','Backtick'],
 ['pi','Word pi'],['alpha','Word alpha'],['sqrt','Word sqrt'],['sum','Word sum'],['int','Word int'],['inf','Word inf'],['theta','Word theta'],
];
scenario('s03_typing', async (H) => {
  const { p } = H;
  for (const [s, d] of seqs) {
    await H.step(`Type "${s}" - ${d}`, async () => { await H.reset(); await H.focusEdit(); await p.keyboard.type(s, { delay: 40 }); }, { clip: 'edit' });
  }
  // after (0,1 : move caret before auto-closer and type ]
  await H.step('Type "(0,1" then ArrowLeft? no: Right to be before closer then type "]" (mixed interval per docs)', async () => { await H.reset(); await H.focusEdit(); await p.keyboard.type('(0,1'); await p.keyboard.type(']'); }, { clip: 'edit' });
  await H.step('Type "(1+2" then press ArrowRight (leave the fence) then "=3"', async () => { await H.reset(); await H.focusEdit(); await p.keyboard.type('(1+2'); await p.keyboard.press('ArrowRight'); await p.keyboard.type('=3'); }, { clip: 'edit' });
  // unicode direct input
  for (const [s, d] of [['é','Latin accented'],['α','Greek alpha'],['∑','Summation sign'],['ℝ','Double-struck R'],['中文','CJK'],['שלום','Hebrew (RTL)'],['مرحبا','Arabic (RTL)'],['😀','Emoji'],['x²','Superscript-two char'],['½','Vulgar fraction char']]) {
    await H.step(`insertText "${s}" - ${d}`, async () => { await H.reset(); await H.focusEdit(); await p.keyboard.insertText(s); }, { clip: 'edit' });
  }
}, {});
