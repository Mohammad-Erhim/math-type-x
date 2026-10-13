#!/usr/bin/env python3
"""Build the spoken-text language packs (src/data/speech/<lang>.json) from the recorded reference answers.

inputs  tests/oracle/speech_<lang>_tokens.json    single-token answers      (tools/gen/speech_ar_tokens.mjs)
        tests/oracle/speech_<lang>_fences.json    fence / separator answers (tools/gen/speech_fences.mjs)
        tools/gen/speech_templates_<lang>.json    hand-derived templates (checked by tests/speech_templates.test.ts)
usage   python3 tools/gen/speech_pack.py ar
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def norm_key(k: str):
    tag, mv, text = k.split('|', 2)
    if mv.startswith('mathvariant="'):
        mv = mv[len('mathvariant="'):-1]
    elif '=' in mv:
        return None  # other attributes (largeop) are not part of the name table
    return f'{tag}|{mv}|{text}'


def main(lang: str) -> None:
    tok = json.load(open(os.path.join(ROOT, 'tests/oracle', f'speech_{lang}_tokens.json')))
    names = {}
    for k, v in tok.items():
        nk = norm_key(k)
        if nk is None or 'Error 500' in v or v.startswith('Error converting'):
            continue
        names[nk] = v
    pack = json.load(open(os.path.join(ROOT, 'tools/gen', f'speech_pack_{lang}.json')))
    pack['names'] = names
    ff = os.path.join(ROOT, 'tests/oracle', f'speech_{lang}_fences.json')
    if os.path.exists(ff):
        f = json.load(open(ff))
        pack['fenceOpen'] = f['open']
        pack['fenceClose'] = f['close']
        pack['sepNames'] = f['sep']
    tf = os.path.join(ROOT, 'tests/oracle', f'speech_{lang}_tables.json')
    if os.path.exists(tf):
        vals = ['left', '3px', '2px', 'top', '1em']
        heads = {}
        for mask, h in json.load(open(tf)).items():
            if h is None:
                continue
            for i, v in enumerate(vals):
                h = re.sub(r'(?<![A-Za-z0-9])' + re.escape(v) + r'(?![A-Za-z0-9])', '{%d}' % i, h)
            heads[mask] = h
        pack['tableHeaders'] = heads
    out = os.path.join(ROOT, 'src/data/speech', f'{lang}.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(pack, open(out, 'w'), ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    print(lang, 'names', len(names), 'templates', len(pack.get('t', {})))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'ar')
