// Brauzer bildirishnomalari, ovozli signal va sarlavhadagi o'qilmagan soni.

let enabled = (() => {
  try { return localStorage.getItem('azamov.notify') !== 'off'; } catch { return true; }
})();

export function notificationsEnabled() { return enabled; }
export function setNotificationsEnabled(v) {
  enabled = !!v;
  try { localStorage.setItem('azamov.notify', v ? 'on' : 'off'); } catch {}
}

export async function requestNotifyPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

export function showNotification(title, { body, icon, onClick } = {}) {
  if (!enabled) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return; // faol oynada faqat ovoz
  try {
    const n = new Notification(title, { body, icon, tag: 'azamov-msg' });
    n.onclick = () => { window.focus(); onClick?.(); n.close(); };
  } catch {}
}

// Yangi xabar ovozi — WebAudio orqali yumshoq "pop" (fayl shart emas)
let audioCtx = null;
export function playPop() {
  if (!enabled) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.start(t);
    osc.stop(t + 0.26);
  } catch {}
}

// Qo'ng'iroq jiringlashi (takrorlanuvchi). to'xtatish funksiyasini qaytaradi.
export function startRingtone() {
  if (!('AudioContext' in window || 'webkitAudioContext' in window)) return () => {};
  let stopped = false;
  let ctx;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return () => {}; }
  const ring = () => {
    if (stopped) return;
    const t = ctx.currentTime;
    [0, 0.4].forEach((off) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.value = 480;
      g.gain.setValueAtTime(0.0001, t + off);
      g.gain.exponentialRampToValueAtTime(0.15, t + off + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.3);
      osc.start(t + off); osc.stop(t + off + 0.32);
    });
  };
  ring();
  const id = setInterval(ring, 2000);
  return () => { stopped = true; clearInterval(id); try { ctx.close(); } catch {} };
}

let baseTitle = 'AZAMOV';
export function setUnreadTitle(count) {
  document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
}
