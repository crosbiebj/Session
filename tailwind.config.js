/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Session's two modes (Book vs. dock) are chosen per-screen by design,
  // not by the device's OS light/dark preference (CLAUDE.md §6a) — so we
  // never want automatic OS-driven dark mode. 'class' (vs. the 'media'
  // default) also avoids a NativeWind web-runtime bug where its internal
  // dark-mode auto-sync unconditionally calls colorScheme.set(), which
  // throws when the strategy is 'media'.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Mode 1 — The Book (warm, journal-like). CLAUDE.md §6a.
        cream: '#F5F1E8',
        moss: '#3D4A34',
        tobacco: '#8B5A2B',
        ink: '#2B2620',
        amber: '#C08A3E',
        // Mode 2 — everywhere else (sleek, dark, carpy). CLAUDE.md §6a.
        'dock-bg': '#14170F',
        'dock-panel': '#1B1F16',
        'dock-panel-hover': '#232A1C',
        // CLAUDE.md specifies "thin hairline borders" without an exact
        // hex for Mode 2 — derived to sit between panel and panel-hover.
        'dock-border': '#262B1E',
        'dock-moss': '#5C7A4C',
        'dock-amber': '#C9974A',
        'dock-text': '#EDEBE0',
        'dock-text-dim': '#8B9184',
        'dock-text-faint': '#5C6154',
      },
      fontFamily: {
        // Book-mode headings (serif). Body/data is Inter in both modes.
        serif: ['Fraunces-SemiBold'],
        'serif-regular': ['Fraunces-Regular'],
        sans: ['Inter-Regular'],
        'sans-medium': ['Inter-Medium'],
        'sans-semibold': ['Inter-SemiBold'],
        // Mode-2-only condensed labels/headers.
        label: ['Oswald-Medium'],
        'label-semibold': ['Oswald-SemiBold'],
      },
    },
  },
  plugins: [],
};
