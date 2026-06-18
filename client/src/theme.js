// Mavzu, accent rang va chat fonini boshqarish (localStorage'da saqlanadi).

export const ACCENTS = [
  { id: 'blue', color: '#3390ec', dark: '#2b7cd3' },
  { id: 'teal', color: '#33b5b5', dark: '#2a9595' },
  { id: 'green', color: '#4dcd5e', dark: '#3fae4d' },
  { id: 'orange', color: '#f5a623', dark: '#d98e16' },
  { id: 'pink', color: '#ee6a9e', dark: '#d9558a' },
  { id: 'purple', color: '#8774e1', dark: '#7460cf' },
  { id: 'red', color: '#e1564b', dark: '#cc463c' },
];

// Chat fonlari (Telegram wallpaper'lariga o'xshash gradientlar/naqshlar)
export const WALLPAPERS = [
  { id: 'classic', name: 'Klassik', light: '#cfd9e3', dark: '#0e1621' },
  { id: 'aurora', name: 'Shafaq', light: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)', dark: 'linear-gradient(135deg,#1f2b3e,#16202c)' },
  { id: 'sunset', name: 'Quyosh botishi', light: 'linear-gradient(135deg,#ffd3a5,#fd6585)', dark: 'linear-gradient(135deg,#3a2230,#241522)' },
  { id: 'mint', name: 'Yalpiz', light: 'linear-gradient(135deg,#d4fc79,#96e6a1)', dark: 'linear-gradient(135deg,#16301f,#0f2418)' },
  { id: 'lavender', name: 'Lavanda', light: 'linear-gradient(135deg,#e0c3fc,#8ec5fc)', dark: 'linear-gradient(135deg,#2a223e,#1a1830)' },
  { id: 'graphite', name: 'Grafit', light: '#e9edf0', dark: '#101010' },
];

const DEFAULTS = { mode: 'light', accent: 'blue', wallpaper: 'classic' };

export function loadSettings() {
  try {
    const raw = localStorage.getItem('azamov.theme');
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s) {
  try { localStorage.setItem('azamov.theme', JSON.stringify(s)); } catch {}
}

export function applySettings(s) {
  const root = document.documentElement;
  const dark = s.mode === 'dark';
  root.dataset.theme = dark ? 'dark' : 'light';

  const accent = ACCENTS.find((a) => a.id === s.accent) || ACCENTS[0];
  root.style.setProperty('--tg-blue', accent.color);
  root.style.setProperty('--tg-blue-dark', accent.dark);

  const wp = WALLPAPERS.find((w) => w.id === s.wallpaper) || WALLPAPERS[0];
  root.style.setProperty('--chat-bg', dark ? wp.dark : wp.light);
}
