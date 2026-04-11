import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

export interface AIYanit {
  content: string;
  error?: string;
}

export interface MiniSoruData {
  id: string;
  soru: string;
  siklar: string[];
  dogru_cevap: string;
  aciklama: string;
}

async function aiIstek(params: Record<string, string | object | undefined>): Promise<AIYanit> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('ai-learning', { body: params });

  if (error) {
    let errorMessage = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const text = await error.context?.text();
        errorMessage = text || error.message;
      } catch {}
    }
    return { content: '', error: errorMessage };
  }

  return { content: data?.content ?? '' };
}

export async function konuAnlat(konu: string, ders: string): Promise<AIYanit> {
  return aiIstek({ tip: 'konu_anlat', konu, ders });
}

export async function konuBasitlesir(konu: string, ders: string): Promise<AIYanit> {
  return aiIstek({ tip: 'basitleştir', konu, ders });
}

export async function ornekVer(konu: string, ders: string): Promise<AIYanit> {
  return aiIstek({ tip: 'örnek_ver', konu, ders });
}

export async function tekrarAnlat(konu: string, ders: string): Promise<AIYanit> {
  return aiIstek({ tip: 'tekrar_anlat', konu, ders });
}

export async function miniSoruUret(konu: string, ders: string): Promise<MiniSoruData[]> {
  const yanit = await aiIstek({ tip: 'soru_uret', konu, ders });
  if (yanit.error || !yanit.content) return [];
  try {
    const jsonStr = yanit.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    return parsed.sorular || [];
  } catch {
    return [];
  }
}

export async function aiSoruUret(params: {
  konu: string;
  ders: string;
  kategori?: string;
  zorluk?: 'Kolay' | 'Orta' | 'Zor';
  soru_sayisi?: number;
}): Promise<MiniSoruData[]> {
  const yanit = await aiIstek({
    tip: 'soru_uret',
    konu: params.konu,
    ders: params.ders,
    kategori: params.kategori,
    zorluk: params.zorluk ?? 'Orta',
    soru_sayisi: params.soru_sayisi ?? 5,
  });
  if (yanit.error || !yanit.content) return [];
  try {
    // JSON bloğunu bul ve ayrıştır
    let jsonStr = yanit.content.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    return (parsed.sorular || []).map((s: MiniSoruData & { zorluk?: string }) => ({
      ...s,
      zorluk: s.zorluk || params.zorluk || 'Orta',
    }));
  } catch (e) {
    console.error('aiSoruUret parse error:', e, yanit.content.slice(0, 200));
    return [];
  }
}

export async function yaziAnaliz(konu: string, kullanici_metni: string): Promise<{
  puan: number;
  dogru_noktalar: string[];
  eksikler: string[];
  oneri: string;
} | null> {
  const yanit = await aiIstek({ tip: 'yazi_analiz', konu, kullanici_metni });
  if (yanit.error || !yanit.content) return null;
  try {
    const jsonStr = yanit.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export async function chatMesaj(
  konu: string,
  kullanici_metni: string,
  gecmis: { role: string; content: string }[]
): Promise<AIYanit> {
  return aiIstek({ tip: 'chat', konu, kullanici_metni, gecmis_mesajlar: gecmis });
}

// Kullanıcı istatistikleri
export async function userStatsGetir(userId: string) {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

export async function userStatsGuncelle(userId: string, xpEkle: number) {
  const supabase = getSupabaseClient();
  const bugun = new Date().toISOString().split('T')[0];

  const mevcut = await userStatsGetir(userId);

  if (!mevcut) {
    await supabase.from('user_stats').insert({
      user_id: userId,
      xp: xpEkle,
      streak: 1,
      last_study_date: bugun,
      level: 1,
    });
    return { xp: xpEkle, streak: 1, level: 1 };
  }

  const lastDate = mevcut.last_study_date;
  const dun = new Date();
  dun.setDate(dun.getDate() - 1);
  const dunStr = dun.toISOString().split('T')[0];

  let yeniStreak = mevcut.streak;
  if (lastDate === dunStr) {
    yeniStreak = mevcut.streak + 1;
  } else if (lastDate !== bugun) {
    yeniStreak = 1;
  }

  const yeniXP = mevcut.xp + xpEkle;
  const yeniLevel = Math.floor(yeniXP / 500) + 1;

  await supabase.from('user_stats').update({
    xp: yeniXP,
    streak: yeniStreak,
    last_study_date: bugun,
    level: yeniLevel,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  return { xp: yeniXP, streak: yeniStreak, level: yeniLevel };
}

export async function seansKaydet(params: {
  user_id: string;
  kategori_id: string;
  konu_id: string;
  konu_ad: string;
  faz_tamamlandi: number;
  mini_sinav_skoru?: number;
  tamamlandi: boolean;
  xp_kazanildi: number;
}) {
  const supabase = getSupabaseClient();
  await supabase.from('study_sessions').insert({
    ...params,
    completed_at: params.tamamlandi ? new Date().toISOString() : null,
  });
}
