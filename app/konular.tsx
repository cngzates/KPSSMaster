import React from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { KATEGORILER } from '@/constants/data';
import { useApp } from '@/hooks/useApp';

export default function KonularEkrani() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kategoriId: string }>();
  const { aktifKategoriSec } = useApp();

  const kategori = KATEGORILER.find(k => k.id === params.kategoriId);

  const getZorlukRenk = (zorluk: string) => {
    if (zorluk === 'Kolay') return Colors.success;
    if (zorluk === 'Orta') return Colors.warning;
    return Colors.error;
  };

  const handleKonuBaslat = (konuAdi: string) => {
    if (kategori) {
      aktifKategoriSec(kategori);
    }
    router.push({
      pathname: '/soru',
      params: { kategoriId: params.kategoriId, konu: konuAdi },
    });
  };

  if (!kategori) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.hata}>
          <Text style={styles.hataText}>Kategori bulunamadı</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.geriText}>Geri Dön</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.geriBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerBilgi}>
          <Text style={styles.headerEmoji}>{kategori.emoji}</Text>
          <View>
            <Text style={styles.headerBaslik}>{kategori.ad}</Text>
            <Text style={styles.headerAlt}>{kategori.ders}</Text>
          </View>
        </View>
      </View>

      {/* Kategori Özeti */}
      <View style={styles.ozet}>
        <View style={styles.ozetItem}>
          <Text style={[styles.ozetSayi, { color: Colors.primary }]}>%{kategori.basariYuzdesi}</Text>
          <Text style={styles.ozetLabel}>Başarı</Text>
        </View>
        <View style={styles.ozetAyrac} />
        <View style={styles.ozetItem}>
          <Text style={[styles.ozetSayi, { color: Colors.success }]}>{kategori.cozulenSoru}</Text>
          <Text style={styles.ozetLabel}>Çözülen</Text>
        </View>
        <View style={styles.ozetAyrac} />
        <View style={styles.ozetItem}>
          <Text style={[styles.ozetSayi, { color: Colors.gold }]}>{kategori.konular.length}</Text>
          <Text style={styles.ozetLabel}>Konu</Text>
        </View>
      </View>

      <FlatList
        data={kategori.konular}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listeContent}
        ListHeaderComponent={
          <>
            <Pressable
              style={({ pressed }) => [styles.tumKategoriBtn, pressed && { opacity: 0.85 }]}
              onPress={() => router.push({ pathname: '/soru', params: { kategoriId: kategori.id } })}
            >
              <MaterialIcons name="play-circle-fill" size={22} color="#fff" />
              <Text style={styles.tumKategoriBtnText}>Tüm Konulardan Test Başlat</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.dongusuBtn, pressed && { opacity: 0.85 }]}
              onPress={() => {
                if (kategori.konular.length > 0) {
                  const konu = [...kategori.konular].sort((a, b) => a.basariYuzdesi - b.basariYuzdesi)[0];
                  router.push({
                    pathname: '/ogrenme-dongusu',
                    params: { kategoriId: kategori.id, konuId: konu.id, konuAd: konu.ad, ders: kategori.ders },
                  });
                }
              }}
            >
              <MaterialIcons name="loop" size={22} color={Colors.primary} />
              <Text style={styles.dongusuBtnText}>Öğrenme Döngüsü Başlat</Text>
            </Pressable>
            <Text style={styles.bolumBaslik}>📋 Konular</Text>
          </>
        }
        renderItem={({ item }) => {
          const zorlukRenk = getZorlukRenk(item.zorluk);
          const basariRenk = item.basariYuzdesi >= 70 ? Colors.success : item.basariYuzdesi >= 50 ? Colors.warning : Colors.error;
          return (
            <Pressable
              style={({ pressed }) => [styles.konuKart, pressed && styles.pressedCard]}
              onPress={() => handleKonuBaslat(item.ad)}
            >
              <View style={styles.konuSol}>
                <View style={styles.konuBilgi}>
                  <Text style={styles.konuAd}>{item.ad}</Text>
                  <View style={styles.konuMeta}>
                    <View style={[styles.zorlukBadge, { backgroundColor: zorlukRenk + '20' }]}>
                      <Text style={[styles.zorlukText, { color: zorlukRenk }]}>{item.zorluk}</Text>
                    </View>
                    <Text style={styles.cozulenText}>{item.cozulenSoru} soru çözüldü</Text>
                  </View>
                </View>
              </View>

              <View style={styles.konuSag}>
                <Text style={[styles.basariYuzde, { color: basariRenk }]}>%{item.basariYuzdesi}</Text>
                <View style={styles.miniProgressBg}>
                  <View style={[styles.miniProgressFill, {
                    width: `${item.basariYuzdesi}%`,
                    backgroundColor: basariRenk,
                  }]} />
                </View>
                <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
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
  hata: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  hataText: { color: Colors.textSecondary, fontSize: FontSize.base },
  geriText: { color: Colors.primary, fontSize: FontSize.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  geriBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBilgi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerEmoji: { fontSize: 28 },
  headerBaslik: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  headerAlt: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  ozet: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ozetItem: { flex: 1, alignItems: 'center' },
  ozetAyrac: { width: 1, backgroundColor: Colors.border },
  ozetSayi: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    marginBottom: 4,
  },
  ozetLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  listeContent: { paddingHorizontal: Spacing.md },
  tumKategoriBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tumKategoriBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  dongusuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '18',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primary + '50',
  },
  dongusuBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  bolumBaslik: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  konuKart: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressedCard: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  konuSol: { flex: 1 },
  konuBilgi: {},
  konuAd: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  konuMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  zorlukBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  zorlukText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  cozulenText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  konuSag: {
    alignItems: 'flex-end',
    gap: 4,
  },
  basariYuzde: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  miniProgressBg: {
    width: 50,
    height: 4,
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
