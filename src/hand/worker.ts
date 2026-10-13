/** Web Worker entry: handwriting recognition off the main thread (the first call builds the templates). */
import { recognize } from './recognize';

const ctx = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage(m: unknown): void };
ctx.onmessage = (e: MessageEvent) => {
  const { id, input } = e.data as { id: number; input: { x: number[][]; y: number[][]; t?: number[][] } };
  try {
    ctx.postMessage({ id, result: recognize(input) });
  } catch (err) {
    ctx.postMessage({ id, error: String((err as Error).message ?? err) });
  }
};
// build the templates now, not on the first stroke
try {
  recognize({ x: [[10, 40, 70], [40, 40, 40]], y: [[10, 40, 70], [70, 40, 10]] });
} catch {
  /* ignore */
}
