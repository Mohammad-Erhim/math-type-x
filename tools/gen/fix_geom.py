"""Replace control geometry by the values measured in evidence/toolbar_dump.json (matched by tab and title)."""
import json
p = 'src/data/catalogue.json'
cat = json.load(open(p))
dump = json.load(open('evidence/toolbar_dump.json'))
n = 0
for ti in range(9):
    avail = [e for e in dump['tabs'][ti] if e['tag'] == 'button']
    for c in [c for c in cat['controls'] if c['tab'] == ti and c['group'] == 0]:
        m = next((b for b in avail if b['title'] == c['title']), None)
        if not m:
            continue
        avail.remove(m)
        g = [float(m['x']), float(m['y']), float(m['w']), float(m['h'])]
        if c['geom'] != g:
            c['geom'] = g
            n += 1
json.dump(cat, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
print('updated', n)
