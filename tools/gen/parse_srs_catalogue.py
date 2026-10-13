#!/usr/bin/env python3
"""Extract geometry + group structure of Appendix C of the SRS (text from pymupdf) into JSON.
usage: parse_srs_catalogue.py SRS.txt out.json
"""
import re, sys, json
txt = open(sys.argv[1], encoding='utf-8').read().split('\n')
start = next(i for i,l in enumerate(txt) if l.startswith('C.1 Tab 1'))
end = next(i for i,l in enumerate(txt) if l.startswith('Appendix D') and i > start)
lines = []
for l in txt[start:end]:
    if l.startswith('SRS - MathType') or l.strip() == '=====PAGE=====' or l.strip() == '':
        continue
    lines.append(l.rstrip())
merged = []
k = 0
while k < len(lines):
    if re.match(r'^TB-\d-(G\d+-)?$', lines[k]) and k + 1 < len(lines):
        merged.append(lines[k] + lines[k + 1].strip()); k += 2
    else:
        merged.append(lines[k]); k += 1
lines = merged
rows = []
groups = []  # (tab, name, count, expand geometry)
cur = None
tab = None
geo_re = re.compile(r'(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)')
i = 0
while i < len(lines):
    l = lines[i]
    m = re.match(r'C\.(\d) Tab (\d) — (.*?) \(Alt\+(\d)\)', l)
    if m:
        tab = int(m.group(1)) - 1
        i += 1; continue
    m = re.match(r'(Main panel|“More” group (\d+)) \((\d+) controls\)(?: — expand button at (.*))?', l)
    if m:
        g = {'tab': tab, 'name': m.group(1), 'index': int(m.group(2) or 0), 'count': int(m.group(3)), 'expand': m.group(4)}
        groups.append(g); cur = g
        i += 1; continue
    m = re.match(r'^TB-(\d)-(?:G(\d+)-)?(\d{3})$', l)
    if m:
        rid = l
        j = i + 1
        buf = []
        while j < len(lines) and not re.match(r'^TB-\d-', lines[j]) and not re.match(r'^(Main panel|“More” group|C\.\d Tab)', lines[j]):
            buf.append(lines[j]); j += 1
        body = ' '.join(buf)
        # tooltip = text before geometry
        gm = geo_re.search(body)
        tooltip = body[:gm.start()].strip() if gm else body
        geom = [float(x) for x in gm.groups()] if gm else None
        rows.append({'id': rid, 'tab': int(m.group(1)) - 1, 'group': int(m.group(2) or 0), 'n': int(m.group(3)),
                     'tooltip': tooltip, 'geom': geom, 'body': body[gm.end():].strip()[:200] if gm else ''})
        i = j; continue
    i += 1
json.dump({'groups': groups, 'rows': rows}, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
print(len(rows), 'rows', len(groups), 'groups')
for g in groups: print(g)
