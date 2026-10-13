/** Tiny DOM helpers (no framework). */
export type Props = Record<string, any>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...kids: (Node | string | null | undefined | false)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in e && k !== 'list' && typeof v !== 'object') (e as any)[k] = v;
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c !== null && c !== undefined && c !== false) e.append(c as any);
  return e;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function svg(tag: string, props: Props = {}, ...kids: (Node | string)[]): SVGElement {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(props)) if (v !== undefined && v !== null) e.setAttribute(k, String(v));
  for (const c of kids) e.append(c as any);
  return e;
}
