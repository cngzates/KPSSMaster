import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { KATEGORILER } from '@/constants/data';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';
import { userStatsGetir, userStatsGuncelle } from '@/services/learningService';

interface UserStats { xp: number; streak: number; level: number }
const XP_PER_LEVEL = 500;
const GOREV_BONUS_XP = 100;

export default function AnaSayfa() {
  const router = useRouter();
  const { aktifKategoriSec } = useApp();
  const { user } = useAuth();

  const [stats, setStats] = useState<UserStats>({ xp: 0, streak: 0, level: 1 });
  const [isPremium, setIsPremium] = useState(false);
  const [soruSayisi, setSoruSayisi] = useState(0);
  const [ozelTestYukleniyor, setOzelTestYukleniyor] = useState(false);
  const [zayifAlanlar, setZayifAlanlar] = useState(
    KATEGORILER.slice().sort((a, b) => a.basariYuzdesi - b.basariYuzdesi).slice(0, 2)
  );

  const displayAd = user?.username || user?.email?.split('@')[0] || 'Öğrenci';

  useEffect(() => {
    if (user) {
      loadStats();
      loadGunlukSoru();
      loadZayifKategoriler();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    const data = await userStatsGetir(user.id);
    if (data) {
      setStats({ xp: data.xp, streak: data.streak, level: data.level });
      setIsPremium(data.is_premium ?? false);
    }
  };

  const loadGunlukSoru = async () => {
    if (!user) return;
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('soru_gecmisi').select('id', { count: 'exact', head: false })
        .eq('user_id', user.id).gte('created_at', bugun.toISOString());
      setSoruSayisi(data?.length ?? 0);
    } catch {}
  };

  const loadZayifKategoriler = async () => {
    if (!user) return;
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.from('soru_gecmisi').select('kategori, dogru').eq('user_id', user.id);
      if (!data || data.length < 5) return;
      const gruplar: Record<string, { dogru: number; toplam: number }> = {};
      for (const row of data) {
        const kat = row.kategori as string;
        if (!kat || kat === 'qr') continue;
        if (!gruplar[kat]) gruplar[kat] = { dogru: 0, toplam: 0 };
        gruplar[kat].toplam += 1;
        if (row.dogru) gruplar[kat].dogru += 1;
      }
      const sirali = Object.entries(gruplar)
        .filter(([, v]) => v.toplam >= 3)
        .map(([id, v]) => ({ id, basari: Math.round((v.dogru / v.toplam) * 100) }))
        .sort((a, b) => a.basari - b.basari);
      const zengin = sirali.map(s => KATEGORILER.find(k => k.id === s.id)).filter(Boolean) as typeof KATEGORILER;
      if (zengin.length >= 2) setZayifAlanlar(zengin.slice(0, 2));
    } catch {}
  };

  const handleBanaOzelTest = async () => {
    if (ozelTestYukleniyor) return;
    setOzelTestYukleniyor(true);
    try {
      let hedef = zayifAlanlar.length > 0 ? zayifAlanlar : KATEGORILER.slice().sort((a, b) => a.basariYuzdesi - b.basariYuzdesi).slice(0, 3);
      const zayifIds = hedef.map(k => k.id).join(',');
      const zayifAdlar = hedef.map(k => k.ad).join(', ');
      const ilk = hedef[0];
      const konu = ilk.konular.slice().sort((a, b) => a.basariYuzdesi - b.basariYuzdesi)[0];
      router.push({ pathname: '/soru', params: { mod: 'kisisel', kategoriId: ilk.id, konuAd: konu?.ad ?? ilk.ad, zayifKategoriIds: zayifIds, zayifKategoriAdlar: zayifAdlar } });
    } finally {
      setOzelTestYukleniyor(false);
    }
  };

  const handleOgrenmeDongusu = () => {
    const zayif = zayifAlanlar[0] ?? KATEGORILER.sort((a, b) => a.basariYuzdesi - b.basariYuzdesi)[0];
    const konu = zayif.konular.sort((a, b) => a.basariYuzdesi - b.basariYuzdesi)[0];
    router.push({ pathname: '/ogrenme-dongusu', params: { kategoriId: zayif.id, konuId: konu.id, konuAd: konu.ad, ders: zayif.ders } });
  };

  const xpProgress = (stats.xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100;
  const soruIlerleme = Math.min((soruSayisi / 20) * 100, 100);
  const soruTamamlandi = soruSayisi >= 20;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.icerik}>

        {/* ─── Başlık ─── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>KPSS Master</Text>
            <Text style={styles.selam}>Merhaba, {displayAd} 👋</Text>
          </View>
          <View style={styles.headerSag}>
            <Pressable
              style={styles.streakBadge}
              onPress={() => router.push('/(tabs)/profil')}
            >
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={styles.streakText}>{stats.streak}</Text>
            </Pressable>
          </View>
        </View>

        {/* ─── XP / Level ─── */}
        {user && (
          <View style={styles.xpKart}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNum}>{stats.level}</Text>
              <Text style={styles.levelLbl}>Lv</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.xpRow}>
                <Text style={styles.xpLabel}>{stats.xp} XP</Text>
                <Text style={styles.xpKalan}>{XP_PER_LEVEL - (stats.xp % XP_PER_LEVEL)} XP kaldı</Text>
              </View>
              <View style={styles.xpBar}>
                <View style={[styles.xpFill, { width: `${xpProgress}%` }]} />
              </View>
            </View>
          </View>
        )}

        {/* ─── Günlük Hedef ─── */}
        <View style={styles.hedefKart}>
          <View style={styles.hedefRow}>
            <Text style={styles.hedefBaslik}>Günlük Hedef</Text>
            <Text style={[styles.hedefSayi, { color: soruTamamlandi ? Colors.success : Colors.primary }]}>
              {soruSayisi}/20 soru
            </Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${soruIlerleme}%`, backgroundColor: soruTamamlandi ? Colors.success : Colors.primary }]} />
          </View>
          <Text style={styles.hedefAlt}>
            {soruTamamlandi ? '🎉 Günlük hedefi tamamladın!' : `${20 - soruSayisi} soru daha çöz`}
          </Text>
        </View>

        {/* ─── Ana Aksiyonlar ─── */}
        <Text style={styles.bolumBaslik}>Başla</Text>

        {/* Bana Özel Test */}
        <Pressable
          style={({ pressed }) => [styles.ozelBtn, pressed && { opacity: 0.88 }, ozelTestYukleniyor && { opacity: 0.75 }]}
          onPress={handleBanaOzelTest}
          disabled={ozelTestYukleniyor}
        >
          {ozelTestYukleniyor
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.ozelBtnEmoji}>🚀</Text>}
          <View style={{ flex: 1 }}>
            <Text style={styles.ozelBtnBaslik}>Bana Özel Test</Text>
            <Text style={styles.ozelBtnAlt}>
              {zayifAlanlar.length > 0 ? `${zayifAlanlar.map(k => k.ad).join(' & ')} • 10 soru` : 'Zayıf alanlarına göre 10 soru'}
            </Text>
          </View>
          <MaterialIcons name="arrow-forward" size={20} color="#fff" />
        </Pressable>

        {/* Öğrenme Döngüsü */}
        <Pressable
          style={({ pressed }) => [styles.donguBtn, pressed && { opacity: 0.88 }]}
          onPress={handleOgrenmeDongusu}
        >
          <View style={styles.donguIkon}>
            <MaterialIcons name="loop" size={24} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.donguBaslik}>Öğrenme Döngüsü</Text>
            <Text style={styles.donguAlt}>Konu → AI Anlatım → Tekrar → Mini Sınav</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={Colors.primary} />
        </Pressable>

        {/* Hızlı Soru Çöz */}
        <View style={styles.hizliRow}>
          <Pressable
            style={({ pressed }) => [styles.hizliKart, styles.hizliMavi, pressed && styles.pressed]}
            onPress={() => { aktifKategoriSec(KATEGORILER.find(k => k.id === 'turkce')!); router.push({ pathname: '/soru', params: { kategoriId: 'turkce', mod: 'hizli' } }); }}
          >
            <Text style={styles.hizliEmoji}>🧠</Text>
            <Text style={styles.hizliBaslik}>Genel Yetenek</Text>
            <Text style={styles.hizliAlt}>Türkçe & Matematik</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.hizliKart, styles.hizliTuruncu, pressed && styles.pressed]}
            onPress={() => { aktifKategoriSec(KATEGORILER.find(k => k.id === 'tarih')!); router.push({ pathname: '/soru', params: { kategoriId: 'tarih', mod: 'hizli' } }); }}
          >
            <Text style={styles.hizliEmoji}>🌍</Text>
            <Text style={styles.hizliBaslik}>Genel Kültür</Text>
            <Text style={styles.hizliAlt}>Tarih & Coğrafya</Text>
          </Pressable>
        </View>

        {/* ─── Zayıf Alanlar ─── */}
        {zayifAlanlar.length > 0 && (
          <>
            <Text style={styles.bolumBaslik}>⚠️ Zayıf Alanların</Text>
            {zayifAlanlar.map(k => (
              <Pressable
                key={k.id}
                style={({ pressed }) => [styles.zayifKart, pressed && styles.pressed]}
                onPress={() => { aktifKategoriSec(k); router.push({ pathname: '/konular', params: { kategoriId: k.id } }); }}
              >
                <Text style={styles.zayifEmoji}>{k.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.zayifBaslik}>{k.ad}</Text>
                  <View style={styles.zayifBar}>
                    <View style={[styles.zayifFill, { width: `${k.basariYuzdesi}%`, backgroundColor: k.basariYuzdesi < 50 ? Colors.error : Colors.warning }]} />
                  </View>
                </View>
                <Text style={[styles.zayifYuzde, { color: k.basariYuzdesi < 50 ? Colors.error : Colors.warning }]}>%{k.basariYuzdesi}</Text>
                <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
              </Pressable>
            ))}
          </>
        )}

        {/* ─── Premium / 120 Soru ─── */}
        {isPremium ? (
          <Pressable
            style={({ pressed }) => [styles.premiumKart, pressed && { opacity: 0.88 }]}
            onPress={() => router.push({ pathname: '/soru', params: { kategoriId: 'turkce', mod: 'premium', soru_sayisi: '120' } })}
          >
            <Text style={{ fontSize: 22 }}>💯</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.premiumKartBaslik, { color: Colors.gold }]}>120 Soruluk Deneme</Text>
              <Text style={[styles.premiumKartAlt, { color: Colors.gold + 'AA' }]}>Tam KPSS formatı • PRO</Text>
            </View>
            <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.premiumKart, styles.premiumKartKilitli, pressed && { opacity: 0.88 }]}
            onPress={() => router.push('/premium')}
          >
            <MaterialIcons name="lock" size={20} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.premiumKartBaslik, { color: Colors.gold }]}>Premium'a Geç</Text>
              <Text style={[styles.premiumKartAlt, { color: Colors.gold + 'AA' }]}>120 soru modu + AI koç • ₺149</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={Colors.gold} />
          </Pressable>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  icerik: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  appName: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  selam: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  headerSag: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.bgCard, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
  },
  streakFire: { fontSize: 18 },
  streakText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.gold },

  // XP
  xpKart: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
  },
  levelBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primary + '50',
  },
  levelNum: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold, color: Colors.primary, lineHeight: 18 },
  levelLbl: { fontSize: 9, color: Colors.primary, fontWeight: FontWeight.bold },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.gold },
  xpKalan: { fontSize: FontSize.xs, color: Colors.textMuted },
  xpBar: { height: 6, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: Radius.full },

  // Günlük Hedef
  hedefKart: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  hedefRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  hedefBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  hedefSayi: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold },
  progressBg: { height: 7, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: Radius.full },
  hedefAlt: { fontSize: FontSize.xs, color: Colors.textMuted },

  bolumBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Özel Test
  ozelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 16, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  ozelBtnEmoji: { fontSize: 22 },
  ozelBtnBaslik: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold, color: '#fff' },
  ozelBtnAlt: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // Öğrenme Döngüsü
  donguBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.primary + '40',
  },
  donguIkon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center',
  },
  donguBaslik: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  donguAlt: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  // Hızlı Başla
  hizliRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  hizliKart: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, minHeight: 95, justifyContent: 'flex-end' },
  hizliMavi: { backgroundColor: Colors.primary + '18', borderWidth: 1, borderColor: Colors.primary + '40' },
  hizliTuruncu: { backgroundColor: Colors.warning + '18', borderWidth: 1, borderColor: Colors.warning + '40' },
  hizliEmoji: { fontSize: 24, marginBottom: Spacing.xs },
  hizliBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  hizliAlt: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },

  // Zayıf Alanlar
  zayifKart: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  zayifEmoji: { fontSize: 22 },
  zayifBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: 5 },
  zayifBar: { height: 5, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, overflow: 'hidden' },
  zayifFill: { height: '100%', borderRadius: Radius.full },
  zayifYuzde: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, minWidth: 32, textAlign: 'right' },

  // Premium
  premiumKart: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.gold + '12', borderRadius: Radius.lg,
    padding: Spacing.md, marginTop: Spacing.sm,
    borderWidth: 1, borderColor: Colors.gold + '35',
  },
  premiumKartKilitli: { backgroundColor: Colors.gold + '08' },
  premiumKartBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold },
  premiumKartAlt: { fontSize: FontSize.xs, marginTop: 2 },
  proBadge: { backgroundColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  proBadgeText: { fontSize: 10, fontWeight: FontWeight.extrabold, color: Colors.bg },
});
