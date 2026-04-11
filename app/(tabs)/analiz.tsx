import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { KATEGORILER } from '@/constants/data';
import { useApp } from '@/hooks/useApp';
import { aiAnalizUret } from '@/services/aiService';
import { userStatsGetir } from '@/services/learningService';
import { useAuth } from '@/template';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_MAX_WIDTH = SCREEN_WIDTH - 64 - 80;

const HEDEF_NET = 75;

const gunlukVeri = [
  { gun: 'Pzt', soru: 12, dogru: 9 },
  { gun: 'Sal', soru: 18, dogru: 14 },
  { gun: 'Çar', soru: 8, dogru: 5 },
  { gun: 'Per', soru: 22, dogru: 18 },
  { gun: 'Cum', soru: 15, dogru: 11 },
  { gun: 'Cmt', soru: 5, dogru: 4 },
  { gun: 'Paz', soru: 8, dogru: 6 },
];

export default function Analiz() {
  const { testSonuclari } = useApp();
  const { user } = useAuth();
  const [aktifPeriod, setAktifPeriod] = useState<'gunluk' | 'haftalik'>('haftalik');
  const [stats, setStats] = useState<{ xp: number; streak: number; level: number } | null>(null);

  const dogruSayisi = testSonuclari.filter(s => s.dogru).length;
  const yanlisSayisi = testSonuclari.filter(s => !s.dogru).length;
  const analiz = aiAnalizUret(dogruSayisi, yanlisSayisi);
  const toplamSoru = dogruSayisi + yanlisSayisi;
  const basariYuzdesi = toplamSoru > 0 ? Math.round((dogruSayisi / toplamSoru) * 100) : 0;

  // Tahmini net hesabı (KPSS 120 soruda doğru - yanlış/4)
  const TOPLAM_SORU = 120;
  const yanlisCezasi = yanlisSayisi > 0 ? yanlisSayisi / 4 : 0;
  const tahminiNet = toplamSoru > 0
    ? Math.max(0, Math.round((dogruSayisi - yanlisCezasi) * (TOPLAM_SORU / toplamSoru) * 10) / 10)
    : 0;
  const netDegisim = tahminiNet - (HEDEF_NET * 0.82); // mock trend
  const netArtis = netDegisim > 0;

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    const data = await userStatsGetir(user.id);
    if (data) setStats({ xp: data.xp, streak: data.streak, level: data.level });
  };

  const siraliBKategoriler = [...KATEGORILER].sort((a, b) => a.basariYuzdesi - b.basariYuzdesi);
  const maxSoru = Math.max(...gunlukVeri.map(d => d.soru));

  const getBarRenk = (yuzde: number) => {
    if (yuzde >= 70) return Colors.success;
    if (yuzde >= 50) return Colors.warning;
    return Colors.error;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.baslik}>Analiz</Text>
          <Text style={styles.altBaslik}>Performans özeti</Text>
        </View>

        {/* Özet Kartlar */}
        <View style={styles.ozetRow}>
          <View style={[styles.ozetKart, { borderColor: Colors.success + '40' }]}>
            <Text style={[styles.ozetSayi, { color: Colors.success }]}>{dogruSayisi}</Text>
            <Text style={styles.ozetLabel}>Doğru</Text>
          </View>
          <View style={[styles.ozetKart, { borderColor: Colors.error + '40' }]}>
            <Text style={[styles.ozetSayi, { color: Colors.error }]}>{yanlisSayisi}</Text>
            <Text style={styles.ozetLabel}>Yanlış</Text>
          </View>
          <View style={[styles.ozetKart, { borderColor: Colors.primary + '40' }]}>
            <Text style={[styles.ozetSayi, { color: Colors.primary }]}>%{basariYuzdesi}</Text>
            <Text style={styles.ozetLabel}>Başarı</Text>
          </View>
          <View style={[styles.ozetKart, { borderColor: Colors.gold + '40' }]}>
            <Text style={[styles.ozetSayi, { color: Colors.gold }]}>{toplamSoru}</Text>
            <Text style={styles.ozetLabel}>Toplam</Text>
          </View>
        </View>

        {/* Net Kartları */}
        <View style={styles.netRow}>
          <View style={styles.netKart}>
            <View style={styles.netIkon}>
              <MaterialIcons name="trending-up" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.netLabel}>Tahmini Net</Text>
            <Text style={[styles.netDeger, { color: Colors.primary }]}>{tahminiNet}</Text>
            <View style={[styles.netTrend, { backgroundColor: netArtis ? Colors.success + '20' : Colors.error + '20' }]}>
              <MaterialIcons
                name={netArtis ? 'arrow-upward' : 'arrow-downward'}
                size={12}
                color={netArtis ? Colors.success : Colors.error}
              />
              <Text style={[styles.netTrendText, { color: netArtis ? Colors.success : Colors.error }]}>
                {Math.abs(Math.round(netDegisim * 10) / 10)} son 7 gün
              </Text>
            </View>
          </View>
          <View style={[styles.netKart, styles.netKartHedef]}>
            <View style={[styles.netIkon, { backgroundColor: Colors.gold + '20' }]}>
              <MaterialIcons name="flag" size={18} color={Colors.gold} />
            </View>
            <Text style={styles.netLabel}>Hedef Net</Text>
            <Text style={[styles.netDeger, { color: Colors.gold }]}>{HEDEF_NET}</Text>
            <View style={styles.netProgressWrap}>
              <View style={styles.netProgressBg}>
                <View style={[styles.netProgressFill, {
                  width: `${Math.min((tahminiNet / HEDEF_NET) * 100, 100)}%`,
                  backgroundColor: tahminiNet >= HEDEF_NET ? Colors.success : Colors.gold,
                }]} />
              </View>
              <Text style={styles.netProgressText}>
                {Math.min(Math.round((tahminiNet / HEDEF_NET) * 100), 100)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Haftalık Grafik */}
        <View style={styles.bolum}>
          <View style={styles.bolumRow}>
            <Text style={styles.bolumBaslik}>📈 Haftalık İlerleme</Text>
            <View style={styles.periodToggle}>
              {(['gunluk', 'haftalik'] as const).map(p => (
                <Pressable
                  key={p}
                  style={[styles.periodBtn, aktifPeriod === p && styles.periodBtnAktif]}
                  onPress={() => setAktifPeriod(p)}
                >
                  <Text style={[styles.periodText, aktifPeriod === p && styles.periodTextAktif]}>
                    {p === 'gunluk' ? 'Günlük' : 'Haftalık'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.grafikKart}>
            <View style={styles.barGrafik}>
              {gunlukVeri.map((item, i) => {
                const barH = Math.max(4, (item.soru / maxSoru) * 80);
                const isToday = i === gunlukVeri.length - 2;
                return (
                  <View key={i} style={styles.barItem}>
                    <Text style={styles.barSayi}>{item.soru}</Text>
                    <View style={styles.barWrap}>
                      <View style={[styles.bar, {
                        height: barH,
                        backgroundColor: isToday ? Colors.primary : Colors.primary + '40',
                      }]} />
                    </View>
                    <Text style={[styles.barGun, isToday && { color: Colors.primary }]}>{item.gun}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Ders Bazlı Başarı */}
        <View style={styles.bolum}>
          <Text style={styles.bolumBaslik}>📚 Ders Bazlı Başarı</Text>
          <View style={styles.dersListesi}>
            {siraliBKategoriler.map(k => {
              const renk = getBarRenk(k.basariYuzdesi);
              const barW = (k.basariYuzdesi / 100) * BAR_MAX_WIDTH;
              return (
                <View key={k.id} style={styles.dersItem}>
                  <Text style={styles.dersEmoji}>{k.emoji}</Text>
                  <View style={styles.dersBilgi}>
                    <View style={styles.dersHeader}>
                      <Text style={styles.dersAd}>{k.ad}</Text>
                      <Text style={[styles.dersYuzde, { color: renk }]}>%{k.basariYuzdesi}</Text>
                    </View>
                    <View style={styles.dersBarBg}>
                      <View style={[styles.dersBarFill, { width: Math.max(4, barW), backgroundColor: renk }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* AI Önerisi */}
        <View style={styles.bolum}>
          <Text style={styles.bolumBaslik}>🤖 AI Koç Önerisi</Text>
          <View style={styles.aiKart}>
            <Text style={styles.aiMetin}>{analiz.gunlukOneri}</Text>
            <View style={styles.aiDivider} />
            {analiz.zayifKonular.map((z, i) => (
              <View key={i} style={styles.aiOneri}>
                <View style={styles.aiOneriDot} />
                <Text style={styles.aiOneriMetin}>{z.oneri}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* En Zayıf Konular */}
        <View style={styles.bolum}>
          <Text style={styles.bolumBaslik}>⚠️ En Zayıf Konular</Text>
          {analiz.zayifKonular.map((z, i) => (
            <View key={i} style={styles.zayifItem}>
              <View style={styles.zayifSol}>
                <Text style={styles.zayifDers}>{z.ders}</Text>
                <Text style={styles.zayifKonu}>{z.konu}</Text>
              </View>
              <View style={styles.zayifBadge}>
                <Text style={styles.zayifBadgeText}>Çalış</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  baslik: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  altBaslik: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  ozetRow: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, marginBottom: Spacing.md,
  },
  ozetKart: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.sm,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  ozetSayi: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  ozetLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, fontWeight: FontWeight.medium },
  // Net Kartları
  netRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  netKart: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  netKartHedef: { borderColor: Colors.gold + '40' },
  netIkon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  netLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  netDeger: { fontSize: 28, fontWeight: FontWeight.extrabold, lineHeight: 34 },
  netTrend: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  netTrendText: { fontSize: 10, fontWeight: FontWeight.semibold },
  netProgressWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  netProgressBg: { flex: 1, height: 5, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, overflow: 'hidden' },
  netProgressFill: { height: '100%', borderRadius: Radius.full },
  netProgressText: { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.bold },
  // Dönem toggle
  bolumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  periodToggle: { flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: Radius.full, padding: 2, borderWidth: 1, borderColor: Colors.border },
  periodBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  periodBtnAktif: { backgroundColor: Colors.primary },
  periodText: { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.medium },
  periodTextAktif: { color: '#fff', fontWeight: FontWeight.bold },
  bolum: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  bolumBaslik: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  grafikKart: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  barGrafik: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 110 },
  barItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  barSayi: { fontSize: 9, color: Colors.textMuted, marginBottom: 4 },
  barWrap: { width: '100%', alignItems: 'center', justifyContent: 'flex-end', height: 80 },
  bar: { width: '70%', borderRadius: Radius.sm },
  barGun: { fontSize: 9, color: Colors.textSecondary, marginTop: 4, fontWeight: FontWeight.medium },
  dersListesi: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    gap: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  dersItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dersEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  dersBilgi: { flex: 1 },
  dersHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  dersAd: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  dersYuzde: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  dersBarBg: { height: 6, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, overflow: 'hidden' },
  dersBarFill: { height: '100%', borderRadius: Radius.full },
  aiKart: {
    backgroundColor: Colors.primary + '15', borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  aiMetin: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20, fontWeight: FontWeight.medium },
  aiDivider: { height: 1, backgroundColor: Colors.primary + '30', marginVertical: Spacing.sm },
  aiOneri: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.xs },
  aiOneriDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primaryLight, marginTop: 6 },
  aiOneriMetin: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  zayifItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.sm + 4,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.error + '30',
  },
  zayifSol: {},
  zayifDers: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  zayifKonu: { fontSize: FontSize.xs, color: Colors.error, marginTop: 2 },
  zayifBadge: { backgroundColor: Colors.error + '20', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  zayifBadgeText: { fontSize: FontSize.xs, color: Colors.error, fontWeight: FontWeight.bold },
});
