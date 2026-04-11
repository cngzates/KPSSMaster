import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { miniSoruUret } from '@/services/learningService';
import { useAuth } from '@/template';
import { userStatsGuncelle } from '@/services/learningService';

interface MiniSoru {
  id: string;
  soru: string;
  siklar: string[];
  dogru_cevap: string;
  aciklama: string;
}

type Durum = 'yukleniyor' | 'sinav' | 'sonuc' | 'hata';

export default function MiniSinav() {
  const router = useRouter();
  const { konuAd, ders, kategoriId, konuId } = useLocalSearchParams<{
    konuAd: string; ders: string; kategoriId: string; konuId: string;
  }>();
  const { user } = useAuth();

  const [sorular, setSorular] = useState<MiniSoru[]>([]);
  const [aktifIdx, setAktifIdx] = useState(0);
  const [secilen, setSecilen] = useState<string | null>(null);
  const [cevaplandi, setCevaplandi] = useState(false);
  const [sonuclar, setSonuclar] = useState<boolean[]>([]);
  const [durum, setDurum] = useState<Durum>('yukleniyor');

  const shakeAnim = useSharedValue(0);
  const bounceAnim = useSharedValue(1);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnim.value }],
  }));
  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceAnim.value }],
  }));

  useEffect(() => {
    soruYukle();
  }, []);

  const soruYukle = async () => {
    setDurum('yukleniyor');
    const data = await miniSoruUret(konuAd || '', ders || '');
    if (data.length === 0) {
      setDurum('hata');
      return;
    }
    setSorular(data);
    setDurum('sinav');
  };

  const sikSec = (sik: string) => {
    if (cevaplandi) return;
    setSecilen(sik);
  };

  const cevapla = () => {
    if (!secilen || cevaplandi) return;
    const aktifSoru = sorular[aktifIdx];
    const dogru = secilen.charAt(0) === aktifSoru.dogru_cevap;
    setCevaplandi(true);

    if (dogru) {
      bounceAnim.value = withSequence(
        withTiming(1.08, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );
    } else {
      shakeAnim.value = withSequence(
        withTiming(-8, { duration: 80 }),
        withTiming(8, { duration: 80 }),
        withTiming(-6, { duration: 80 }),
        withTiming(6, { duration: 80 }),
        withTiming(0, { duration: 80 })
      );
    }

    setSonuclar(prev => [...prev, dogru]);
  };

  const sonrakiSoru = async () => {
    if (aktifIdx < sorular.length - 1) {
      setAktifIdx(prev => prev + 1);
      setSecilen(null);
      setCevaplandi(false);
    } else {
      // Sınav bitti
      if (user) {
        const dogru = [...sonuclar, cevaplandi && secilen?.charAt(0) === sorular[aktifIdx].dogru_cevap].filter(Boolean).length;
        const xp = dogru * 15;
        await userStatsGuncelle(user.id, xp);
      }
      setDurum('sonuc');
    }
  };

  const aktifSoru = sorular[aktifIdx];
  const dogruSayisi = sonuclar.filter(Boolean).length;
  const basariYuzdesi = sonuclar.length > 0 ? Math.round((dogruSayisi / sonuclar.length) * 100) : 0;

  const getSikStyle = (sik: string) => {
    if (!cevaplandi) {
      return [styles.sikBtn, secilen === sik && styles.sikSecili];
    }
    const harfi = sik.charAt(0);
    const dogru = harfi === aktifSoru.dogru_cevap;
    if (dogru) return [styles.sikBtn, styles.sikDogru];
    if (secilen === sik) return [styles.sikBtn, styles.sikYanlis];
    return [styles.sikBtn, styles.sikSoluk];
  };

  const getSikTextStyle = (sik: string) => {
    if (!cevaplandi) {
      return [styles.sikText, secilen === sik && styles.sikSeciliText];
    }
    const harfi = sik.charAt(0);
    const dogru = harfi === aktifSoru.dogru_cevap;
    if (dogru) return [styles.sikText, { color: '#fff' }];
    if (secilen === sik) return [styles.sikText, { color: '#fff' }];
    return [styles.sikText, { opacity: 0.5 }];
  };

  if (durum === 'yukleniyor') {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.yukleniyorText}>AI sınav soruları hazırlıyor...</Text>
        <Text style={styles.yukleniyorAlt}>{konuAd}</Text>
      </SafeAreaView>
    );
  }

  if (durum === 'hata') {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top', 'bottom']}>
        <MaterialIcons name="error-outline" size={52} color={Colors.error} />
        <Text style={styles.hataText}>Sorular yüklenemedi</Text>
        <Pressable style={styles.tekrarBtn} onPress={soruYukle}>
          <Text style={styles.tekrarBtnText}>Tekrar Dene</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (durum === 'sonuc') {
    const renk = basariYuzdesi >= 70 ? Colors.success : basariYuzdesi >= 50 ? Colors.warning : Colors.error;
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={[styles.scrollContent, styles.center]}>
          <MaterialIcons name="emoji-events" size={60} color={Colors.gold} />
          <Text style={styles.sonucBaslik}>Mini Sınav Tamamlandı!</Text>
          <Text style={styles.konuAdText}>{konuAd}</Text>

          <View style={[styles.puanCircle, { borderColor: renk }]}>
            <Text style={[styles.puanText, { color: renk }]}>{dogruSayisi}/{sonuclar.length}</Text>
            <Text style={styles.puanAlt}>Doğru</Text>
          </View>

          <View style={styles.sonucDetay}>
            <View style={[styles.sonucItem, { backgroundColor: Colors.success + '15' }]}>
              <MaterialIcons name="check-circle" size={22} color={Colors.success} />
              <Text style={[styles.sonucItemText, { color: Colors.success }]}>{dogruSayisi} Doğru</Text>
            </View>
            <View style={[styles.sonucItem, { backgroundColor: Colors.error + '15' }]}>
              <MaterialIcons name="cancel" size={22} color={Colors.error} />
              <Text style={[styles.sonucItemText, { color: Colors.error }]}>{sonuclar.length - dogruSayisi} Yanlış</Text>
            </View>
          </View>

          <View style={[styles.xpKazanildi, { borderColor: Colors.gold + '40' }]}>
            <Text style={styles.xpText}>+{dogruSayisi * 15} XP Kazandın! 🎉</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.bitirBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <MaterialIcons name="home" size={20} color="#fff" />
            <Text style={styles.bitirBtnText}>Ana Sayfaya Dön</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.geriBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerOrta}>
          <Text style={styles.headerBaslik}>Mini Sınav</Text>
          <Text style={styles.headerAlt}>{konuAd}</Text>
        </View>
        <View style={styles.sayacBadge}>
          <Text style={styles.sayacText}>{aktifIdx + 1}/{sorular.length}</Text>
        </View>
      </View>

      {/* İlerleme */}
      <View style={styles.ilerlemeBar}>
        <View style={[styles.ilerlemeFill, {
          width: `${((aktifIdx) / sorular.length) * 100}%`,
          backgroundColor: Colors.gold,
        }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={shakeStyle}>
          {/* Soru */}
          <View style={styles.soruKart}>
            <View style={styles.soruNumBadge}>
              <Text style={styles.soruNum}>Soru {aktifIdx + 1}</Text>
            </View>
            <Text style={styles.soruMetin}>{aktifSoru.soru}</Text>
          </View>

          {/* Şıklar */}
          <View style={styles.siklar}>
            {aktifSoru.siklar.map((sik, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  ...getSikStyle(sik),
                  pressed && !cevaplandi && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                ]}
                onPress={() => sikSec(sik)}
              >
                <View style={styles.sikHarfWrap}>
                  <Text style={styles.sikHarf}>{sik.charAt(0)}</Text>
                </View>
                <Text style={getSikTextStyle(sik)}>{sik.substring(3)}</Text>
                {cevaplandi && sik.charAt(0) === aktifSoru.dogru_cevap && (
                  <MaterialIcons name="check-circle" size={18} color="#fff" />
                )}
                {cevaplandi && secilen === sik && sik.charAt(0) !== aktifSoru.dogru_cevap && (
                  <MaterialIcons name="cancel" size={18} color="#fff" />
                )}
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Açıklama */}
        {cevaplandi && (
          <Animated.View style={[styles.aciklamaKart, bounceStyle]}>
            <View style={styles.aciklamaHeader}>
              <MaterialIcons
                name={sonuclar[sonuclar.length - 1] !== false ? 'check-circle' : 'info'}
                size={20}
                color={secilen?.charAt(0) === aktifSoru.dogru_cevap ? Colors.success : Colors.warning}
              />
              <Text style={styles.aciklamaBaslik}>Açıklama</Text>
            </View>
            <Text style={styles.aciklamaMetin}>{aktifSoru.aciklama}</Text>
          </Animated.View>
        )}

        {/* Butonlar */}
        {!cevaplandi ? (
          <Pressable
            style={({ pressed }) => [styles.cevapBtn, !secilen && styles.disabled, pressed && { opacity: 0.85 }]}
            onPress={cevapla}
            disabled={!secilen}
          >
            <Text style={styles.cevapBtnText}>Cevapla</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.sonrakiBtn, pressed && { opacity: 0.85 }]}
            onPress={sonrakiSoru}
          >
            <Text style={styles.sonrakiBtnText}>
              {aktifIdx < sorular.length - 1 ? 'Sonraki Soru' : 'Sonuçları Gör'}
            </Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, gap: Spacing.sm,
  },
  geriBtn: { padding: 4 },
  headerOrta: { flex: 1 },
  headerBaslik: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerAlt: { fontSize: FontSize.xs, color: Colors.textMuted },
  sayacBadge: {
    backgroundColor: Colors.gold + '20', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: Colors.gold + '40',
  },
  sayacText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  ilerlemeBar: { height: 4, backgroundColor: Colors.bgSurface, marginBottom: Spacing.md },
  ilerlemeFill: { height: '100%' },
  scrollContent: { padding: Spacing.md, flexGrow: 1 },
  soruKart: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  soruNumBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.gold + '20',
    borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4,
    marginBottom: Spacing.md,
  },
  soruNum: { fontSize: FontSize.xs, color: Colors.gold, fontWeight: FontWeight.bold },
  soruMetin: { fontSize: FontSize.base, color: Colors.textPrimary, lineHeight: 24, fontWeight: FontWeight.medium },
  siklar: { gap: Spacing.sm, marginBottom: Spacing.md },
  sikBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    padding: Spacing.md, gap: Spacing.sm, borderWidth: 1.5, borderColor: Colors.border,
  },
  sikSecili: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  sikDogru: { backgroundColor: Colors.success, borderColor: Colors.success },
  sikYanlis: { backgroundColor: Colors.error, borderColor: Colors.error },
  sikSoluk: { opacity: 0.5 },
  sikHarfWrap: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.bgSurface, alignItems: 'center', justifyContent: 'center',
  },
  sikHarf: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  sikText: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 },
  sikSeciliText: { color: Colors.primary, fontWeight: FontWeight.semibold },
  aciklamaKart: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '30', marginBottom: Spacing.md,
  },
  aciklamaHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  aciklamaBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  aciklamaMetin: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  cevapBtn: {
    backgroundColor: Colors.gold, borderRadius: Radius.lg,
    paddingVertical: 16, alignItems: 'center',
  },
  cevapBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textInverse },
  sonrakiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 16, gap: Spacing.sm,
  },
  sonrakiBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  disabled: { opacity: 0.45 },
  yukleniyorText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: Spacing.md },
  yukleniyorAlt: { fontSize: FontSize.sm, color: Colors.textMuted },
  hataText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: Spacing.md },
  tekrarBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl, paddingVertical: 14, marginTop: Spacing.md,
  },
  tekrarBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  sonucBaslik: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, marginTop: Spacing.md },
  konuAdText: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.lg },
  puanCircle: {
    width: 130, height: 130, borderRadius: 65, borderWidth: 5,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard,
    marginVertical: Spacing.lg,
  },
  puanText: { fontSize: 40, fontWeight: FontWeight.extrabold },
  puanAlt: { fontSize: FontSize.sm, color: Colors.textMuted },
  sonucDetay: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  sonucItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, borderRadius: Radius.md, gap: Spacing.sm },
  sonucItemText: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  xpKazanildi: {
    backgroundColor: Colors.gold + '15', borderRadius: Radius.lg, borderWidth: 1,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, marginBottom: Spacing.lg,
  },
  xpText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.gold },
  bitirBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    borderRadius: Radius.lg, paddingVertical: 16, paddingHorizontal: Spacing.xl, gap: Spacing.sm,
  },
  bitirBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
});
