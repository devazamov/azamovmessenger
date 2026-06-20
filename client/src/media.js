import { storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { supabase, supabaseEnabled, SUPABASE_BUCKET } from './supabase.js';

// Media qatlami: yangi yuklamalar Supabase Storage'ga ketadi.
// Supabase sozlanmagan yoki xato bersa — Firebase Storage'ga qaytadi (fallback).
// Eski Firebase URL'lari to'liq havola bo'lgani uchun avvalgidek o'qiladi.

async function supabaseUpload(path, data, contentType) {
  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(path, data, { contentType, upsert: false, cacheControl: '3600' });
  if (error) throw error;
  const { data: pub } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

async function firebaseUpload(path, data, contentType) {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, data, { contentType });
  return getDownloadURL(storageRef);
}

// Bitta umumiy yuklash nuqtasi — avval Supabase, kerak bo'lsa Firebase.
async function put(path, data, contentType) {
  const ct = contentType || data.type || 'application/octet-stream';
  if (supabaseEnabled) {
    try {
      return await supabaseUpload(path, data, ct);
    } catch (err) {
      console.warn('Supabase yuklash ishlamadi, Firebase Storage ishlatiladi:', err?.message || err);
    }
  }
  return firebaseUpload(path, data, ct);
}

const safeName = (name) => String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');

// Fayl yuklash (rasm/video/hujjat) — to'liq metadata bilan qaytadi.
export async function uploadFile(file, uid) {
  const path = `uploads/${uid}/${Date.now()}_${safeName(file.name)}`;
  const mime = file.type || 'application/octet-stream';
  const url = await put(path, file, mime);
  return {
    url,
    name: file.name,
    mime,
    size: file.size,
    isImage: mime.startsWith('image/'),
    isVideo: mime.startsWith('video/'),
  };
}

// Blob yuklash (ovoz, video xabar, story) — name kengaytmasi muhim.
export async function uploadBlob(blob, uid, name, folder = 'uploads') {
  const path = `${folder}/${uid}/${Date.now()}_${safeName(name)}`;
  return put(path, blob, blob.type || 'application/octet-stream');
}

export { supabaseEnabled };
