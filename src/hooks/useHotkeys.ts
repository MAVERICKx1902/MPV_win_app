import { useEffect } from 'react';

export interface Hotkey {
  /** Lower-case `event.key` values, e.g. `' '`, `'k'`, `'arrowright'`. */
  keys: string[];
  handler: (event: KeyboardEvent) => void;
  /** Fire even while an input/textarea is focused. */
  allowInInputs?: boolean;
  description?: string;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

/** Global keyboard map — matches the mpv/VLC muscle memory where possible. */
export function useHotkeys(hotkeys: Hotkey[]) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      for (const hotkey of hotkeys) {
        if (!hotkey.keys.includes(key)) continue;
        if (!hotkey.allowInInputs && isTypingTarget(event.target)) continue;
        if (event.metaKey || event.ctrlKey) continue;
        event.preventDefault();
        hotkey.handler(event);
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hotkeys]);
}
