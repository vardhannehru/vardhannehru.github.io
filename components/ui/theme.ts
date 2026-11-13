import { useSyncExternalStore } from 'react';

// The site's two looks: the pastel theme ('light': Soft Lavender, Summer Green and Limencello, the main look) and
// the original dark theme ('dark'). The `dark` class on <html> drives Tailwind's `dark:` variants and the pastel
// overrides in index.html. A script in index.html sets it before the page paints: the visitor's saved choice,
// else the pastel theme. (Saved under a new key, so a choice saved before the pastel theme existed doesn't hide it.)

export type Theme = 'light' | 'dark';

const KEY = 'theme-v2';
const listeners = new Set<() => void>();

const read = (): Theme => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

/** Switches the theme. `remember` saves it as the visitor's choice. */
export function setTheme(theme: Theme, remember = true) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  if (remember) {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Storage unavailable: the switch still works for this visit.
    }
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => 'light');
}
