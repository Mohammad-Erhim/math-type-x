#!/usr/bin/env python3
"""Merge SRS Appendix C geometry (srs_cat.json) with the crawl evidence into src/data/catalogue.json.
usage: build_catalogue.py srs_cat.json evidence/crawl out.json
"""
import json, sys, re, os
srs = json.load(open(sys.argv[1]))
crawl_dir = sys.argv[2]
out = sys.argv[3]
rows = {r['id']: r for r in srs['rows']}
tabs = []
controls = []
TABNAMES = ['General', 'Symbols', 'Arrows', 'Greek, letters and numbers', 'Matrices and elementary',
            'Scripts and layout', 'Decorations', 'Big operators', 'Calculus']
exp_geo = {}
for g in srs['groups']:
    if g['index'] > 0:
        m = re.match(r'([\d.\-]+), ([\d.\-]+), (\d+)×(\d+)', g['expand'])
        exp_geo[(g['tab'], g['index'])] = [float(m.group(1)), float(m.group(2)), int(m.group(3)), int(m.group(4))]
def strip(m):
    if m is None: return None
    return m.replace(' xmlns="http://www.w3.org/1998/Math/MathML"', '')
for t in range(9):
    j = json.load(open(os.path.join(crawl_dir, f'tab{t}.json')))
    tabs.append({'index': t, 'name': TABNAMES[t], 'title': j.get('tabTitle')})
    nb = 0
    xs = {}
    for r in j['results']:
        rid = r.get('id')
        if not rid: continue  # expander entries
        m = re.match(r't(\d+)_b(\d+)$', rid)
        if m:
            n = int(m.group(2)); sid = f'TB-{t+1}-{n+1:03d}'; grp = 0
        else:
            m = re.match(r't(\d+)_x(\d+)_i(\d+)$', rid)
            if not m: continue
            k = int(m.group(2)); n = int(m.group(3)); grp = k + 1
            sid = f'TB-{t+1}-G{grp}-{n+1:03d}'
        s = rows.get(sid)
        if not s:
            print('missing in SRS', sid, rid, r.get('title')); continue
        cs = r.get('cases', {}) or {}
        c = {'id': sid, 'ref': rid, 'tab': t, 'group': grp, 'n': n,
             'title': r['title'], 'geom': s['geom']}
        if r.get('skipped'): c['special'] = True
        for k in ('A', 'A2', 'B', 'C'):
            if k in cs: c[k] = strip(cs[k]['mathml'])
        controls.append(c)
    # sanity: title matches SRS tooltip
for c in controls:
    s = rows[c['id']]
    if s['tooltip'].replace(' ', '') != c['title'].replace(' ', ''):
        print('title mismatch', c['id'], repr(s['tooltip']), repr(c['title']))
groups = [{'tab': g['tab'], 'index': g['index'], 'count': g['count'], 'expand': exp_geo.get((g['tab'], g['index']))} for g in srs['groups'] if g['index'] > 0]
json.dump({'tabs': tabs, 'groups': groups, 'controls': controls}, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(controls), 'controls', os.path.getsize(out), 'bytes')
