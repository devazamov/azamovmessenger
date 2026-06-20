import { createClient } from '@supabase/supabase-js';

// Supabase — media (rasm/video/ovoz/story) saqlash uchun ishlatiladi.
// Sozlanmagan bo'lsa (env bo'sh), media.js avtomatik Firebase Storage'ga tushadi.
// Qiymatlarni Supabase Dashboard -> Project Settings -> API dan oling.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'media';
export const supabaseEnabled = Boolean(url && anonKey);

export const supabase = supabaseEnabled ? createClient(url, anonKey) : null;
