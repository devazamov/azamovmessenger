// Maxfiy chat shifrlash — AES-GCM (Web Crypto).
// DIQQAT: bu demo darajadagi shifrlash. Kalit chat hujjatida saqlanadi, shuning
// uchun bu "to'liq E2E" emas — xabarlar bazada shifrlangan holda yotadi va
// faqat kalitga ega a'zolar o'qiy oladi. Haqiqiy E2E uchun kalit almashinuvi
// (Diffie-Hellman) kerak.

const enc = new TextEncoder();
const dec = new TextDecoder();

function bufToB64(buf) {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64ToBuf(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out.buffer;
}

// Yangi 256-bit kalit (base64) — maxfiy chat yaratilganda chaqiriladi.
export async function generateSecretKey() {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = await crypto.subtle.exportKey('raw', key);
  return bufToB64(raw);
}

async function importKey(b64) {
  return crypto.subtle.importKey('raw', b64ToBuf(b64), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

// Matnni shifrlash -> { iv, data } (ikkalasi ham base64).
export async function encryptText(text, keyB64) {
  const key = await importKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  return { iv: bufToB64(iv), data: bufToB64(cipher) };
}

// { iv, data } -> matn. Xato bo'lsa null.
export async function decryptText(payload, keyB64) {
  try {
    const key = await importKey(keyB64);
    const iv = new Uint8Array(b64ToBuf(payload.iv));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, b64ToBuf(payload.data));
    return dec.decode(plain);
  } catch {
    return null;
  }
}

// Bir nechta xabarni deshifrlash — body maydonini to'ldiradi.
export async function decryptMessages(msgs, keyB64) {
  if (!keyB64) return msgs;
  return Promise.all(msgs.map(async (m) => {
    if (m.enc && !m.body) {
      const text = await decryptText(m.enc, keyB64);
      return { ...m, body: text ?? '🔒 (deshifrlab bo\'lmadi)' };
    }
    return m;
  }));
}
