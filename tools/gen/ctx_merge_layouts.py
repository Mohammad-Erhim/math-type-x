#!/usr/bin/env python3
"""adds <key>_merge arrangements to src/data/ctx-layout.json: the merge / unmerge button in front of the controls of a
table / matrix / fence (the reference shows it between two digits of one number; derived like its own stack_merge:
the button vertically centred, a separator, everything else 36 px to the right).  Idempotent."""
import json, copy, os
p = os.path.join(os.path.dirname(__file__), '../../src/data/ctx-layout.json')
d = json.load(open(p))
merge = copy.deepcopy(d['numsep']['groups'][0])
for k in ['matrix', 'matrix_sp', 'matrix_st', 'piecewise_sp', 'table', 'table_sp', 'table_st', 'aligned', 'aligned_sp', 'aligned_st', 'fence', 'fence_sp', 'fence_st']:
    if k not in d: continue
    src = d[k]
    h = src['h']
    m = copy.deepcopy(merge)
    m['y'] = (h - m['h']) / 2
    groups = [m, {'line': True, 'x': 34, 'y': 3, 'h': h - 6}]
    for g in src['groups']:
        g = copy.deepcopy(g)
        g['x'] = g['x'] + 36
        groups.append(g)
    d[k + '_merge'] = {'w': src['w'], 'h': h, 'groups': groups}
    # with selected text (nudges first) the structure is the same: not offered together with a selection
json.dump(d, open(p, 'w'))
print('ok', len(d))
