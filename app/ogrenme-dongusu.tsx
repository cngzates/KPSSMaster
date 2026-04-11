import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Vibration
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence
} from 'react-native-reanimated';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useAuth } from '@/template';
import { seansKaydet, userStatsGuncelle } from '@/services/learningService';

interface Faz {
  id: number;
  ad: string;
  sure: number; // saniye
  renk: string;
  ikon: keyof typeof MaterialIcons.glyphMap;
  aciklama: string;
  rota?: string;
  xp: number;
}

const FAZLAR: Faz[] = [
  { id: 1, ad: 'Soru Çözme', sure: 15 * 60, renk: Colors.primary, ikon: 'quiz', aciklama: 'Bu konudan sorular çöz, pratik yap.', rota: 'soru', xp: 30 },
  { id: 2, ad: 'Mola', sure: 5 * 60, renk: Colors.success, ikon: 'self-improvement', aciklama: 'Kafanı dinlendir, su iç, nefes al.', xp: 5 },
  { id: 3, ad: 'AI Konu Anlatımı', sure: 15 * 60, renk: '#9B5DE5', ikon: 'auto-awesome', aciklama: 'AI koçun konuyu sana anlatıyor.', rota: 'konu-anlatim', xp: 40 },
  { id: 4, ad: 'Mola', sure: 5 * 60, renk: Colors.success, ikon: 'self-improvement', aciklama: 'Kafanı dinlendir, su iç, nefes al.', xp: 5 },
  { id: 5, ad: 'Tekrar & Yazma', sure: 15 * 60, renk: Colors.warning, ikon: 'edit-note', aciklama: 'Öğrendiklerini yaz, pekiştir.', rota: 'tekrar', xp: 35 },
  { id: 6, ad: 'Mola', sure: 5 * 60, renk: Colors.success, ikon: 'self-improvement', aciklama: 'Son molana iyi kullan!', xp: 5 },
  { id: 7, ad: 'Mini Sınav', sure: 10 * 60, renk: Colors.gold, ikon: 'emoji-events', aciklama: 'Ne kadar öğrendin? Test et!', rota: 'mini-sinav', xp: 50 },
];

function saniyeFormatla(s: number): string {
  const dk = Math.floor(s / 60);
  const sn = s % 60;
  return `${dk.toString().padStart(2, '0')}:${sn.toString().padStart(2, '0')}`;
}

export default function OgrenmeDongusu() {
  const router = useRouter();
  const { kategoriId, konuId, konuAd, ders } = useLocalSearchParams<{
    kategoriId: string; konuId: string; konuAd: string; ders: string;
  }>();
  const { user } = useAuth();

  const [aktifFazIdx, setAktifFazIdx] = useState(0);
  const [kalan, setKalan] = useState(FAZLAR[0].sure);
  const [calisiyor, setCalisor] = useState(false);
  const [tamamlanan, setTamamlanan] = useState<number[]>([]);
  const [seansBasladi, setSeansBasladi] = useState(false);
  const [toplamXP, setToplamXP] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aktifFaz = FAZLAR[aktifFazIdx];

  const pulseAnim = useSharedValue(1);
  const timerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  useEffect(() => {
    if (calisiyor) {
      pulseAnim.value = withRepeat(
        withSequence(withTiming(1.03, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1,
        true
      );
    } else {
      pulseAnim.value = withTiming(1);
    }
  }, [calisiyor]);

  useEffect(() => {
    setKalan(aktifFaz.sure);
    setCalisor(false);
  }, [aktifFazIdx]);

  useEffect(() => {
    if (calisiyor) {
      timerRef.current = setInterval(() => {
        setKalan(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            fazTamamla();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [calisiyor, aktifFazIdx]);

  const fazTamamla = useCallback(() => {
    Vibration.vibrate(300);
    const xp = aktifFaz.xp;
    setToplamXP(prev => prev + xp);
    setTamamlanan(prev => [...prev, aktifFaz.id]);

    if (aktifFazIdx < FAZLAR.length - 1) {
      setAktifFazIdx(prev => prev + 1);
    } else {
      // Tüm döngü tamamlandı
      tamamlaVeKaydet();
    }
  }, [aktifFazIdx, aktifFaz]);

  const tamamlaVeKaydet = async () => {
    if (user) {
      const kazanilanXP = FAZLAR.reduce((sum, f) => sum + f.xp, 0);
      await seansKaydet({
        user_id: user.id,
        kategori_id: kategoriId || '',
        konu_id: konuId || '',
        konu_ad: konuAd || '',
        faz_tamamlandi: FAZLAR.length,
        tamamlandi: true,
        xp_kazanildi: kazanilanXP,
      });
      await userStatsGuncelle(user.id, kazanilanXP);
    }
    router.replace('/(tabs)');
  };

  const fazaGit = () => {
    if (aktifFaz.rota) {
      if (timerRef.current) clearInterval(timerRef.current);
      router.push({
        pathname: `/${aktifFaz.rota}` as any,
        params: { kategoriId, konuId, konuAd, ders },
      });
    }
  };

  const ilerlemeYuzdesi = ((aktifFazIdx) / FAZLAR.length) * 100;
  const timerYuzdesi = kalan / aktifFaz.sure;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.geriBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerOrta}>
          <Text style={styles.konuAd} numberOfLines={1}>{konuAd || 'Konu Adı'}</Text>
          <Text style={styles.dersAd}>{ders || 'Ders'}</Text>
        </View>
        <View style={styles.xpBadge}>
          <Text style={styles.xpText}>+{toplamXP} XP</Text>
        </View>
      </View>

      {/* Genel İlerleme */}
      <View style={styles.genelIlerleme}>
        <View style={styles.ilerlemeBar}>
          <View style={[styles.ilerlemeFill, {
            width: `${ilerlemeYuzdesi}%`,
            backgroundColor: aktifFaz.renk
          }]} />
        </View>
        <Text style={styles.ilerlemeText}>{aktifFazIdx}/{FAZLAR.length} faz</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Aktif Faz Göstergesi */}
        <View style={[styles.aktifFazKart, { borderColor: aktifFaz.renk + '60' }]}>
          <View style={[styles.fazIkonCircle, { backgroundColor: aktifFaz.renk + '20' }]}>
            <MaterialIcons name={aktifFaz.ikon} size={40} color={aktifFaz.renk} />
          </View>
          <Text style={[styles.aktifFazAd, { color: aktifFaz.renk }]}>
            Faz {aktifFaz.id}: {aktifFaz.ad}
          </Text>
          <Text style={styles.aktifFazAciklama}>{aktifFaz.aciklama}</Text>

          {/* Dairesel Timer */}
          <Animated.View style={[styles.timerWrap, timerStyle]}>
            <View style={[styles.timerCircle, { borderColor: aktifFaz.renk }]}>
              <Text style={[styles.timerText, { color: aktifFaz.renk }]}>
                {saniyeFormatla(kalan)}
              </Text>
              <Text style={styles.timerLabel}>
                {calisiyor ? 'devam ediyor' : 'bekliyor'}
              </Text>
            </View>
            {/* Progress ring overlay */}
            <View style={[styles.timerProgress, {
              borderColor: aktifFaz.renk + '25',
              borderTopColor: aktifFaz.renk,
            }]} />
          </Animated.View>

          {/* Kontroller */}
          <View style={styles.kontrolRow}>
            <Pressable
              style={({ pressed }) => [styles.kontrolBtn, { backgroundColor: aktifFaz.renk + '20' }, pressed && { opacity: 0.7 }]}
              onPress={() => setKalan(aktifFaz.sure)}
            >
              <MaterialIcons name="refresh" size={22} color={aktifFaz.renk} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.baslatBtn, { backgroundColor: aktifFaz.renk }, pressed && { opacity: 0.85 }]}
              onPress={() => setCalisor(p => !p)}
            >
              <MaterialIcons name={calisiyor ? 'pause' : 'play-arrow'} size={28} color="#fff" />
              <Text style={styles.baslatBtnText}>{calisiyor ? 'Durdur' : (seansBasladi ? 'Devam' : 'Başlat')}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.kontrolBtn, { backgroundColor: aktifFaz.renk + '20' }, pressed && { opacity: 0.7 }]}
              onPress={fazTamamla}
            >
              <MaterialIcons name="skip-next" size={22} color={aktifFaz.renk} />
            </Pressable>
          </View>

          {/* Aktiviteye Git */}
          {aktifFaz.rota && (
            <Pressable
              style={({ pressed }) => [styles.aktiviteBtn, { borderColor: aktifFaz.renk }, pressed && { opacity: 0.85 }]}
              onPress={() => { setSeansBasladi(true); fazaGit(); }}
            >
              <MaterialIcons name="open-in-new" size={16} color={aktifFaz.renk} />
              <Text style={[styles.aktiviteBtnText, { color: aktifFaz.renk }]}>
                {aktifFaz.ad} Ekranını Aç
              </Text>
            </Pressable>
          )}
        </View>

        {/* Sonraki Faz */}
        {aktifFazIdx < FAZLAR.length - 1 && (
          <View style={styles.sonrakiFazWrap}>
            <Text style={styles.sonrakiLabel}>Sonraki Faz →</Text>
            <View style={styles.sonrakiFazKart}>
              <MaterialIcons name={FAZLAR[aktifFazIdx + 1].ikon} size={18} color={Colors.textMuted} />
              <Text style={styles.sonrakiFazAd}>{FAZLAR[aktifFazIdx + 1].ad}</Text>
              <Text style={styles.sonrakiFazSure}>
                {FAZLAR[aktifFazIdx + 1].sure / 60} dk
              </Text>
            </View>
          </View>
        )}

        {/* Tüm Fazlar */}
        <View style={styles.fazlarBaslik}>
          <Text style={styles.fazlarBaslikText}>Öğrenme Döngüsü</Text>
        </View>
        <View style={styles.fazlarListesi}>
          {FAZLAR.map((faz, idx) => {
            const tamamlandi = tamamlanan.includes(faz.id);
            const aktif = idx === aktifFazIdx;
            return (
              <View key={faz.id} style={[
                styles.fazItem,
                aktif && { backgroundColor: faz.renk + '15', borderColor: faz.renk + '40' },
                tamamlandi && styles.fazItemTamamlandi,
              ]}>
                <View style={[styles.fazIkonKucuk, {
                  backgroundColor: tamamlandi ? Colors.success + '20' : faz.renk + '15',
                }]}>
                  <MaterialIcons
                    name={tamamlandi ? 'check' : faz.ikon}
                    size={16}
                    color={tamamlandi ? Colors.success : faz.renk}
                  />
                </View>
                <View style={styles.fazBilgi}>
                  <Text style={[styles.fazAd, aktif && { color: faz.renk, fontWeight: FontWeight.bold }]}>
                    {faz.ad}
                  </Text>
                  <Text style={styles.fazSure}>{faz.sure / 60} dk • +{faz.xp} XP</Text>
                </View>
                {aktif && (
                  <View style={[styles.aktifDot, { backgroundColor: faz.renk }]} />
                )}
                {tamamlandi && (
                  <MaterialIcons name="check-circle" size={18} color={Colors.success} />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const TIMER_SIZE = 180;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, gap: Spacing.sm,
  },
  geriBtn: { padding: 4 },
  headerOrta: { flex: 1 },
  konuAd: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  dersAd: { fontSize: FontSize.xs, color: Colors.textMuted },
  xpBadge: {
    backgroundColor: Colors.gold + '20', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: Colors.gold + '40',
  },
  xpText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  genelIlerleme: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    gap: Spacing.sm, marginBottom: Spacing.md,
  },
  ilerlemeBar: { flex: 1, height: 6, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, overflow: 'hidden' },
  ilerlemeFill: { height: '100%', borderRadius: Radius.full },
  ilerlemeText: { fontSize: FontSize.xs, color: Colors.textMuted, minWidth: 40, textAlign: 'right' },
  scrollContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  aktifFazKart: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
  },
  fazIkonCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  aktifFazAd: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: 4 },
  aktifFazAciklama: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
  timerWrap: {
    width: TIMER_SIZE, height: TIMER_SIZE, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg, position: 'relative',
  },
  timerCircle: {
    width: TIMER_SIZE, height: TIMER_SIZE, borderRadius: TIMER_SIZE / 2,
    borderWidth: 4, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bgSurface,
  },
  timerProgress: {
    position: 'absolute', width: TIMER_SIZE + 8, height: TIMER_SIZE + 8,
    borderRadius: (TIMER_SIZE + 8) / 2, borderWidth: 3,
    borderColor: 'transparent',
  },
  timerText: { fontSize: 36, fontWeight: FontWeight.extrabold, letterSpacing: 2 },
  timerLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },
  kontrolRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  kontrolBtn: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  baslatBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl,
    paddingVertical: 14, borderRadius: Radius.full, gap: Spacing.xs,
  },
  baslatBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  aktiviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    borderRadius: Radius.full, borderWidth: 1.5,
  },
  aktiviteBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  sonrakiFazWrap: { marginBottom: Spacing.md },
  sonrakiLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 6 },
  sonrakiFazKart: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard,
    borderRadius: Radius.md, padding: Spacing.sm + 4, gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  sonrakiFazAd: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  sonrakiFazSure: { fontSize: FontSize.xs, color: Colors.textMuted },
  fazlarBaslik: { marginBottom: Spacing.sm },
  fazlarBaslikText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  fazlarListesi: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  fazItem: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm,
    borderWidth: 1, borderColor: 'transparent', margin: 2, borderRadius: Radius.md,
  },
  fazItemTamamlandi: { opacity: 0.6 },
  fazIkonKucuk: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  fazBilgi: { flex: 1 },
  fazAd: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  fazSure: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  aktifDot: { width: 8, height: 8, borderRadius: 4 },
});
