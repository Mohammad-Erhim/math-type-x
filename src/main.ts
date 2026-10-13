/** Browser entry: vendor-compatible globals and the demo bootstrap. */
import { JsEditor, MathEditor, VERSION } from './ui/editor';
import { OutputPanel } from './ui/output';

const w = window as any;
w.com = w.com ?? {};
w.com.wiris = w.com.wiris ?? {};
w.com.wiris.jsEditor = w.com.wiris.jsEditor ?? {};
w.com.wiris.jsEditor.JsEditor = JsEditor;
w.MathTypeX = { MathEditor, JsEditor, OutputPanel, VERSION, create: (o?: any) => MathEditor.newInstance(o) };
