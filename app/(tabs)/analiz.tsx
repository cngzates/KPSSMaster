import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, Pressable, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useApp } from '@/hooks/useApp';
import { aiAnalizUret } from '@/services/aiService';
import { userStatsGetir } from '@/services/learningService';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_MAX_WIDTH = SCREEN_WIDTH - 64 - 80;
const HEDEF_NET = 75;

const GUN_ADLARI = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

interface GunlukVeri {
  gun: string;
  soru: number;
  dogru: number;
}

interface DersStat {
  ders: string;
  kategori: string;
  toplam: number;
  dogru: number;
  basariYuzdesi: number;
}

interface AnalizData {
  toplam: number;
  dogru: number;
  yanlis: number;
  haftalikVeri: GunlukVeri[];
  dersStat: DersStat[];
  tahminiNet: number;
  netDegisim: number;
}

const BOŞ_HAFTALIK = (): GunlukVeri[] => {
  const bugun = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(bugun);
    d.setDate(bugun.getDate() - (6 - i));
    return { gun: GUN_ADLARI[d.getDay()], soru: 0, dogru: 0 };
  });
};

export default function Analiz() {
  const { testSonuclari } = useApp();
  const { user } = useAuth();
  const [aktifPeriod, setAktifPeriod] = useState<'gunluk' | 'haftalik'>('haftalik');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [analizData, setAnalizData] = useState<AnalizData>({
    toplam: 0, dogru: 0, yanlis: 0,
    haftalikVeri: BOŞ_HAFTALIK(),
    dersStat: [],
    tahminiNet: 0,
    netDegisim: 0,
  });

  const loadAnalizData = useCallback(async () => {
    if (!user) {
      // Oturum açılmamışsa context verisini kullan
      const dogru = testSonuclari.filter(s => s.dogru).length;
      const yanlis = testSonuclari.filter(s => !s.dogru).length;
      const toplam = dogru + yanlis;
      const yanlisCeza = yanlis / 4;
      const tahminiNet = toplam > 0 ? Math.max(0, Math.round((dogru - yanlisCeza) * (120 / toplam) * 10) / 10) : 0;
      setAnalizData(prev => ({
        ...prev, toplam, dogru, yanlis, tahminiNet,
        netDegisim: tahminiNet - HEDEF_NET * 0.82,
      }));
      return;
    }

    setYukleniyor(true);
    try {
      const supabase = getSupabaseClient();
      const yediGunOnce = new Date();
      yediGunOnce.setDate(yediGunOnce.getDate() - 6);
      yediGunOnce.setHours(0, 0, 0, 0);

      // Son 7 gün + tüm zamanlar
      const [haftalikRes, tumRes] = await Promise.all([
        supabase
          .from('soru_gecmisi')
          .select('dogru, kategori, ders, created_at')
          .eq('user_id', user.id)
          .gte('created_at', yediGunOnce.toISOString()),
        supabase
          .from('soru_gecmisi')
          .select('dogru, kategori, ders, created_at')
          .eq('user_id', user.id),
      ]);

      const haftalikRows = haftalikRes.data ?? [];
      const tumRows = tumRes.data ?? [];

      // Toplam istatistikler
      const toplam = tumRows.length;
      const dogru = tumRows.filter(r => r.dogru).length;
      const yanlis = toplam - dogru;

      // Tahmini net (KPSS 120 soruluk orana çevir, yanlış/4 çıkar)
      const yanlisCeza = yanlis / 4;
      const tahminiNet = toplam > 0
        ? Math.max(0, Math.round((dogru - yanlisCeza) * (120 / toplam) * 10) / 10)
        : 0;

      // Önceki 7 gün trend (14-7 gün arası)
      const ondortGunOnce = new Date();
      ondortGunOnce.setDate(ondortGunOnce.getDate() - 13);
      const oncekiHafta = tumRows.filter(r => {
        const d = new Date(r.created_at);
        return d >= ondortGunOnce && d < yediGunOnce;
      });
      const oncekiDogru = oncekiHafta.filter(r => r.dogru).length;
      const oncekiYanlis = oncekiHafta.length - oncekiDogru;
      const oncekiNet = oncekiHafta.length > 0
        ? Math.max(0, Math.round((oncekiDogru - oncekiYanlis / 4) * (120 / oncekiHafta.length) * 10) / 10)
        : 0;
      const netDegisim = tahminiNet - oncekiNet;

      // Haftalık grafik verisi
      const haftalikMap: Record<string, { soru: number; dogru: number }> = {};
      const bugun = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(bugun);
        d.setDate(bugun.getDate() - (6 - i));
        const key = d.toISOString().split('T')[0];
        haftalikMap[key] = { soru: 0, dogru: 0 };
      }
      haftalikRows.forEach(r => {
        const key = new Date(r.created_at).toISOString().split('T')[0];
        if (haftalikMap[key]) {
          haftalikMap[key].soru += 1;
          if (r.dogru) haftalikMap[key].dogru += 1;
        }
      });
      const haftalikVeri: GunlukVeri[] = Object.entries(haftalikMap).map(([dateStr, v]) => {
        const d = new Date(dateStr);
        return { gun: GUN_ADLARI[d.getDay()], soru: v.soru, dogru: v.dogru };
      });

      // Ders bazlı başarı
      const dersMap: Record<string, { toplam: number; dogru: number; kategori: string }> = {};
      tumRows.forEach(r => {
        const key = r.ders || r.kategori || 'Diğer';
        if (!dersMap[key]) dersMap[key] = { toplam: 0, dogru: 0, kategori: r.kategori || key };
        dersMap[key].toplam += 1;
        if (r.dogru) dersMap[key].dogru += 1;
      });
      const dersStat: DersStat[] = Object.entries(dersMap)
        .map(([ders, v]) => ({
          ders,
          kategori: v.kategori,
          toplam: v.toplam,
          dogru: v.dogru,
          basariYuzdesi: v.toplam > 0 ? Math.round((v.dogru / v.toplam) * 100) : 0,
        }))
        .sort((a, b) => a.basariYuzdesi - b.basariYuzdesi);

      setAnalizData({ toplam, dogru, yanlis, haftalikVeri, dersStat, tahminiNet, netDegisim });
    } catch (err) {
      console.error('Analiz veri hatası:', err);
    } finally {
      setYukleniyor(false);
    }
  }, [user, testSonuclari]);

  useEffect(() => {
    loadAnalizData();
  }, [loadAnalizData]);

  const { toplam, dogru, yanlis, haftalikVeri, dersStat, tahminiNet, netDegisim } = analizData;
  const basariYuzdesi = toplam > 0 ? Math.round((dogru / toplam) * 100) : 0;
  const netArtis = netDegisim >= 0;
  const analiz = aiAnalizUret(dogru, yanlis);
  const maxSoru = Math.max(...haftalikVeri.map(d => d.soru), 1);

  const getBarRenk = (yuzde: number) => {
    if (yuzde >= 70) return Colors.success;
    if (yuzde >= 50) return Colors.warning;
    return Colors.error;
  };

  const getDersEmoji = (ders: string) => {
    const map: Record<string, string> = {
      'Türkçe': '📖', 'Matematik': '📐', 'Tarih': '🏛️', 'Coğrafya': '🌍',
      'Vatandaşlık': '⚖️', 'Güncel Bilgiler': '📰', 'Genel Yetenek': '🧠',
      'Genel Kültür': '🌐',
    };
    for (const key of Object.keys(map)) {
      if (ders.toLowerCase().includes(key.toLowerCase())) return map[key];
    }
    return '📚';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.baslik}>Analiz</Text>
            <Text style={styles.altBaslik}>Performans özeti</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.yenileBtn, pressed && { opacity: 0.7 }]}
            onPress={loadAnalizData}
          >
            {yukleniyor
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <MaterialIcons name="refresh" size={20} color={Colors.primary} />}
          </Pressable>
        </View>

        {yukleniyor && toplam === 0 ? (
          <View style={styles.yukleniyorWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.yukleniyorText}>Veriler yükleniyor...</Text>
          </View>
        ) : toplam === 0 ? (
          <View style={styles.bosHal}>
            <MaterialIcons name="bar-chart" size={52} color={Colors.textMuted} />
            <Text style={styles.bosBaslik}>Henüz veri yok</Text>
            <Text style={styles.bosAciklama}>Soru çözdükçe analizin burada görünecek.</Text>
          </View>
        ) : (
          <>
            {/* Özet Kartlar */}
            <View style={styles.ozetRow}>
              <View style={[styles.ozetKart, { borderColor: Colors.success + '40' }]}>
                <Text style={[styles.ozetSayi, { color: Colors.success }]}>{dogru}</Text>
                <Text style={styles.ozetLabel}>Doğru</Text>
              </View>
              <View style={[styles.ozetKart, { borderColor: Colors.error + '40' }]}>
                <Text style={[styles.ozetSayi, { color: Colors.error }]}>{yanlis}</Text>
                <Text style={styles.ozetLabel}>Yanlış</Text>
              </View>
              <View style={[styles.ozetKart, { borderColor: Colors.primary + '40' }]}>
                <Text style={[styles.ozetSayi, { color: Colors.primary }]}>%{basariYuzdesi}</Text>
                <Text style={styles.ozetLabel}>Başarı</Text>
              </View>
              <View style={[styles.ozetKart, { borderColor: Colors.gold + '40' }]}>
                <Text style={[styles.ozetSayi, { color: Colors.gold }]}>{toplam}</Text>
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
                <View style={[styles.netTrend, {
                  backgroundColor: netArtis ? Colors.success + '20' : Colors.error + '20',
                }]}>
                  <MaterialIcons
                    name={netArtis ? 'arrow-upward' : 'arrow-downward'}
                    size={12}
                    color={netArtis ? Colors.success : Colors.error}
                  />
                  <Text style={[styles.netTrendText, {
                    color: netArtis ? Colors.success : Colors.error,
                  }]}>
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
                <Text style={styles.bolumBaslik}>📈 Son 7 Gün</Text>
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
                  {haftalikVeri.map((item, i) => {
                    const barH = Math.max(item.soru > 0 ? 8 : 3, (item.soru / maxSoru) * 80);
                    const isToday = i === haftalikVeri.length - 1;
                    const dogruOran = item.soru > 0 ? item.dogru / item.soru : 0;
                    const barRenk = item.soru === 0
                      ? Colors.bgSurface
                      : isToday
                      ? Colors.primary
                      : dogruOran >= 0.7
                      ? Colors.success + '80'
                      : Colors.primary + '50';
                    return (
                      <View key={i} style={styles.barItem}>
                        {item.soru > 0 && (
                          <Text style={styles.barSayi}>{item.soru}</Text>
                        )}
                        <View style={styles.barWrap}>
                          <View style={[styles.bar, { height: barH, backgroundColor: barRenk }]} />
                        </View>
                        <Text style={[styles.barGun, isToday && { color: Colors.primary, fontWeight: FontWeight.bold }]}>
                          {item.gun}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                {/* Grafik göstergesi */}
                <View style={styles.grafikLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                    <Text style={styles.legendText}>Bugün</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.success + '80' }]} />
                    <Text style={styles.legendText}>İyi gün (%70+)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.primary + '50' }]} />
                    <Text style={styles.legendText}>Diğer</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Ders Bazlı Başarı */}
            {dersStat.length > 0 && (
              <View style={styles.bolum}>
                <Text style={styles.bolumBaslik}>📚 Ders Bazlı Başarı</Text>
                <View style={styles.dersListesi}>
                  {dersStat.map((d, i) => {
                    const renk = getBarRenk(d.basariYuzdesi);
                    const barW = (d.basariYuzdesi / 100) * BAR_MAX_WIDTH;
                    return (
                      <View key={i} style={[styles.dersItem, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md }]}>
                        <Text style={styles.dersEmoji}>{getDersEmoji(d.ders)}</Text>
                        <View style={styles.dersBilgi}>
                          <View style={styles.dersHeader}>
                            <Text style={styles.dersAd} numberOfLines={1}>{d.ders}</Text>
                            <Text style={[styles.dersYuzde, { color: renk }]}>%{d.basariYuzdesi}</Text>
                          </View>
                          <View style={styles.dersBarBg}>
                            <View style={[styles.dersBarFill, {
                              width: Math.max(4, barW),
                              backgroundColor: renk,
                            }]} />
                          </View>
                          <Text style={styles.dersSoru}>{d.dogru}/{d.toplam} doğru</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* AI Önerisi */}
            <View style={styles.bolum}>
              <Text style={styles.bolumBaslik}>🤖 AI Koç Önerisi</Text>
              <View style={styles.aiKart}>
                <Text style={styles.aiMetin}>{analiz.gunlukOneri}</Text>
                {analiz.zayifKonular.length > 0 && (
                  <>
                    <View style={styles.aiDivider} />
                    {analiz.zayifKonular.map((z, i) => (
                      <View key={i} style={styles.aiOneri}>
                        <View style={styles.aiOneriDot} />
                        <Text style={styles.aiOneriMetin}>{z.oneri}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            </View>

            {/* En Zayıf Konular */}
            {dersStat.length > 0 && (
              <View style={styles.bolum}>
                <Text style={styles.bolumBaslik}>⚠️ Gelişime Açık Dersler</Text>
                {dersStat.slice(0, 3).map((d, i) => (
                  <View key={i} style={styles.zayifItem}>
                    <View style={styles.zayifSol}>
                      <Text style={styles.zayifDers}>{d.ders}</Text>
                      <Text style={styles.zayifKonu}>{d.dogru}/{d.toplam} doğru • %{d.basariYuzdesi}</Text>
                    </View>
                    <View style={[styles.zayifBadge, {
                      backgroundColor: d.basariYuzdesi < 50 ? Colors.error + '20' : Colors.warning + '20',
                    }]}>
                      <Text style={[styles.zayifBadgeText, {
                        color: d.basariYuzdesi < 50 ? Colors.error : Colors.warning,
                      }]}>
                        {d.basariYuzdesi < 50 ? 'Öncelikli' : 'Çalış'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
  },
  baslik: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  altBaslik: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  yenileBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  yukleniyorWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.xxl, gap: Spacing.md,
  },
  yukleniyorText: { fontSize: FontSize.base, color: Colors.textSecondary },
  bosHal: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.xxl, gap: Spacing.md, paddingHorizontal: Spacing.md,
  },
  bosBaslik: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  bosAciklama: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
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
  netTrend: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  netTrendText: { fontSize: 10, fontWeight: FontWeight.semibold },
  netProgressWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  netProgressBg: {
    flex: 1, height: 5, backgroundColor: Colors.bgSurface,
    borderRadius: Radius.full, overflow: 'hidden',
  },
  netProgressFill: { height: '100%', borderRadius: Radius.full },
  netProgressText: { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.bold },
  bolumRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.sm,
  },
  periodToggle: {
    flexDirection: 'row', backgroundColor: Colors.bgCard,
    borderRadius: Radius.full, padding: 2, borderWidth: 1, borderColor: Colors.border,
  },
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
  bar: { width: '75%', borderRadius: Radius.sm },
  barGun: { fontSize: 9, color: Colors.textSecondary, marginTop: 4 },
  grafikLegend: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 9, color: Colors.textMuted },
  dersListesi: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  dersItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dersEmoji: { fontSize: 18, width: 26, textAlign: 'center' },
  dersBilgi: { flex: 1 },
  dersHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  dersAd: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary, flex: 1 },
  dersYuzde: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  dersBarBg: {
    height: 6, backgroundColor: Colors.bgSurface,
    borderRadius: Radius.full, overflow: 'hidden', marginBottom: 4,
  },
  dersBarFill: { height: '100%', borderRadius: Radius.full },
  dersSoru: { fontSize: 10, color: Colors.textMuted },
  aiKart: {
    backgroundColor: Colors.primary + '15', borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  aiMetin: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20, fontWeight: FontWeight.medium },
  aiDivider: { height: 1, backgroundColor: Colors.primary + '30', marginVertical: Spacing.sm },
  aiOneri: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.xs },
  aiOneriDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.primaryLight, marginTop: 6,
  },
  aiOneriMetin: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  zayifItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  zayifSol: { flex: 1 },
  zayifDers: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  zayifKonu: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 3 },
  zayifBadge: {
    borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5,
  },
  zayifBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});
