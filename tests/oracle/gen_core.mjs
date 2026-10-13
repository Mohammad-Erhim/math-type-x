// Generates probe programs (oracle questions) for the core editing semantics.
import fs from 'node:fs';
const P = {};
const T = (s) => ({ type: s });
const K = (k, n = 1) => ({ press: k, n });
const M = { mml: 1 };
const click = (title, tab) => [{ tab }, { click: title }];
const G = (title) => click(title, 0);
const Z = [T('Z'), M];

// ---- reserved words / typing
for (const w of ['arcsin', 'asin', 'sinh', 'cosec', 'xsin', 'Sin', 'lnx', 'lg', 'sinsin', 'logn', 'tanx', 'ssin', 'lln', 'cos2x'])
  P['word_' + w] = [T(w), M];
P['typed_digit_after_fraction'] = [...G('Fraction (Ctrl+/)'), T('12'), K('ArrowRight', 2), T('34'), M];
P['underscore_and_misc'] = [T('a_b$c'), M];
P['unicode_text_types'] = [{ text: 'éα∑ℝ中文שלום😀x²½' }, M];
P['greek_typed'] = [{ text: 'αβ' }, M];
P['digit_after_letter'] = [T('a12b'), M];
// ---- bold/italic combos
P['bold_italic_both'] = [K('Control+b'), K('Control+i'), T('a1+'), M];
P['bold_then_off'] = [K('Control+b'), T('a'), K('Control+b'), T('b'), M];
P['italic_sel_letters'] = [T('xy'), K('Shift+ArrowLeft', 2), K('Control+i'), M];
P['bold_sel_ops'] = [T('x+1'), K('Control+a'), K('Control+b'), M];
P['bold_twice_sel'] = [T('x+1'), K('Control+a'), K('Control+b'), K('Control+b'), M];
P['italic_on_sel_sin'] = [T('sin'), K('Shift+ArrowLeft'), K('Control+i'), M];
P['bold_on_sin'] = [T('sin'), K('Shift+ArrowLeft'), K('Control+b'), M];
// ---- autoitalic off
const AI = [{ tab: 0 }, { click: 'Automatic italic' }];
P['ai_off_letters'] = [...AI, T('xsin1abc'), M];
P['ai_off_bold'] = [...AI, K('Control+b'), T('ab1'), M];
P['ai_off_italic'] = [...AI, K('Control+i'), T('ab1'), M];
P['ai_off_greek_text'] = [...AI, { text: 'αβx' }, M];
P['ai_off_upper'] = [...AI, T('ABC'), M];
P['ai_off_then_on'] = [...AI, T('ab'), ...AI, T('cd'), M];
P['ai_off_space'] = [...AI, T('ab cd'), M];
P['ai_off_digits_letters'] = [...AI, T('a1b2'), M];
// ---- regular text
const RT = [{ tab: 0 }, { click: 'Regular text' }];
P['rt_basic'] = [...RT, T('hello world 12+x'), M];
P['rt_then_off_type'] = [...RT, T('ab'), ...RT, T('c'), M];
P['rt_then_arrow'] = [...RT, T('ab'), K('ArrowLeft'), T('Z'), M];
P['rt_after_letters_typed_before'] = [T('xy'), ...RT, T('ab'), M];
P['rt_sel'] = [T('abc'), K('Shift+ArrowLeft', 2), ...RT, M];
P['rt_sel_then_type'] = [T('abc'), K('Shift+ArrowLeft', 2), ...RT, T('Q'), M];
P['rt_fraction'] = [...RT, T('ab'), ...G('Fraction (Ctrl+/)'), T('c'), M];
P['rt_bold'] = [...RT, K('Control+b'), T('ab'), M];
// ---- enter / lines
P['enter_in_fraction'] = [...G('Fraction (Ctrl+/)'), T('a'), K('Enter'), T('b'), M];
P['enter_in_sqrt'] = [...G('Square root'), T('a'), K('Enter'), T('b'), M];
P['enter_in_script'] = [...G('Superscript (Ctrl+Up)'), T('a'), K('ArrowRight'), T('b'), K('Enter'), T('c'), M];
P['enter_start'] = [K('Enter'), T('a'), M];
P['enter_mid'] = [T('abcd'), K('ArrowLeft', 2), K('Enter'), T('Z'), M];
// ---- backspace / delete
P['bs_mn_multi'] = [T('123'), K('Backspace'), M];
P['bs_sin'] = [T('sin'), K('Backspace'), M];
P['bs_sin_x'] = [T('sinx'), K('Backspace', 2), M];
P['bs_start_slot_nonempty'] = [...G('Fraction (Ctrl+/)'), T('a'), K('ArrowRight'), T('b'), K('ArrowLeft'), K('Backspace'), M, T('Z'), M];
P['bs_in_empty_num'] = [T('x'), ...G('Fraction (Ctrl+/)'), K('Backspace'), M, K('Backspace'), M];
P['bs_in_empty_sqrt'] = [...G('Square root'), K('Backspace'), M, K('Backspace'), M];
P['bs_after_fence'] = [...G('Parentheses'), T('ab'), K('ArrowRight'), K('Backspace'), M, K('Backspace'), M];
P['bs_inside_fence_start'] = [...G('Parentheses'), T('ab'), K('Home'), K('ArrowRight'), K('Backspace'), M];
P['bs_after_script'] = [T('x'), ...G('Superscript (Ctrl+Up)'), T('2'), K('ArrowRight'), K('Backspace'), M, K('Backspace'), M];
P['bs_empty_base'] = [...G('Superscript (Ctrl+Up)'), K('Backspace'), M];
P['bs_in_exponent_empty'] = [T('x'), ...G('Superscript (Ctrl+Up)'), K('Backspace'), M];
P['bs_sel_struct'] = [...G('Fraction (Ctrl+/)'), T('a'), K('ArrowRight', 3), K('Shift+ArrowLeft'), K('Backspace'), M];
P['del_before_fraction'] = [T('x'), ...G('Fraction (Ctrl+/)'), T('a'), K('Home'), K('Delete'), M, K('Delete'), M];
P['del_end'] = [T('ab'), K('Delete'), M];
P['del_in_numerator_end'] = [...G('Fraction (Ctrl+/)'), T('a'), K('Delete'), M, T('Z'), M];
P['del_at_end_of_slot_with_next_slot'] = [...G('Fraction (Ctrl+/)'), T('a'), K('ArrowRight'), T('b'), K('ArrowLeft'), K('ArrowLeft'), K('Delete'), M];
// ---- navigation: caret order for every structure
const nav = (title, tab, prefill) => {
  const out = {};
  const setup = [{ tab }, { click: title }];
  for (let n = 0; n <= 6; n++) out['nav_R_' + title + '_' + n] = [...setup, T('a'), ...(prefill || []), K('Home'), K('ArrowRight', n), T('Z'), M];
  return out;
};
const NAVS = [['Fraction (Ctrl+/)', 0], ['Square root', 0], ['Root', 0], ['Superscript (Ctrl+Up)', 0], ['Subscript (Ctrl+Down)', 0], ['Parentheses', 0],
  ['Superscript and subscript', 5], ['Left superscript', 5], ['Left subscript and superscript', 5], ['Element over', 5], ['Element under', 5], ['Elements under and over', 5]];
for (const [t, tab] of NAVS) {
  for (let n = 0; n <= 5; n++) {
    P[`navL_${t}_${n}`] = [{ tab }, { click: t }, T('p'), K('ArrowDown'), K('ArrowRight'), K('End'), K('ArrowLeft', n), T('Z'), M];
  }
}
// vertical moves
for (const [t, tab] of NAVS) {
  P[`navUp_${t}`] = [{ tab }, { click: t }, T('a'), K('ArrowRight'), T('b'), K('ArrowUp'), T('Z'), M];
  P[`navDown_${t}`] = [{ tab }, { click: t }, T('a'), K('ArrowRight'), T('b'), K('ArrowDown'), T('Z'), M];
  P[`navUpDown_${t}`] = [{ tab }, { click: t }, T('a'), K('ArrowRight'), T('b'), K('ArrowDown'), K('ArrowUp'), T('Z'), M];
}
// home/end in lines
P['home_end_lines'] = [T('ab'), K('Enter'), T('cd'), K('Home'), T('1'), K('End'), T('2'), K('ArrowUp'), T('3'), K('Home'), T('4'), M];
P['up_down_lines'] = [T('abc'), K('Enter'), T('de'), K('Enter'), T('f'), K('ArrowUp'), T('1'), K('ArrowUp'), T('2'), K('ArrowDown'), T('3'), M];
// selection
P['sel_shift_right_over_fraction'] = [T('x'), ...G('Fraction (Ctrl+/)'), T('a'), K('Home'), K('Shift+ArrowRight', 2), T('Q'), M];
P['sel_in_slot'] = [...G('Fraction (Ctrl+/)'), T('ab'), K('Shift+ArrowLeft'), T('Q'), M];
P['sel_out_of_slot'] = [...G('Fraction (Ctrl+/)'), T('ab'), K('Shift+ArrowLeft', 3), T('Q'), M];
P['sel_home_end'] = [T('abc'), K('Home'), K('ArrowRight'), K('Shift+End'), T('Q'), M];
P['sel_collapse_left'] = [T('abc'), K('Shift+ArrowLeft', 2), K('ArrowLeft'), T('Q'), M];
P['sel_collapse_right'] = [T('abc'), K('Shift+ArrowLeft', 2), K('ArrowRight'), T('Q'), M];
P['sel_all_type'] = [T('abc'), K('Control+a'), T('Q'), M];
P['sel_all_in_slot'] = [...G('Fraction (Ctrl+/)'), T('a'), K('Control+a'), T('Q'), M];
P['sel_toolbar_template_multi'] = [T('abc'), K('Shift+ArrowLeft', 2), ...G('Parentheses'), M, T('Z'), M];
P['sel_template_caret_after'] = [T('ab'), K('Shift+ArrowLeft'), ...G('Fraction (Ctrl+/)'), T('Z'), M];
P['sel_symbol_replace_caret'] = [T('ab'), K('Shift+ArrowLeft'), ...click('Plus sign', 0), T('Z'), M];
// undo/redo
P['undo_chain'] = [T('abc'), K('Control+z'), M, K('Control+z'), M, K('Control+y'), M, T('Q'), M, K('Control+y'), M];
P['undo_template'] = [...G('Fraction (Ctrl+/)'), T('a'), K('Control+z'), M, K('Control+z'), M];
fs.writeFileSync(new URL('./programs_core.json', import.meta.url), JSON.stringify(P, null, 1));
console.log(Object.keys(P).length, 'programs');
