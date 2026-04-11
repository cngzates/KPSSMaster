import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { KATEGORILER } from '@/constants/data';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/template';
import { userStatsGetir } from '@/services/learningService';

interface UserStats {
  xp: number;
  streak: number;
  level: number;
}

const XP_PER_LEVEL = 500;

interface GunlukGorev {
  id: string;
  label: string;
  hedef: number;
  mevcut: number;
  icon: keyof typeof MaterialIcons.glyphMap;
}

export default function AnaSayfa() {
  const router = useRouter();
  const { gunlukCozulen, gunlukHedef, aktifKategoriSec, kisiselTestBaslat, testSonuclari } = useApp();
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({ xp: 0, streak: 0, level: 1 });

  // Pulse animation for "Bana Özel Test"
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  const ilerlemeYuzdesi = Math.min((gunlukCozulen / gunlukHedef) * 100, 100);
  const zayifAlanlar = KATEGORILER.sort((a, b) => a.basariYuzdesi - b.basariYuzdesi).slice(0, 2);
  const displayAd = user?.username || user?.email?.split('@')[0] || 'Öğrenci';

  // Günlük gorevler
  const dogruSayisi = testSonuclari.filter(s => s.dogru).length;
  const gunlukGorevler: GunlukGorev[] = [
    { id: 'soru', label: '20 soru çöz', hedef: 20, mevcut: gunlukCozulen, icon: 'quiz' },
    { id: 'tekrar', label: '1 tekrar yap', hedef: 1, mevcut: 0, icon: 'edit-note' },
    { id: 'sinav', label: '1 mini sınav tamamla', hedef: 1, mevcut: 0, icon: 'emoji-events' },
  ];

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  useEffect(() => {
    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    glow.start();
    return () => { pulse.stop(); glow.stop(); };
  }, []);

  const loadStats = async () => {
    if (!user) return;
    const data = await userStatsGetir(user.id);
    if (data) setStats({ xp: data.xp, streak: data.streak, level: data.level });
  };

  const handleHizliBasla = (kategoriId: string) => {
    const kategori = KATEGORILER.find(k => k.id === kategoriId);
    if (kategori) {
      aktifKategoriSec(kategori);
      router.push({ pathname: '/soru', params: { kategoriId, mod: 'hizli' } });
    }
  };

  const handleOgrenmeDongusu = () => {
    const zayif = KATEGORILER.sort((a, b) => a.basariYuzdesi - b.basariYuzdesi)[0];
    const konu = zayif.konular.sort((a, b) => a.basariYuzdesi - b.basariYuzdesi)[0];
    router.push({
      pathname: '/ogrenme-dongusu',
      params: { kategoriId: zayif.id, konuId: konu.id, konuAd: konu.ad, ders: zayif.ders },
    });
  };

  const handleAkilliBaslat = () => {
    const zayif = KATEGORILER.sort((a, b) => a.basariYuzdesi - b.basariYuzdesi)[0];
    const konu = zayif.konular.sort((a, b) => a.basariYuzdesi - b.basariYuzdesi)[0];
    router.push({
      pathname: '/ogrenme-dongusu',
      params: { kategoriId: zayif.id, konuId: konu.id, konuAd: konu.ad, ders: zayif.ders },
    });
  };

  const xpProgress = (stats.xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>KPSS Master</Text>
            <Text style={styles.headerSub}>Merhaba, {displayAd} 👋</Text>
          </View>
          <Pressable style={styles.streakBadge} onPress={() => router.push('/(tabs)/profil')}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakText}>{stats.streak}</Text>
          </Pressable>
        </View>

        {/* XP & Level Kartı */}
        {user && (
          <View style={styles.xpKart}>
            <View style={styles.xpRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>Lv.{stats.level}</Text>
              </View>
              <View style={styles.xpBilgi}>
                <View style={styles.xpHeader}>
                  <Text style={styles.xpLabel}>Toplam XP</Text>
                  <Text style={styles.xpDeger}>{stats.xp} XP</Text>
                </View>
                <View style={styles.xpBar}>
                  <Animated.View style={[styles.xpFill, { width: `${xpProgress}%` }]} />
                </View>
                <Text style={styles.xpAlt}>
                  {XP_PER_LEVEL - (stats.xp % XP_PER_LEVEL)} XP sonraki seviye
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 🔥 Bugün Seni Neler Bekliyor */}
        <View style={styles.gorevKart}>
          <View style={styles.gorevHeader}>
            <Text style={styles.gorevEmoji}>🔥</Text>
            <Text style={styles.gorevBaslik}>Bugün Seni Neler Bekliyor</Text>
          </View>
          {gunlukGorevler.map((gorev) => {
            const tamamlandi = gorev.mevcut >= gorev.hedef;
            return (
              <View key={gorev.id} style={styles.gorevItem}>
                <View style={[styles.gorevCheckCircle, tamamlandi && styles.gorevCheckDolu]}>
                  {tamamlandi
                    ? <MaterialIcons name="check" size={14} color="#fff" />
                    : <MaterialIcons name={gorev.icon} size={14} color={Colors.textMuted} />}
                </View>
                <Text style={[styles.gorevLabel, tamamlandi && styles.gorevLabelTamamlandi]}>
                  {gorev.label}
                </Text>
                {tamamlandi && (
                  <View style={styles.gorevTikBadge}>
                    <Text style={styles.gorevTikText}>✓</Text>
                  </View>
                )}
                {!tamamlandi && gorev.hedef > 1 && (
                  <Text style={styles.gorevSayac}>{gorev.mevcut}/{gorev.hedef}</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Günlük Hedef */}
        <View style={styles.hedefKart}>
          <View style={styles.hedefHeader}>
            <MaterialIcons name="flag" size={18} color={Colors.gold} />
            <Text style={styles.hedefBaslik}>Bugünün Planı</Text>
            <Text style={styles.hedefAdet}>{gunlukCozulen}/{gunlukHedef} soru</Text>
          </View>
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, { width: `${ilerlemeYuzdesi}%` }]} />
          </View>
          <Text style={styles.hedefAlt}>
            {gunlukHedef - gunlukCozulen > 0
              ? `${gunlukHedef - gunlukCozulen} soru daha çöz ve hedefe ulaş!`
              : '🎉 Günlük hedefini tamamladın!'}
          </Text>
        </View>

        {/* 🔥 Öğrenme Döngüsü — Core Feature */}
        <Pressable
          style={({ pressed }) => [styles.dongusuKart, pressed && { opacity: 0.9 }]}
          onPress={handleOgrenmeDongusu}
        >
          <View style={styles.dongusuSol}>
            <View style={styles.dongusuIkon}>
              <MaterialIcons name="loop" size={28} color={Colors.primary} />
            </View>
            <View style={styles.dongusuBilgi}>
              <View style={styles.dongusuBadge}>
                <Text style={styles.dongusuBadgeText}>CORE FEATURE</Text>
              </View>
              <Text style={styles.dongusuBaslik}>Öğrenme Döngüsü</Text>
              <Text style={styles.dongusuAlt}>Soru → Mola → AI Anlatım → Tekrar → Sınav</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={Colors.primary} />
        </Pressable>

        {/* Hızlı Başla */}
        <Text style={styles.bolumBaslik}>⚡ Hızlı Başla</Text>
        <View style={styles.hizliRow}>
          <Pressable
            style={({ pressed }) => [styles.hizliKart, styles.hizliKartMavi, pressed && styles.pressedCard]}
            onPress={() => handleHizliBasla('turkce')}
          >
            <Text style={styles.hizliEmoji}>🧠</Text>
            <Text style={styles.hizliKartBaslik}>Genel Yetenek</Text>
            <Text style={styles.hizliKartAlt}>Türkçe & Matematik</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.hizliKart, styles.hizliKartTuruncu, pressed && styles.pressedCard]}
            onPress={() => handleHizliBasla('tarih')}
          >
            <Text style={styles.hizliEmoji}>🌍</Text>
            <Text style={styles.hizliKartBaslik}>Genel Kültür</Text>
            <Text style={styles.hizliKartAlt}>Tarih & Coğrafya</Text>
          </Pressable>
        </View>

        {/* Devam Et */}
        <Text style={styles.bolumBaslik}>▶ Devam Et</Text>
        <Pressable
          style={({ pressed }) => [styles.devamKart, pressed && styles.pressedCard]}
          onPress={() => router.push({ pathname: '/soru', params: { kategoriId: 'matematik', mod: 'devam' } })}
        >
          <View style={styles.devamIcon}>
            <MaterialIcons name="play-circle-fill" size={32} color={Colors.primary} />
          </View>
          <View style={styles.devamBilgi}>
            <Text style={styles.devamBaslik}>Matematik - Problemler</Text>
            <Text style={styles.devamAlt}>Kaldığın yerden devam et • %45 tamamlandı</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={Colors.textSecondary} />
        </Pressable>

        {/* Zayıf Alanlar — AI Koç Mesajı */}
        <View style={styles.aiKocKart}>
          <View style={styles.aiKocHeader}>
            <View style={styles.aiKocDot} />
            <Text style={styles.aiKocBaslik}>AI Koç Seni Bekliyor</Text>
          </View>
          <Text style={styles.aiKocMesaj}>
            "{displayAd}, {zayifAlanlar[0]?.ad ?? 'Tarih'} konusunda hata oranın yükseliyor. Bugün {zayifAlanlar[0]?.konular[0]?.ad ?? 'bu konuda'} üzerinde 10 kolay soru çözelim mi?"
          </Text>
          <Pressable
            style={({ pressed }) => [styles.aiKocBtn, pressed && { opacity: 0.85 }]}
            onPress={handleAkilliBaslat}
          >
            <Text style={styles.aiKocBtnText}>Başla</Text>
            <MaterialIcons name="arrow-forward" size={16} color={Colors.primary} />
          </Pressable>
        </View>

        {/* Zayıf Alanlar */}
        <Text style={styles.bolumBaslik}>⚠️ Zayıf Alanların</Text>
        {zayifAlanlar.map(k => (
          <Pressable
            key={k.id}
            style={({ pressed }) => [styles.zayifKart, pressed && styles.pressedCard]}
            onPress={() => {
              aktifKategoriSec(k);
              router.push({ pathname: '/konular', params: { kategoriId: k.id } });
            }}
          >
            <Text style={styles.zayifEmoji}>{k.emoji}</Text>
            <View style={styles.zayifBilgi}>
              <Text style={styles.zayifBaslik}>{k.ad}</Text>
              <Text style={styles.zayifAlt}>%{k.basariYuzdesi} başarı</Text>
            </View>
            <View style={styles.zayifBarWrap}>
              <View style={styles.zayifBarBg}>
                <View style={[styles.zayifBarFill, {
                  width: `${k.basariYuzdesi}%`,
                  backgroundColor: k.basariYuzdesi < 50 ? Colors.error : Colors.warning
                }]} />
              </View>
            </View>
          </Pressable>
        ))}

        {/* Akıllı Başlat */}
        <Text style={styles.bolumBaslik}>🚀 Akıllı Başlat</Text>
        <Pressable
          style={({ pressed }) => [styles.akilliKart, pressed && { opacity: 0.9 }]}
          onPress={handleAkilliBaslat}
        >
          <MaterialIcons name="bolt" size={28} color={Colors.gold} />
          <View style={styles.akilliBilgi}>
            <Text style={styles.akilliBaslik}>Bana Özel Çalışma Planı</Text>
            <Text style={styles.akilliAlt}>Zayıf konularına göre otomatik öğrenme döngüsü başlat</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={Colors.gold} />
        </Pressable>

        {/* Bana Özel Test — Glow Pulse */}
        <Animated.View style={[styles.ozelTestGlow, { opacity: glowAnim }]} pointerEvents="none" />
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable
            style={({ pressed }) => [styles.ozelTestBtn, pressed && { opacity: 0.85 }]}
            onPress={() => { kisiselTestBaslat(); router.push({ pathname: '/soru', params: { mod: 'kisisel' } }); }}
          >
            <Text style={styles.ozelTestEmoji}>🚀</Text>
            <View style={styles.ozelTestIcerik}>
              <Text style={styles.ozelTestText}>Bana Özel Test Oluştur</Text>
              <Text style={styles.ozelTestAlt}>AI senin zayıf konularına göre test hazırladı</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
          </Pressable>
        </Animated.View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  appName: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, letterSpacing: 0.5 },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  streakFire: { fontSize: 18 },
  streakText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.gold },
  xpKart: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  levelBadge: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primary + '50',
  },
  levelText: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold, color: Colors.primary },
  xpBilgi: { flex: 1 },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  xpDeger: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.gold },
  xpBar: { height: 8, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, overflow: 'hidden', marginBottom: 4 },
  xpFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: Radius.full },
  xpAlt: { fontSize: 10, color: Colors.textMuted },
  // Günlük Görevler
  gorevKart: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  gorevHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  gorevEmoji: { fontSize: 18 },
  gorevBaslik: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  gorevItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  gorevCheckCircle: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bgSurface,
  },
  gorevCheckDolu: { backgroundColor: Colors.success, borderColor: Colors.success },
  gorevLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  gorevLabelTamamlandi: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  gorevTikBadge: {
    backgroundColor: Colors.success + '20', borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  gorevTikText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.bold },
  gorevSayac: { fontSize: FontSize.xs, color: Colors.textMuted },
  // Hedef
  hedefKart: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  hedefHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  hedefBaslik: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, flex: 1 },
  hedefAdet: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  progressBg: { height: 10, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.sm },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.full },
  hedefAlt: { fontSize: FontSize.xs, color: Colors.textSecondary },
  // Döngü
  dongusuKart: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary + '12', borderRadius: Radius.xl, padding: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.primary + '40', marginBottom: Spacing.lg,
  },
  dongusuSol: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  dongusuIkon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.primary + '40',
  },
  dongusuBilgi: { flex: 1 },
  dongusuBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.primary,
    borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4,
  },
  dongusuBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, color: '#fff', letterSpacing: 0.5 },
  dongusuBaslik: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 2 },
  dongusuAlt: { fontSize: FontSize.xs, color: Colors.textSecondary },
  bolumBaslik: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  hizliRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  hizliKart: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, minHeight: 110, justifyContent: 'flex-end' },
  hizliKartMavi: { backgroundColor: Colors.primary + '22', borderWidth: 1, borderColor: Colors.primary + '55' },
  hizliKartTuruncu: { backgroundColor: Colors.warning + '22', borderWidth: 1, borderColor: Colors.warning + '55' },
  pressedCard: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  hizliEmoji: { fontSize: 28, marginBottom: Spacing.xs },
  hizliKartBaslik: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  hizliKartAlt: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  devamKart: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  devamIcon: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  devamBilgi: { flex: 1 },
  devamBaslik: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  devamAlt: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 3 },
  // AI Koç Konuşuyor
  aiKocKart: {
    backgroundColor: Colors.primary + '10', borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '30',
  },
  aiKocHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  aiKocDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success,
    shadowColor: Colors.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4,
  },
  aiKocBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  aiKocMesaj: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20, fontStyle: 'italic', marginBottom: Spacing.sm },
  aiKocBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  aiKocBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  zayifKart: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard,
    borderRadius: Radius.md, padding: Spacing.sm + 4, marginBottom: Spacing.sm, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  zayifEmoji: { fontSize: 22 },
  zayifBilgi: { flex: 1 },
  zayifBaslik: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  zayifAlt: { fontSize: FontSize.xs, color: Colors.error, fontWeight: FontWeight.medium },
  zayifBarWrap: { width: 80 },
  zayifBarBg: { height: 6, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, overflow: 'hidden' },
  zayifBarFill: { height: '100%', borderRadius: Radius.full },
  // Akıllı Başlat
  akilliKart: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.gold + '12', borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.gold + '40', marginBottom: Spacing.md,
  },
  akilliBilgi: { flex: 1 },
  akilliBaslik: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.gold },
  akilliAlt: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  // Bana Özel Test
  ozelTestGlow: {
    position: 'absolute', left: Spacing.md, right: Spacing.md,
    height: 60, borderRadius: Radius.lg, marginTop: 8,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 0,
  },
  ozelTestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 18, paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm, gap: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  ozelTestEmoji: { fontSize: 20 },
  ozelTestIcerik: { flex: 1 },
  ozelTestText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#FFFFFF' },
  ozelTestAlt: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
});
