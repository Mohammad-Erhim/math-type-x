const { scenario } = require('/home/ubuntu/Desktop/projects/math-type-x/tools/sc');
scenario('s16probe', async (H) => {
  const { p } = H;
  await H.reset(); await H.focusEdit();
  const M = '<math xmlns="http://www.w3.org/1998/Math/MathML"><mstack charalign="center" charspacing="15px" stackalign="right"><mn>12</mn><mn>34</mn><msrow/><msline/><mscarries location="se"/><msrow><mn>5</mn><none/><mn>6</mn></msrow><msrow><mo>+</mo><maction actiontype="argument"><mrow/></maction><none/></msrow><msline/><msrow/></mstack></math>';
  await H.reset(M);
  await H.focusEdit();
  await p.keyboard.type('Z'); await H.sleep(300);
  console.log('RESULT', (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]+"/, '').slice(-200));
}, {});
