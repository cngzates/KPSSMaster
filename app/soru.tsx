import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, Vibration
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { SORULAR, Soru } from '@/constants/data';
import { useApp } from '@/hooks/useApp';

const SIKLAR_LABELS = ['A', 'B', 'C', 'D', 'E'];

// Mini konfeti parçaları
function KonfetiBit({ index, visible }: { index: number; visible: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  const rotAnim = useRef(new Animated.Value(0)).current;
  const renkler = [Colors.gold, Colors.success, Colors.primary, '#F72585', Colors.warning];
  const renk = renkler[index % renkler.length];
  const left = 20 + (index * 13) % 65;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      rotAnim.setValue(0);
      Animated.parallel([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(rotAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  const rotate = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${180 + index * 40}deg`] });

  if (!visible) return null;

  return (
    <Animated.View style={[
      styles.konfetiBit,
      { left: `${left}%`, backgroundColor: renk, opacity, transform: [{ translateY }, { rotate }] }
    ]} />
  );
}

export default function SoruEkrani() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kategoriId?: string; mod?: string }>();
  const { soruCevapla } = useApp();

  const [sorular, setSorular] = useState<Soru[]>([]);
  const [aktifIndex, setAktifIndex] = useState(0);
  const [secilenSik, setSecilenSik] = useState<string | null>(null);
  const [cevaplandi, setCevaplandi] = useState(false);
  const [testBitti, setTestBitti] = useState(false);
  const [dogruSayisi, setDogruSayisi] = useState(0);
  const [seriSayisi, setSeriSayisi] = useState(0); // Ardışık doğru
  const [konfeti, setKonfeti] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let secilmisSorular: Soru[] = [];
    if (params.kategoriId) {
      secilmisSorular = SORULAR.filter(s => s.kategori === params.kategoriId);
    }
    if (secilmisSorular.length === 0) {
      secilmisSorular = [...SORULAR].sort(() => Math.random() - 0.5);
    }
    setSorular(secilmisSorular.slice(0, 10));
  }, [params.kategoriId]);

  useEffect(() => {
    if (sorular.length > 0) {
      Animated.timing(progressAnim, {
        toValue: ((aktifIndex + 1) / sorular.length) * 100,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }
  }, [aktifIndex, sorular.length]);

  const handleSikSec = (sik: string) => {
    if (cevaplandi) return;
    setSecilenSik(sik);
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleCevapla = () => {
    if (!secilenSik || cevaplandi || sorular.length === 0) return;
    const mevcutSoru = sorular[aktifIndex];
    const dogru = secilenSik === mevcutSoru.dogru_cevap;
    setCevaplandi(true);

    if (dogru) {
      const yeniSeri = seriSayisi + 1;
      setSeriSayisi(yeniSeri);
      setDogruSayisi(prev => prev + 1);
      setKonfeti(true);
      setTimeout(() => setKonfeti(false), 900);
    } else {
      setSeriSayisi(0);
      Vibration.vibrate(300);
      triggerShake();
    }

    soruCevapla({ soruId: mevcutSoru.id, dogru, secilen: secilenSik });
  };

  const handleSonraki = () => {
    if (aktifIndex >= sorular.length - 1) {
      setTestBitti(true);
      return;
    }
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 150, useNativeDriver: true,
    }).start(() => {
      setAktifIndex(prev => prev + 1);
      setSecilenSik(null);
      setCevaplandi(false);
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 200, useNativeDriver: true,
      }).start();
    });
  };

  const getSikStyle = (sik: string, index: number) => {
    const label = SIKLAR_LABELS[index];
    if (!cevaplandi) return [styles.sik, secilenSik === label && styles.sikSecili];
    const mevcutSoru = sorular[aktifIndex];
    if (label === mevcutSoru.dogru_cevap) return [styles.sik, styles.sikDogru];
    if (secilenSik === label) return [styles.sik, styles.sikYanlis];
    return [styles.sik, styles.sikSoluk];
  };

  const getSikLabelStyle = (sik: string, index: number) => {
    const label = SIKLAR_LABELS[index];
    if (!cevaplandi) return [styles.sikLabel, secilenSik === label && styles.sikLabelSecili];
    const mevcutSoru = sorular[aktifIndex];
    if (label === mevcutSoru.dogru_cevap) return [styles.sikLabel, styles.sikLabelDogru];
    if (secilenSik === label) return [styles.sikLabel, styles.sikLabelYanlis];
    return [styles.sikLabel];
  };

  if (sorular.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.yukleniyor}>
          <Text style={styles.yukleniyorText}>Sorular yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (testBitti) {
    const basariYuzdesi = Math.round((dogruSayisi / sorular.length) * 100);
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.sonucEkrani}>
          <Text style={styles.sonucEmoji}>
            {basariYuzdesi >= 70 ? '🎉' : basariYuzdesi >= 50 ? '💪' : '📚'}
          </Text>
          <Text style={styles.sonucBaslik}>Test Tamamlandı!</Text>

          <View style={styles.sonucKart}>
            <View style={styles.sonucItem}>
              <Text style={[styles.sonucSayi, { color: Colors.success }]}>{dogruSayisi}</Text>
              <Text style={styles.sonucLabel}>Doğru</Text>
            </View>
            <View style={styles.sonucAyrac} />
            <View style={styles.sonucItem}>
              <Text style={[styles.sonucSayi, { color: Colors.error }]}>{sorular.length - dogruSayisi}</Text>
              <Text style={styles.sonucLabel}>Yanlış</Text>
            </View>
            <View style={styles.sonucAyrac} />
            <View style={styles.sonucItem}>
              <Text style={[styles.sonucSayi, { color: Colors.primary }]}>%{basariYuzdesi}</Text>
              <Text style={styles.sonucLabel}>Başarı</Text>
            </View>
          </View>

          <View style={styles.aiGeriBildirim}>
            <View style={styles.aiHeader}>
              <MaterialIcons name="smart-toy" size={18} color={Colors.primary} />
              <Text style={styles.aiBaslik}>AI Koç Değerlendirmesi</Text>
            </View>
            <Text style={styles.aiMetin}>
              {basariYuzdesi >= 70
                ? 'Harika performans! Zor sorulara geçmeye hazırsın. Bir sonraki seviyeye çıkabilirsin.'
                : basariYuzdesi >= 50
                ? 'İyi başlangıç! Yanlış yaptığın konuları tekrar etmeni ve daha fazla pratik yapmanı öneriyorum.'
                : 'Temel konuları pekiştirmek için bu kategoride daha fazla çalışmalısın. Kolay soruları çözerek başla.'}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.tekrarBtn, pressed && { opacity: 0.85 }]}
            onPress={() => {
              setAktifIndex(0); setSecilenSik(null);
              setCevaplandi(false); setTestBitti(false);
              setDogruSayisi(0); setSeriSayisi(0);
              setSorular([...sorular].sort(() => Math.random() - 0.5));
            }}
          >
            <MaterialIcons name="replay" size={20} color="#fff" />
            <Text style={styles.tekrarBtnText}>Tekrar Çöz</Text>
          </Pressable>

          <Pressable style={styles.anaSayfaBtn} onPress={() => router.back()}>
            <Text style={styles.anaSayfaBtnText}>Geri Dön</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const mevcutSoru = sorular[aktifIndex];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.soruHeader}>
        <Pressable style={styles.geriBtn} onPress={() => router.back()}>
          <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.sayacWrap}>
          <Text style={styles.sayac}>{aktifIndex + 1} / {sorular.length}</Text>
        </View>
        <View style={styles.headerSag}>
          {seriSayisi >= 2 && (
            <View style={styles.seriBadge}>
              <Text style={styles.seriText}>🔥 {seriSayisi} seri</Text>
            </View>
          )}
          <View style={styles.zorlukBadge}>
            <Text style={styles.zorlukText}>{mevcutSoru.zorluk}</Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBg}>
        <Animated.View style={[styles.progressFill, {
          width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }]} />
      </View>

      {/* Konfeti overlay */}
      <View style={styles.konfettiContainer} pointerEvents="none">
        {konfeti && Array.from({ length: 8 }).map((_, i) => (
          <KonfetiBit key={i} index={i} visible={konfeti} />
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.soruContent}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Konu Chip */}
          <View style={styles.konuChip}>
            <Text style={styles.konuText}>{mevcutSoru.ders} • {mevcutSoru.konu}</Text>
          </View>

          {/* Soru Metni */}
          <Animated.View style={[styles.soruKart, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.soruMetni}>{mevcutSoru.soru}</Text>
          </Animated.View>

          {/* Şıklar */}
          <View style={styles.siklar}>
            {mevcutSoru.siklar.map((sik, index) => {
              const label = SIKLAR_LABELS[index];
              return (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    ...getSikStyle(sik, index),
                    !cevaplandi && pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                  ]}
                  onPress={() => handleSikSec(label)}
                >
                  <View style={getSikLabelStyle(sik, index)}>
                    <Text style={styles.sikLabelText}>{label}</Text>
                  </View>
                  <Text style={styles.sikMetni}>{sik.replace(/^[A-E]\) /, '')}</Text>
                  {cevaplandi && label === mevcutSoru.dogru_cevap && (
                    <MaterialIcons name="check-circle" size={20} color={Colors.success} />
                  )}
                  {cevaplandi && secilenSik === label && label !== mevcutSoru.dogru_cevap && (
                    <MaterialIcons name="cancel" size={20} color={Colors.error} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Açıklama */}
          {cevaplandi && (
            <View style={[styles.aciklamaKart, {
              borderColor: secilenSik === mevcutSoru.dogru_cevap
                ? Colors.success + '40'
                : Colors.error + '40',
              backgroundColor: secilenSik === mevcutSoru.dogru_cevap
                ? Colors.success + '10'
                : Colors.error + '10',
            }]}>
              <View style={styles.aciklamaHeader}>
                <MaterialIcons name="smart-toy" size={18} color={Colors.primary} />
                <Text style={styles.aciklamaBaslik}>AI Açıklaması</Text>
                {secilenSik === mevcutSoru.dogru_cevap
                  ? <MaterialIcons name="check-circle" size={16} color={Colors.success} />
                  : <MaterialIcons name="cancel" size={16} color={Colors.error} />}
              </View>
              <Text style={styles.aciklamaMetin}>{mevcutSoru.aciklama}</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* Alt Buton */}
      <View style={styles.altBtn}>
        {!cevaplandi ? (
          <Pressable
            style={({ pressed }) => [
              styles.cevapla,
              !secilenSik && styles.cevaplaDisabled,
              secilenSik && pressed && { opacity: 0.85 },
            ]}
            onPress={handleCevapla}
            disabled={!secilenSik}
          >
            <Text style={[styles.cevaplaText, !secilenSik && styles.cevaplaTextDisabled]}>
              Cevapla
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.cevapla, pressed && { opacity: 0.85 }]}
            onPress={handleSonraki}
          >
            <Text style={styles.cevaplaText}>
              {aktifIndex >= sorular.length - 1 ? 'Sonuçları Gör' : 'Sonraki Soru →'}
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  yukleniyor: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  yukleniyorText: { color: Colors.textSecondary, fontSize: FontSize.base },
  soruHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  geriBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
  },
  sayacWrap: {
    backgroundColor: Colors.bgCard, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
  },
  sayac: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seriBadge: {
    backgroundColor: Colors.warning + '20', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.warning + '40',
  },
  seriText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.warning },
  zorlukBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
    backgroundColor: Colors.primary + '20',
  },
  zorlukText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primary },
  progressBg: {
    height: 5, backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.md, borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.sm,
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.full },
  konfettiContainer: { position: 'absolute', top: 70, left: 0, right: 0, height: 80, zIndex: 100 },
  konfetiBit: {
    position: 'absolute', width: 8, height: 8, borderRadius: 2,
  },
  soruContent: { paddingHorizontal: Spacing.md },
  konuChip: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.full, paddingHorizontal: 12,
    paddingVertical: 5, alignSelf: 'flex-start', marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  konuText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  soruKart: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  soruMetni: { fontSize: FontSize.base, color: Colors.textPrimary, lineHeight: 26, fontWeight: FontWeight.medium },
  siklar: { gap: 10, marginBottom: Spacing.md },
  sik: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCardAlt, borderRadius: Radius.md,
    paddingVertical: 14, paddingHorizontal: Spacing.md, gap: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  sikSecili: { borderColor: Colors.primary, backgroundColor: Colors.primary + '25' },
  sikDogru: { borderColor: Colors.success, backgroundColor: Colors.success + '20' },
  sikYanlis: { borderColor: Colors.error, backgroundColor: Colors.error + '20' },
  sikSoluk: { opacity: 0.4 },
  sikLabel: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.bgSurface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  sikLabelSecili: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sikLabelDogru: { backgroundColor: Colors.success, borderColor: Colors.success },
  sikLabelYanlis: { backgroundColor: Colors.error, borderColor: Colors.error },
  sikLabelText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sikMetni: { flex: 1, fontSize: FontSize.base, color: Colors.textPrimary, lineHeight: 22, fontWeight: FontWeight.medium },
  aciklamaKart: {
    borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  aciklamaHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  aciklamaBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary, flex: 1 },
  aciklamaMetin: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22 },
  altBtn: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.md, backgroundColor: Colors.bg,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  cevapla: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' },
  cevaplaDisabled: { backgroundColor: Colors.bgCardAlt, borderWidth: 1, borderColor: Colors.borderLight },
  cevaplaText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  cevaplaTextDisabled: { color: Colors.textMuted },
  sonucEkrani: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md },
  sonucEmoji: { fontSize: 72, marginBottom: Spacing.md },
  sonucBaslik: { fontSize: FontSize.hero, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, marginBottom: Spacing.lg },
  sonucKart: {
    flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.lg, width: '100%', borderWidth: 1, borderColor: Colors.border,
  },
  sonucItem: { flex: 1, alignItems: 'center' },
  sonucAyrac: { width: 1, backgroundColor: Colors.border },
  sonucSayi: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, marginBottom: 4 },
  sonucLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  aiGeriBildirim: {
    backgroundColor: Colors.primary + '15', borderRadius: Radius.lg, padding: Spacing.md,
    width: '100%', marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '30',
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  aiBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  aiMetin: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22 },
  tekrarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14,
    paddingHorizontal: Spacing.xl, width: '100%', gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  tekrarBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  anaSayfaBtn: { paddingVertical: 12, width: '100%', alignItems: 'center' },
  anaSayfaBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
