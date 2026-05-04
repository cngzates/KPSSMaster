import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, FlatList, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { KATEGORILER, Kategori } from '@/constants/data';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';

type TabTip = 'Tüm' | 'Genel Yetenek' | 'Genel Kültür';
const TABS: TabTip[] = ['Tüm', 'Genel Yetenek', 'Genel Kültür'];

interface KategoriStat {
  basariYuzdesi: number;
  cozulenSoru: number;
  dogru: number;
  yanlis: number;
}

// Gerçek veriye sahip zenginleştirilmiş kategori
interface ZenginKategori extends Kategori {
  gercekStat?: KategoriStat;
}

// Etiket hesaplama — gerçek stat varsa ona göre, yoksa mock veriye göre
function getKategoriEtiket(
  kategori: ZenginKategori,
  tumKategoriler: ZenginKategori[]
): { label: string; emoji: string; renk: string } | null {
  const basari = kategori.gercekStat?.basariYuzdesi ?? kategori.basariYuzdesi;
  const cozulen = kategori.gercekStat?.cozulenSoru ?? 0;

  // En düşük başarılı 2 → "Sana önerilen" (sadece çözülen sorular varsa)
  const gercekVerili = tumKategoriler.filter(k => (k.gercekStat?.cozulenSoru ?? 0) > 0);
  if (gercekVerili.length >= 2) {
    const sirali = [...gercekVerili].sort(
      (a, b) =>
        (a.gercekStat?.basariYuzdesi ?? a.basariYuzdesi) -
        (b.gercekStat?.basariYuzdesi ?? b.basariYuzdesi)
    );
    if (sirali[0].id === kategori.id || sirali[1]?.id === kategori.id) {
      return { label: 'Sana önerilen', emoji: '🎯', renk: Colors.primary };
    }
    // En çok çözülen
    const enCok = [...gercekVerili].sort(
      (a, b) =>
        (b.gercekStat?.cozulenSoru ?? 0) - (a.gercekStat?.cozulenSoru ?? 0)
    )[0];
    if (enCok.id === kategori.id && cozulen > 0) {
      return { label: 'En çok çalışılan', emoji: '🔥', renk: Colors.warning };
    }
  } else {
    // Yeterli gerçek veri yok — mock bazlı
    const sirali = [...tumKategoriler].sort((a, b) => a.basariYuzdesi - b.basariYuzdesi);
    if (sirali[0].id === kategori.id || sirali[1]?.id === kategori.id) {
      return { label: 'Sana önerilen', emoji: '🎯', renk: Colors.primary };
    }
    const enCok = [...tumKategoriler].sort((a, b) => b.cozulenSoru - a.cozulenSoru)[0];
    if (enCok.id === kategori.id) {
      return { label: 'En çok çıkan', emoji: '🔥', renk: Colors.warning };
    }
  }

  // Yüksek başarı
  if (basari >= 75 && (kategori.gercekStat?.cozulenSoru ?? 0) >= 5) {
    return { label: 'Konu ustası', emoji: '👑', renk: Colors.gold };
  }

  return null;
}

export default function Kategoriler() {
  const router = useRouter();
  const { aktifKategoriSec } = useApp();
  const { user } = useAuth();
  const [aktifTab, setAktifTab] = useState<TabTip>('Tüm');
  const [kategoriStatlar, setKategoriStatlar] = useState<Record<string, KategoriStat>>({});
  const [yukleniyor, setYukleniyor] = useState(false);

  // Gerçek Supabase verilerini yükle
  const gercekStatlariYukle = useCallback(async () => {
    if (!user) return;
    setYukleniyor(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('soru_gecmisi')
        .select('kategori, dogru')
        .eq('user_id', user.id);

      if (error || !data) return;

      // kategori bazlı gruplama
      const gruplar: Record<string, { dogru: number; toplam: number }> = {};
      for (const row of data) {
        const kat = row.kategori as string;
        if (!kat) continue;
        if (!gruplar[kat]) gruplar[kat] = { dogru: 0, toplam: 0 };
        gruplar[kat].toplam += 1;
        if (row.dogru) gruplar[kat].dogru += 1;
      }

      const yeniStatlar: Record<string, KategoriStat> = {};
      for (const [katId, { dogru, toplam }] of Object.entries(gruplar)) {
        yeniStatlar[katId] = {
          basariYuzdesi: toplam > 0 ? Math.round((dogru / toplam) * 100) : 0,
          cozulenSoru: toplam,
          dogru,
          yanlis: toplam - dogru,
        };
      }
      setKategoriStatlar(yeniStatlar);
    } catch (e) {
      console.error('Kategori stat yükleme hatası:', e);
    } finally {
      setYukleniyor(false);
    }
  }, [user]);

  useEffect(() => {
    gercekStatlariYukle();
  }, [gercekStatlariYukle]);

  // KATEGORILER'i gerçek verilerle zenginleştir
  const zenginKategoriler: ZenginKategori[] = KATEGORILER.map(k => ({
    ...k,
    gercekStat: kategoriStatlar[k.id] ?? undefined,
  }));

  const filtreliKategoriler =
    aktifTab === 'Tüm'
      ? zenginKategoriler
      : zenginKategoriler.filter(k => k.ders === aktifTab);

  const handleKategoriSec = (kategoriId: string) => {
    const kategori = KATEGORILER.find(k => k.id === kategoriId);
    if (kategori) {
      aktifKategoriSec(kategori);
      router.push({ pathname: '/konular', params: { kategoriId } });
    }
  };

  const getBasariRenk = (yuzde: number) => {
    if (yuzde >= 70) return Colors.success;
    if (yuzde >= 50) return Colors.warning;
    return Colors.error;
  };

  // Toplam çözülen sorular (gerçek)
  const toplamGercek = Object.values(kategoriStatlar).reduce((s, v) => s + v.cozulenSoru, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.baslik}>Kategoriler</Text>
          <Text style={styles.altBaslik}>{KATEGORILER.length} ders alanı</Text>
        </View>
        <View style={styles.headerSag}>
          {yukleniyor ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : toplamGercek > 0 ? (
            <View style={styles.toplamChip}>
              <MaterialIcons name="bar-chart" size={14} color={Colors.primary} />
              <Text style={styles.toplamText}>{toplamGercek} soru</Text>
            </View>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.yenileBtn, pressed && { opacity: 0.7 }]}
            onPress={gercekStatlariYukle}
            hitSlop={8}
          >
            <MaterialIcons name="refresh" size={18} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Bilgi Bandı — kullanıcı hiç soru çözmediyse */}
      {!yukleniyor && user && toplamGercek === 0 && (
        <View style={styles.bilgiBant}>
          <MaterialIcons name="info-outline" size={14} color={Colors.primary} />
          <Text style={styles.bilgiText}>
            Soru çözdükçe her kategorinin gerçek başarı oranı burada güncellenir.
          </Text>
        </View>
      )}

      {/* Tab Filter */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {TABS.map(tab => (
            <Pressable
              key={tab}
              style={[styles.tabBtn, aktifTab === tab && styles.tabBtnAktif]}
              onPress={() => setAktifTab(tab)}
            >
              <Text style={[styles.tabText, aktifTab === tab && styles.tabTextAktif]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Grid */}
      <FlatList
        data={filtreliKategoriler}
        numColumns={2}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => {
          const gercek = item.gercekStat;
          const basariYuzdesi = gercek ? gercek.basariYuzdesi : item.basariYuzdesi;
          const cozulenSoru = gercek ? gercek.cozulenSoru : item.cozulenSoru;
          const veriGercek = Boolean(gercek && gercek.cozulenSoru > 0);

          const renk = item.renk;
          const basariRenk = getBasariRenk(basariYuzdesi);
          const etiket = getKategoriEtiket(item, zenginKategoriler);

          return (
            <Pressable
              style={({ pressed }) => [styles.kategoriKart, pressed && styles.pressedCard]}
              onPress={() => handleKategoriSec(item.id)}
            >
              {/* Etiket */}
              {etiket && (
                <View
                  style={[
                    styles.etiketBadge,
                    { backgroundColor: etiket.renk + '20', borderColor: etiket.renk + '40' },
                  ]}
                >
                  <Text style={styles.etiketEmoji}>{etiket.emoji}</Text>
                  <Text style={[styles.etiketText, { color: etiket.renk }]}>{etiket.label}</Text>
                </View>
              )}

              <View
                style={[
                  styles.kategoriIconWrap,
                  { backgroundColor: renk + '20', borderColor: renk + '40' },
                ]}
              >
                <Text style={styles.kategoriEmoji}>{item.emoji}</Text>
              </View>
              <Text style={styles.kategoriAd}>{item.ad}</Text>
              <Text style={styles.kategoriDers}>{item.ders}</Text>

              {/* Progress */}
              <View style={styles.progressWrap}>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${basariYuzdesi}%`, backgroundColor: basariRenk },
                    ]}
                  />
                </View>
                <Text style={[styles.basariYuzde, { color: basariRenk }]}>
                  %{basariYuzdesi}
                </Text>
              </View>

              <View style={styles.istatRow}>
                <View style={styles.istatSolRow}>
                  <Text style={styles.istatText}>
                    {cozulenSoru} soru
                  </Text>
                  {veriGercek && (
                    <View style={styles.gercekBadge}>
                      <MaterialIcons name="verified" size={10} color={Colors.success} />
                      <Text style={styles.gercekBadgeText}>Gerçek</Text>
                    </View>
                  )}
                </View>
                <MaterialIcons name="chevron-right" size={16} color={Colors.textMuted} />
              </View>

              {/* Gerçek istatistik detayı */}
              {veriGercek && gercek && (
                <View style={styles.detayRow}>
                  <View style={styles.detayItem}>
                    <View style={[styles.detayDot, { backgroundColor: Colors.success }]} />
                    <Text style={styles.detayText}>{gercek.dogru} doğru</Text>
                  </View>
                  <View style={styles.detayItem}>
                    <View style={[styles.detayDot, { backgroundColor: Colors.error }]} />
                    <Text style={styles.detayText}>{gercek.yanlis} yanlış</Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        }}
        ListFooterComponent={<View style={{ height: Spacing.xl }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xs,
  },
  baslik: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  altBaslik: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  headerSag: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  toplamChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary + '15', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  toplamText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold },
  yenileBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  bilgiBant: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.primary + '10', borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.primary + '20',
  },
  bilgiText: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1, lineHeight: 16 },
  tabContainer: {
    paddingVertical: Spacing.sm, borderBottomWidth: 1,
    borderBottomColor: Colors.border, marginBottom: Spacing.sm,
  },
  tabScroll: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  tabBtnAktif: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  tabTextAktif: { color: '#FFFFFF', fontWeight: FontWeight.bold },
  gridContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  gridRow: { gap: Spacing.sm, marginBottom: Spacing.sm },
  kategoriKart: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, minHeight: 165,
  },
  pressedCard: { opacity: 0.78, transform: [{ scale: 0.97 }] },
  etiketBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    alignSelf: 'flex-start', borderRadius: Radius.full, borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 3, marginBottom: Spacing.xs,
  },
  etiketEmoji: { fontSize: 10 },
  etiketText: { fontSize: 9, fontWeight: FontWeight.bold },
  kategoriIconWrap: {
    width: 46, height: 46, borderRadius: Radius.md, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, marginBottom: Spacing.sm,
  },
  kategoriEmoji: { fontSize: 22 },
  kategoriAd: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  kategoriDers: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, marginBottom: Spacing.sm },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 6 },
  progressBg: {
    flex: 1, height: 5, backgroundColor: Colors.bgSurface,
    borderRadius: Radius.full, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: Radius.full },
  basariYuzde: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, minWidth: 32, textAlign: 'right' },
  istatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  istatSolRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  istatText: { fontSize: FontSize.xs, color: Colors.textMuted },
  gercekBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: Colors.success + '15', borderRadius: Radius.full,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  gercekBadgeText: { fontSize: 8, color: Colors.success, fontWeight: FontWeight.bold },
  detayRow: {
    flexDirection: 'row', gap: Spacing.sm, marginTop: 5,
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 5,
  },
  detayItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  detayDot: { width: 6, height: 6, borderRadius: 3 },
  detayText: { fontSize: 9, color: Colors.textMuted },
});
