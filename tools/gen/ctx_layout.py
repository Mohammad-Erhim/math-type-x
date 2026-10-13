"""Layout and icons of the contextual tab, from the recorded reference DOM (evidence/ref_ctx_dump.json, tools/s30.js)
   python3 tools/gen/ctx_layout.py  →  src/data/ctx-layout.json, src/data/ctx-icons.json"""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(__file__))
from tracelib import *  # noqa: F401,F403

dump = json.load(open('evidence/ref_ctx_dump.json'))['steps'] + json.load(open('evidence/ref_ctx_dump2.json'))['steps'] + [dict(st, desc='cap_' + st['desc']) for st in json.load(open('evidence/ref_ctx_dump3.json'))['steps']]
VARIANTS = {
    'matrix k=2': 'matrix', 'table k=0': 'table', 'aligned k=0': 'aligned', 'aligned k=1': 'aligned_sp',
    'fence k=1': 'fence', 'fence k=3': 'fence_sp', 'operator k=1': 'operator', 'mspace k=1': 'mspace', 'sum k=0': 'sum',
    'stack k=0': 'stack', 'stack k=3': 'stack_merge', 'multiline k=0': 'multiline', 'multiline k=1': 'multiline_sp',
    'symbol k=0 sel1': 'symbol', 'numA k=0 sel1': 'symbol_sp', 'numA k=0 all': 'numsep_sel', 'numB k=1': 'numsep',
    # tools/ctx_dump2.js: operators with spacing / stretchy controls inside tables, fences, lines
    'operator_st': 'operator_st', 'fence_st': 'fence_st', 'aligned_st': 'aligned_st', 'table_sp': 'table_sp', 'table_st': 'table_st',
    'matrix_sp': 'matrix_sp', 'matrix_st': 'matrix_st', 'piecewise_sp': 'piecewise_sp', 'multiline_st': 'multiline_st',
}
layouts = {}
cells = {}
for st in dump:
    key = VARIANTS.get(st['desc']) or (st['desc'] if st['desc'].startswith('cap_') else None)
    if not key:
        continue
    els = [e for e in st['extra'] if e['rect'][2] > 0 and e['rect'][3] > 0]
    panel = next(e for e in els if 'wrs_multipleRowPanel' in e['cls'])
    ox, oy = panel['rect'][0], panel['rect'][1]
    groups = []
    cur = None
    row = col = -1
    last_tr_y = None
    for e in els:
        c = e['cls']
        if e['tag'] == 'TABLE':
            cur = {'rows': 2 if 'For2Rows' in c else 3 if 'For3Rows' in c else 1, 'x': round(e['rect'][0] - ox, 2), 'y': round(e['rect'][1] - oy, 2), 'w': e['rect'][2], 'h': e['rect'][3], 'cells': []}
            groups.append(cur)
        elif e['tag'] == 'SPAN' and 'wrs_line' in c:
            groups.append({'line': True, 'x': round(e['rect'][0] - ox, 2), 'y': round(e['rect'][1] - oy, 2), 'h': e['rect'][3]})
            cur = None
        elif cur is not None and e['tag'] in ('BUTTON',) or (cur is not None and e['tag'] == 'DIV' and ('wrs_select' in c or 'wrs_empty' in c)):
            x = round(e['rect'][0] - ox - cur['x'], 2)
            y = round(e['rect'][1] - oy - cur['y'], 2)
            item = {'x': x, 'y': y, 'w': e['rect'][2], 'h': e['rect'][3]}
            if e['tag'] == 'BUTTON':
                item['t'] = 'b'
                item['title'] = e['title']
                if 'wrs_toggled' in c:
                    item['on'] = 1
                if 'wrs_lengthButton' in c:
                    item['len'] = 1
            elif 'wrs_select' in c:
                item['t'] = 's'
                if 'wrs_withIcon' in c:
                    item['wi'] = 1
            else:
                item['t'] = 'e'
            cur['cells'].append(item)
        elif e['tag'] == 'SELECT' and cur is not None and cur['cells']:
            cur['cells'][-1]['title'] = e['title']
        elif e['tag'] == 'DIV' and 'wrs_label' in c and cur is not None and cur['cells']:
            cur['cells'][-1]['label'] = e['text']
            cur['cells'][-1]['lw'] = e['rect'][2]
        elif e['tag'] == 'IMG' and cur is not None and cur['cells'] and cur['cells'][-1].get('t') in ('b', 's'):
            m = re.search(r'margin-left:\s*(-?\d+)px;\s*margin-top:\s*(-?\d+)px', e['style'] or '')
            if m:
                size = int(cur['cells'][-1]['w']) - 4 if cur['cells'][-1]['t'] == 'b' else 18
                ix, iy = -int(m.group(1)), -int(m.group(2))
                cur['cells'][-1]['icon'] = f'{ix},{iy},{size}'
                cells[(ix, iy, size)] = 1
    layouts[key] = {'w': panel['rect'][2], 'h': panel['rect'][3], 'groups': groups}
# a selection shows the nudge buttons in front of the controls of its context: derive sel_<key> from <key>
NUDGE_W = 69  # nudge group (66) + separator line at 67 + 2
def with_nudge(base):
    nud = layouts['symbol']['groups'][0]
    groups = [dict(nud), {'line': True, 'x': 67, 'y': 3, 'h': 60}]
    for g in base['groups']:
        g2 = dict(g)
        g2['x'] = round(g['x'] + NUDGE_W, 2)
        groups.append(g2)
    return {'w': base['w'], 'h': base['h'], 'groups': groups}
SEL_BASES = ['matrix', 'matrix_sp', 'matrix_st', 'table', 'table_sp', 'table_st', 'aligned', 'aligned_sp', 'aligned_st', 'fence', 'fence_sp', 'fence_st',
             'stack', 'stack_merge', 'multiline', 'multiline_sp', 'multiline_st', 'mspace', 'operator', 'operator_st', 'numsep']
for k in SEL_BASES:
    layouts['sel_' + k] = with_nudge(layouts[k])
layouts['sel_symbol'] = layouts['symbol']
layouts['sel_symbol_sp'] = layouts['symbol_sp']
layouts['sel_numsep_sel'] = layouts['numsep_sel']
layouts['sel_numsep_sel_sp'] = layouts['cap_sel_numsep_sp']
# check the derivation against what the reference shows (tools/ctx_dump2.js, evidence/ref_ctx_dump3.json)
CAP = {'cap_sel_matrix': 'sel_matrix', 'cap_sel_matrix_fenceonly': 'sel_fence', 'cap_sel_table': 'sel_table', 'cap_sel_aligned': 'sel_aligned',
       'cap_sel_aligned_sp': 'sel_aligned_sp', 'cap_sel_fence': 'sel_fence', 'cap_sel_fence_sp': 'sel_fence', 'cap_sel_stack': 'sel_stack',
       'cap_sel_lines': 'sel_multiline_sp', 'cap_sel_lines_sp': 'sel_multiline_sp', 'cap_sel_mspace': 'sel_mspace', 'cap_sel_sp': 'sel_symbol_sp',
       'cap_sel_sp_st': 'sel_operator_st', 'cap_sel_plain': 'sel_symbol', 'cap_sel_numsep': 'sel_numsep_sel', 'cap_sel_fence_st': 'sel_fence_st'}
def sig(l):
    out = []
    for g in l['groups']:
        if g.get('line'):
            out.append(('line', round(g['x']), round(g['y']), round(g['h'])))
        else:
            for c in g['cells']:
                if c.get('title'):
                    out.append((c['title'], round(g['x'] + c['x'], 1), round(g['y'] + c['y'], 1), c['w'], c['h']))
    return out
bad = 0
for cap, key in CAP.items():
    a, b = sig(layouts[cap]), sig(layouts[key])
    if a != b:
        bad += 1
        print('selection layout differs:', cap, key)
        for x, y in zip(a, b):
            if x != y:
                print('   ref', x, '\n   gen', y)
                break
for cap in [k for k in layouts if k.startswith('cap_')]:
    del layouts[cap]
print('selection layouts checked', len(CAP), 'differ', bad)
json.dump(layouts, open('src/data/ctx-layout.json', 'w'), separators=(',', ':'))
print('variants', len(layouts), 'icon cells', len(cells))

# vector re-drawing of every icon cell
out = {}
for (x, y, size) in sorted(cells):
    cell = SHEET[y:y + size, x:x + size].copy()
    a = cell[..., 3]
    if a.max() < 0.05:
        continue
    opaque = a > 0.5
    if opaque.sum() < 1:
        continue
    px = cell[..., :3][opaque]
    labels, centers = kmeans_colors(px, 3)
    idx = -np.ones(a.shape, np.int32)
    idx[opaque] = labels
    layers = []
    for ci in range(len(centers)):
        soft = np.where(idx == ci, a, 0).astype(np.float32)
        part = (a > 0.08) & ~opaque
        if part.any():
            ys, xs = np.nonzero(part)
            for yy, xx in zip(ys, xs):
                dd = np.linalg.norm(centers - cell[yy, xx, :3], axis=1)
                if int(np.argmin(dd)) == ci:
                    soft[yy, xx] = a[yy, xx]
        up = cv2.resize(soft, (size * S, size * S), interpolation=cv2.INTER_CUBIC)
        mask = (up > coverage_threshold(up, soft)).astype(np.uint8)
        d = path_of(mask)
        if not d:
            continue
        col = centers[ci]
        hexcol = '#%02x%02x%02x' % tuple(int(round(v * 255)) for v in col)
        layers.append({'fill': hexcol, 'area': int(mask.sum()), 'd': d})
    ink = float(a.sum()) * S * S
    if layers and sum(l['area'] for l in layers) < 0.7 * ink:
        layers = pixel_layers(cell)
    else:
        layers.sort(key=lambda l: -l['area'])
        for l in layers:
            del l['area']
    out[f'{x},{y},{size}'] = {'w': size, 'layers': layers}
json.dump(out, open('src/data/ctx-icons.json', 'w'), separators=(',', ':'))
print('traced', len(out))
