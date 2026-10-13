/** Keyboard mapping of the editing area (SRS 4.6). */
import { EditorCore } from './engine';

export interface Mods {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

export interface KeyHost {
  ed: EditorCore;
  /** run the General-tab control with this title (fraction, superscript, subscript) */
  runGeneral(title: string): void;
  /** returns true when the key was consumed */
}

/** Execute an editing key. Returns true when handled by the editor. */
export function handleKey(host: KeyHost, key: string, m: Mods): boolean {
  const ed = host.ed;
  const rtl = ed.rtl;
  const ctrl = m.ctrl || m.meta;
  if (m.alt) return false; // tab switching handled by the shell
  if (ctrl) {
    switch (key.toLowerCase()) {
      case 'a':
        ed.selectAll();
        return true;
      case 'b':
        ed.toggleBold();
        return true;
      case 'i':
        ed.toggleItalic();
        return true;
      case 'z':
        if (m.shift) return true; // Ctrl+Shift+Z has no effect
        ed.undo();
        return true;
      case 'y':
        ed.redo();
        return true;
      case '/':
        host.runGeneral('Fraction (Ctrl+/)');
        return true;
      case 'arrowup':
        if (m.shift) ed.nudge('up');
        else host.runGeneral('Superscript (Ctrl+Up)');
        return true;
      case 'arrowdown':
        if (m.shift) ed.nudge('down');
        else host.runGeneral('Subscript (Ctrl+Down)');
        return true;
      case 'arrowleft':
        if (m.shift) ed.nudge('left');
        return true;
      case 'arrowright':
        if (m.shift) ed.nudge('right');
        return true;
      default:
        return false; // c/x/v handled by clipboard events; others have no effect
    }
  }
  switch (key) {
    case 'ArrowLeft':
      rtl ? ed.moveRight(m.shift) : ed.moveLeft(m.shift);
      return true;
    case 'ArrowRight':
      rtl ? ed.moveLeft(m.shift) : ed.moveRight(m.shift);
      return true;
    case 'ArrowUp':
      ed.moveVertical(-1, m.shift);
      return true;
    case 'ArrowDown':
      ed.moveVertical(1, m.shift);
      return true;
    case 'Home':
      ed.home(m.shift);
      return true;
    case 'End':
      ed.end(m.shift);
      return true;
    case 'Backspace':
      ed.backspace();
      return true;
    case 'Delete':
      ed.del();
      return true;
    case 'Enter':
      ed.enter();
      return true;
    case 'Escape':
      return true; // no effect
    case 'Tab':
      return false; // leaves the editing area
    default:
      return false;
  }
}
