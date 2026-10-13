#!/usr/bin/env python3
"""Build src/data/i18n/<lang>.json (English UI string -> translated string) from the reference editor bundle.

The reference ships one translation table per language inside its editor bundle
(com.wiris.system.ResourceLoader.translations['ar'] = '<translation><t k="general" v="..."/>...').
Keys are action ids; the English table gives the English wording.  Titles that the reference composes from
several keys are taken from the crawl of the English and Arabic toolbars (evidence/ref_lang_dump.json,
tools/probe_lang3.js), aligned element by element.

usage: python3 tools/gen/i18n.py [lang ...]        (default: ar)
"""
import html, json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BUNDLE = os.environ.get('EDITOR_BUNDLE') or os.path.join(ROOT, '.cache', 'editor_bundle.js')


def bundle() -> str:
    if not os.path.exists(BUNDLE):
        os.makedirs(os.path.dirname(BUNDLE), exist_ok=True)
        urllib.request.urlretrieve('https://www.wiris.net/demo/editor/editor', BUNDLE)
    return open(BUNDLE, encoding='utf8', errors='replace').read()


def tables(src: str) -> dict:
    out = {}
    for m in re.finditer(r"translations\['([a-zA-Z_-]+)'\]='<translation>(.*?)</translation>'", src, re.S):
        out[m.group(1)] = {k: html.unescape(v) for k, v in re.findall(r'<t k="([^"]*)" v="([^"]*)"/>', m.group(2))}
    return out


def main() -> None:
    langs = sys.argv[1:] or ['ar']
    tr = tables(bundle())
    en = tr['en']
    dump = None
    p = os.path.join(ROOT, 'evidence', 'ref_lang_dump.json')
    if os.path.exists(p):
        dump = json.load(open(p))
    for lang in langs:
        t = tr[lang]
        mp = {}
        conflicts = {}
        for k, v in en.items():
            if k not in t or not t[k] or t[k] == v:
                continue
            if v in mp and mp[v] != t[k]:
                conflicts.setdefault(v, {mp[v]}).add(t[k])
            mp.setdefault(v, t[k])
        # composed titles (shortcut suffixes, "(double-struck capital n)" …) from the aligned toolbar crawls
        aligned = 0
        if dump and lang in dump and 'en' in dump:
            for te, tl in zip(dump['en']['tabs'], dump[lang]['tabs']):
                for key in ('items', 'more'):
                    for a, b in zip(te[key] or [], tl[key] or []):
                        if a.get('title') and b.get('title') and a['title'] != b['title']:
                            if mp.get(a['title']) != b['title']:
                                mp[a['title']] = b['title']
                                aligned += 1
        os.makedirs(os.path.join(ROOT, 'src', 'data', 'i18n'), exist_ok=True)
        out = os.path.join(ROOT, 'src', 'data', 'i18n', f'{lang}.json')
        json.dump(mp, open(out, 'w'), ensure_ascii=False, separators=(',', ':'), sort_keys=True)
        print(lang, len(mp), 'strings,', aligned, 'from the toolbar crawl,', len(conflicts), 'ambiguous English values')


if __name__ == '__main__':
    main()
