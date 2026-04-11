import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { KATEGORILER } from '@/constants/data';
import { useApp } from '@/hooks/useApp';

type TabTip = 'Tüm' | 'Genel Yetenek' | 'Genel Kültür';
const TABS: TabTip[] = ['Tüm', 'Genel Yetenek', 'Genel Kültür'];

// AI bazlı dinamik etiketler (düşük başarı = öneri, en çok çözülen = popüler)
function getKategoriEtiket(kategori: typeof KATEGORILER[0], tumKategoriler: typeof KATEGORILER): {
  label: string; emoji: string; renk: string
} | null {
  // En düşük başarılı 2 kategori → "Sana önerilen"
  const sirali = [...tumKategoriler].sort((a, b) => a.basariYuzdesi - b.basariYuzdesi);
  if (sirali[0].id === kategori.id || sirali[1].id === kategori.id) {
    return { label: 'Sana önerilen', emoji: '🎯', renk: Colors.primary };
  }
  // En çok çözülen → "En çok çıkan konu"
  const enCok = [...tumKategoriler].sort((a, b) => b.cozulenSoru - a.cozulenSoru)[0];
  if (enCok.id === kategori.id) {
    return { label: 'En çok çıkan', emoji: '🔥', renk: Colors.warning };
  }
  // Yüksek başarı → "Konu ustası"
  if (kategori.basariYuzdesi >= 75) {
    return { label: 'Konu ustası', emoji: '👑', renk: Colors.gold };
  }
  return null;
}

export default function Kategoriler() {
  const router = useRouter();
  const { aktifKategoriSec } = useApp();
  const [aktifTab, setAktifTab] = useState<TabTip>('Tüm');

  const filtreliKategoriler = aktifTab === 'Tüm'
    ? KATEGORILER
    : KATEGORILER.filter(k => k.ders === aktifTab);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.baslik}>Kategoriler</Text>
        <Text style={styles.altBaslik}>{KATEGORILER.length} ders alanı</Text>
      </View>

      {/* Tab Filter */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
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
          const renk = item.renk;
          const basariRenk = getBasariRenk(item.basariYuzdesi);
          const etiket = getKategoriEtiket(item, KATEGORILER);

          return (
            <Pressable
              style={({ pressed }) => [styles.kategoriKart, pressed && styles.pressedCard]}
              onPress={() => handleKategoriSec(item.id)}
            >
              {/* Etiket */}
              {etiket && (
                <View style={[styles.etiketBadge, { backgroundColor: etiket.renk + '20', borderColor: etiket.renk + '40' }]}>
                  <Text style={styles.etiketEmoji}>{etiket.emoji}</Text>
                  <Text style={[styles.etiketText, { color: etiket.renk }]}>{etiket.label}</Text>
                </View>
              )}

              <View style={[styles.kategoriIconWrap, { backgroundColor: renk + '20', borderColor: renk + '40' }]}>
                <Text style={styles.kategoriEmoji}>{item.emoji}</Text>
              </View>
              <Text style={styles.kategoriAd}>{item.ad}</Text>
              <Text style={styles.kategoriDers}>{item.ders}</Text>

              {/* Progress */}
              <View style={styles.progressWrap}>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${item.basariYuzdesi}%`, backgroundColor: basariRenk }]} />
                </View>
                <Text style={[styles.basariYuzde, { color: basariRenk }]}>%{item.basariYuzdesi}</Text>
              </View>

              <View style={styles.istatRow}>
                <Text style={styles.istatText}>{item.cozulenSoru} soru</Text>
                <MaterialIcons name="chevron-right" size={16} color={Colors.textMuted} />
              </View>
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
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  baslik: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  altBaslik: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  tabContainer: { paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: Spacing.sm },
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
  progressBg: { flex: 1, height: 5, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.full },
  basariYuzde: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, minWidth: 32, textAlign: 'right' },
  istatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  istatText: { fontSize: FontSize.xs, color: Colors.textMuted },
});
