/** Geometry provider backed by the layout engine (for vertical caret movement and hit testing). */
import { EditorCore, Geometry } from '../core/engine';
import { Caret, Step } from '../core/model';
import { layoutDocument, pathKey, DocLayout } from './layout';
import { arabicCssFamily } from './arfonts';
import { measureEpoch } from './metrics';

export class DocGeometry implements Geometry {
  private cacheRow: unknown = null;
  private cacheJson = '';
  private lay: DocLayout | null = null;
  constructor(private core: EditorCore, private size = 16) {}

  layout(): DocLayout {
    const fam = arabicCssFamily(this.core.getFontFamily());
    const json = (this.core.rtl ? 'R' : 'L') + fam + '|' + measureEpoch() + JSON.stringify(this.core.row);
    if (!this.lay || json !== this.cacheJson) {
      this.lay = layoutDocument(this.core.row, this.core.attrs, this.size, this.core.rtl, fam);
      this.cacheJson = json;
    }
    return this.lay;
  }

  xOf(c: Caret): number | null {
    const g = this.layout().rows.get(pathKey(c.path));
    return g ? g.xs[Math.min(c.index, g.xs.length - 1)] : null;
  }

  yOf(c: Caret): number | null {
    const lay = this.layout();
    const g = lay.rows.get(pathKey(c.path));
    if (!g) return null;
    if (c.path.length === 0) return lay.rootYs[Math.min(c.index, lay.rootYs.length - 1)];
    return g.ys ? g.ys[Math.min(c.index, g.ys.length - 1)] : g.y;
  }

  positions(): { path: Step[]; index: number; x: number; y: number }[] {
    const lay = this.layout();
    const out: { path: Step[]; index: number; x: number; y: number }[] = [];
    for (const [key, g] of lay.rows) {
      g.xs.forEach((x, index) => {
        if (g.stops && !g.stops[index]) return;
        out.push({ path: g.path as Step[], index, x, y: key === '' ? lay.rootYs[Math.min(index, lay.rootYs.length - 1)] : g.ys ? g.ys[Math.min(index, g.ys.length - 1)] : g.y });
      });
    }
    return out;
  }

  nearest(path: Step[], x: number, from = 0, to = Infinity): number | null {
    const g = this.layout().rows.get(pathKey(path));
    if (!g) return null;
    let best = -1;
    let bd = Infinity;
    g.xs.forEach((v, i) => {
      if (i < from || i > to) return;
      const d = Math.abs(v - x);
      if (d < bd - 1e-6) {
        bd = d;
        best = i;
      }
    });
    return best < 0 ? null : best;
  }
}
