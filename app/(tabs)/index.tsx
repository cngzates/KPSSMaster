import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, Modal
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
import {
  bildirimIzniAl,
  gunlukHatirlaticiKur,
  streakMilestoneBildir,
  bildirimDinleyiciEkle,
  bildirimTiklaDinleyiciEkle,
} from '@/services/notificationService';

interface UserStats {
  xp: number;
  streak: number;
  level: number;
}

const XP_PER_LEVEL = 500;
const GOREV_BONUS_XP = 100;

interface GunlukGorevDurumu {
  soruSayisi: number;    // bugün çözülen soru sayısı
  tekrarYapildi: boolean; // bugün tekrar/öğrenme döngüsü yapıldı mı
  miniSinavYapildi: boolean; // bugün mini sınav tamamlandı mı
  bonusVerildi: boolean;  // bugün bonus XP verildi mi
}

// ─── In-App Toast ────────────────────────────────────────────
interface ToastProps {
  mesaj: string;
  alt?: string;
  gorünür: boolean;
  onGizle: () => void;
  tip?: 'streak' | 'bonus';
}

function AppToast({ mesaj, alt, gorünür, onGizle, tip = 'streak' }: ToastProps) {
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (gorünür) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, { toValue: -120, duration: 300, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => onGizle());
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [gorünür]);

  if (!gorünür) return null;
  const borderColor = tip === 'bonus' ? Colors.gold + '70' : Colors.warning + '60';
  const iconBg = tip === 'bonus' ? Colors.gold + '20' : Colors.warning + '20';
  const emoji = tip === 'bonus' ? '🎉' : '🔥';

  return (
    <Animated.View style={[
      toastStyles.container,
      { borderColor, transform: [{ translateY: slideAnim }], opacity: opacityAnim }
    ]}>
      <View style={[toastStyles.ikon, { backgroundColor: iconBg }]}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
      </View>
      <View style={toastStyles.bilgi}>
        <Text style={toastStyles.mesaj}>{mesaj}</Text>
        {alt ? <Text style={toastStyles.alt}>{alt}</Text> : null}
      </View>
      <Pressable onPress={onGizle} hitSlop={12}>
        <MaterialIcons name="close" size={16} color={Colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute', top: 8, left: 16, right: 16, zIndex: 999,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 10,
  },
  ikon: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  bilgi: { flex: 1 },
  mesaj: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  alt: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
});

// ─── Leaderboard Modal ────────────────────────────────────────
function LeaderboardModal({
  gorünür,
  onKapat,
  benimSeri,
}: {
  gorünür: boolean;
  onKapat: () => void;
  benimSeri: number;
}) {
  const liste = [
    { ad: 'Sen', seri: benimSeri, ben: true },
    { ad: 'Ahmet K.', seri: 12 },
    { ad: 'Zeynep A.', seri: 9 },
    { ad: 'Murat T.', seri: 7 },
    { ad: 'Elif S.', seri: 5 },
  ].sort((a, b) => b.seri - a.seri);

  return (
    <Modal visible={gorünür} transparent animationType="slide" onRequestClose={onKapat}>
      <Pressable style={lb.overlay} onPress={onKapat}>
        <Pressable style={lb.sheet} onPress={() => {}}>
          {/* Handle */}
          <View style={lb.handle} />
          <View style={lb.header}>
            <MaterialIcons name="leaderboard" size={20} color={Colors.gold} />
            <Text style={lb.baslik}>Seri Sıralaması</Text>
            <Pressable onPress={onKapat} hitSlop={12}>
              <MaterialIcons name="close" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>
          <Text style={lb.altBaslik}>Bu haftaki streak sıralaması</Text>

          {liste.map((item, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            return (
              <View
                key={item.ad}
                style={[lb.satir, item.ben && lb.benimSatir]}
              >
                <View style={lb.siraWrap}>
                  {medal
                    ? <Text style={{ fontSize: 18 }}>{medal}</Text>
                    : <Text style={lb.siraNo}>{i + 1}</Text>}
                </View>
                <View style={lb.kisiWrap}>
                  <View style={[lb.avatar, item.ben && lb.benimAvatar]}>
                    <Text style={lb.avatarText}>{item.ad.charAt(0)}</Text>
                  </View>
                  <Text style={[lb.ad, item.ben && lb.benimAd]}>
                    {item.ad}{item.ben ? ' (Sen)' : ''}
                  </Text>
                </View>
                <View style={lb.seriWrap}>
                  <Text style={lb.ates}>🔥</Text>
                  <Text style={[lb.seriSayi, item.ben && { color: Colors.primary }]}>
                    {item.seri}
                  </Text>
                </View>
              </View>
            );
          })}

          <View style={lb.bilgi}>
            <MaterialIcons name="info-outline" size={13} color={Colors.textMuted} />
            <Text style={lb.bilgiText}>Serin arttıkça sıralamada yükselirsin</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const lb = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.md, paddingBottom: Spacing.xl,
    borderWidth: 1, borderColor: Colors.border,
  },
  handle: {
    width: 40, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginBottom: 4,
  },
  baslik: { flex: 1, fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  altBaslik: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.md },
  satir: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: Colors.border + '80', gap: Spacing.sm,
  },
  benimSatir: {
    backgroundColor: Colors.primary + '12', borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, borderTopWidth: 0, marginTop: 4,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  siraWrap: { width: 32, alignItems: 'center' },
  siraNo: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textMuted },
  kisiWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.bgSurface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  benimAvatar: { backgroundColor: Colors.primary + '25', borderColor: Colors.primary + '60' },
  avatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  ad: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  benimAd: { color: Colors.primary, fontWeight: FontWeight.bold },
  seriWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ates: { fontSize: 16 },
  seriSayi: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, minWidth: 28, textAlign: 'right' },
  bilgi: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: Spacing.md, paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  bilgiText: { fontSize: FontSize.xs, color: Colors.textMuted },
});

// ─── Ana Bileşen ────────────────────────────────────────────
export default function AnaSayfa() {
  const router = useRouter();
  const { gunlukCozulen, gunlukHedef, aktifKategoriSec, kisiselTestBaslat } = useApp();
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({ xp: 0, streak: 0, level: 1 });
  const [toast, setToast] = useState({ gorünür: false, mesaj: '', alt: '', tip: 'streak' as 'streak' | 'bonus' });
  const [leaderboardAcik, setLeaderboardAcik] = useState(false);
  const oncekiStreak = useRef(0);

  // Gerçek günlük görev durumu
  const [gorevDurumu, setGorevDurumu] = useState<GunlukGorevDurumu>({
    soruSayisi: 0,
    tekrarYapildi: false,
    miniSinavYapildi: false,
    bonusVerildi: false,
  });

  const zayifAlanlar = KATEGORILER.sort((a, b) => a.basariYuzdesi - b.basariYuzdesi).slice(0, 2);
  const displayAd = user?.username || user?.email?.split('@')[0] || 'Öğrenci';

  // ─── Günlük Görev Verisi: Supabase ──────────────────────
  const gunlukGorevYukle = useCallback(async () => {
    if (!user) {
      // Oturum açılmamışsa context'ten soru sayısını kullan
      setGorevDurumu(prev => ({ ...prev, soruSayisi: gunlukCozulen }));
      return;
    }

    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const bugunISO = bugun.toISOString();

    // Bonus daha önce verildi mi?
    const bonusKey = `gorev_bonus_${user.id}_${bugun.toISOString().split('T')[0]}`;
    const bonusVerildi = await AsyncStorage.getItem(bonusKey) === 'true';

    try {
      const supabase = getSupabaseClient();

      // Paralel sorgu: bugünkü soru geçmişi + çalışma oturumları
      const [soruRes, seansRes] = await Promise.all([
        supabase
          .from('soru_gecmisi')
          .select('id', { count: 'exact', head: false })
          .eq('user_id', user.id)
          .gte('created_at', bugunISO),
        supabase
          .from('study_sessions')
          .select('faz_tamamlandi, mini_sinav_skoru, tamamlandi')
          .eq('user_id', user.id)
          .gte('started_at', bugunISO),
      ]);

      const soruSayisi = soruRes.data?.length ?? 0;
      const seanslar = seansRes.data ?? [];

      // Tekrar: en az faz 4 tamamlanan oturum var mı (tekrar yazma fazı)
      const tekrarYapildi = seanslar.some(s => (s.faz_tamamlandi ?? 0) >= 4);

      // Mini sınav: mini_sinav_skoru dolu oturum var mı
      const miniSinavYapildi = seanslar.some(s => s.mini_sinav_skoru !== null && s.mini_sinav_skoru !== undefined);

      setGorevDurumu({ soruSayisi, tekrarYapildi, miniSinavYapildi, bonusVerildi });

      // Tüm görevler tamamlandıysa ve bonus henüz verilmediyse XP ver
      const soruTamamlandi = soruSayisi >= 20;
      if (soruTamamlandi && tekrarYapildi && miniSinavYapildi && !bonusVerildi) {
        await AsyncStorage.setItem(bonusKey, 'true');
        const guncelStats = await userStatsGuncelle(user.id, GOREV_BONUS_XP);
        if (guncelStats) {
          setStats(prev => ({ ...prev, xp: guncelStats.xp, level: guncelStats.level }));
        }
        setGorevDurumu(prev => ({ ...prev, bonusVerildi: true }));
        setToast({
          gorünür: true,
          mesaj: '🎉 Tüm Görevler Tamamlandı!',
          alt: `+${GOREV_BONUS_XP} XP Bonus kazandın! Harika bir gün!`,
          tip: 'bonus',
        });
      }
    } catch (err) {
      console.error('Günlük görev yükleme hatası:', err);
      // Hata durumunda context verisini fallback yap
      setGorevDurumu(prev => ({ ...prev, soruSayisi: gunlukCozulen }));
    }
  }, [user, gunlukCozulen]);

  // Bildirim sistemi
  useEffect(() => {
    bildirimIzniAl().then(izin => {
      if (izin) gunlukHatirlaticiKur(20, 0);
    });

    const temizle1 = bildirimDinleyiciEkle((b) => {
      const veri = b.request.content.data;
      if (veri?.tip === 'streak_milestone') {
        setToast({
          gorünür: true,
          mesaj: b.request.content.title ?? '',
          alt: b.request.content.body ?? '',
          tip: 'streak',
        });
      }
    });

    const temizle2 = bildirimTiklaDinleyiciEkle((response) => {
      const veri = response.notification.request.content.data;
      if (veri?.tip === 'streak_milestone' || veri?.tip === 'gunluk_hatirlat') {
        router.push('/(tabs)/profil');
      }
    });

    return () => { temizle1(); temizle2(); };
  }, []);

  // Streak değişince toast ve milestone
  useEffect(() => {
    if (stats.streak > 0 && stats.streak !== oncekiStreak.current) {
      const yeni = stats.streak;
      const eski = oncekiStreak.current;
      oncekiStreak.current = yeni;
      if (yeni > eski) {
        setToast({
          gorünür: true,
          mesaj: `🔥 ${yeni} Günlük Seri!`,
          alt: yeni >= 7 ? 'İnanılmaz! Bu tempoyı koru!' : 'Çalışmaya devam et, harika gidiyorsun!',
          tip: 'streak',
        });
        streakMilestoneBildir(yeni);
      }
    }
  }, [stats.streak]);

  useEffect(() => {
    if (user) {
      loadStats();
      gunlukGorevYukle();
    }
  }, [user]);

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

  // Görev hesaplamaları
  const soruTamamlandi = gorevDurumu.soruSayisi >= 20;
  const tekrarTamamlandi = gorevDurumu.tekrarYapildi;
  const miniSinavTamamlandi = gorevDurumu.miniSinavYapildi;
  const tumGorevlerTamamlandi = soruTamamlandi && tekrarTamamlandi && miniSinavTamamlandi;

  const tamamlananGorevSayisi = [soruTamamlandi, tekrarTamamlandi, miniSinavTamamlandi].filter(Boolean).length;

  const gunlukGorevler = [
    {
      id: 'soru',
      label: '20 soru çöz',
      hedef: 20,
      mevcut: gorevDurumu.soruSayisi,
      tamamlandi: soruTamamlandi,
      icon: 'quiz' as keyof typeof MaterialIcons.glyphMap,
      onPress: () => router.push({ pathname: '/soru', params: { kategoriId: 'turkce', mod: 'hizli' } }),
    },
    {
      id: 'tekrar',
      label: '1 öğrenme döngüsü yap',
      hedef: 1,
      mevcut: tekrarTamamlandi ? 1 : 0,
      tamamlandi: tekrarTamamlandi,
      icon: 'loop' as keyof typeof MaterialIcons.glyphMap,
      onPress: handleOgrenmeDongusu,
    },
    {
      id: 'sinav',
      label: '1 mini sınav tamamla',
      hedef: 1,
      mevcut: miniSinavTamamlandi ? 1 : 0,
      tamamlandi: miniSinavTamamlandi,
      icon: 'emoji-events' as keyof typeof MaterialIcons.glyphMap,
      onPress: handleOgrenmeDongusu,
    },
  ];

  // İlerleme yüzdesi (bugünkü soru sayısına göre)
  const ilerlemeYuzdesi = Math.min((gorevDurumu.soruSayisi / 20) * 100, 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* In-App Toast */}
      <AppToast
        mesaj={toast.mesaj}
        alt={toast.alt}
        gorünür={toast.gorünür}
        tip={toast.tip}
        onGizle={() => setToast(t => ({ ...t, gorünür: false }))}
      />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        gorünür={leaderboardAcik}
        onKapat={() => setLeaderboardAcik(false)}
        benimSeri={stats.streak}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ─── Header ────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerSol}>
            <Text style={styles.appName}>KPSS Master</Text>
            <Text style={styles.headerSub}>Merhaba, {displayAd} 👋</Text>
          </View>
          <View style={styles.headerIkonlar}>
            {/* Leaderboard İkon */}
            <Pressable
              style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.7 }]}
              onPress={() => setLeaderboardAcik(true)}
            >
              <MaterialIcons name="leaderboard" size={20} color={Colors.gold} />
              {/* Sıralama badge (streakten bağımsız) */}
              <View style={styles.lbBadge}>
                <Text style={styles.lbBadgeText}>🏆</Text>
              </View>
            </Pressable>
            {/* Streak Badge */}
            <Pressable
              style={styles.streakBadge}
              onPress={() => router.push('/(tabs)/profil')}
            >
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={styles.streakText}>{stats.streak}</Text>
            </Pressable>
          </View>
        </View>

        {/* ─── XP & Level ─────────────────────────────────── */}
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
                  <View style={[styles.xpFill, { width: `${xpProgress}%` }]} />
                </View>
                <Text style={styles.xpAlt}>
                  {XP_PER_LEVEL - (stats.xp % XP_PER_LEVEL)} XP sonraki seviye
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ─── Günlük Görevler ─────────────────────────────── */}
        <View style={[styles.gorevKart, tumGorevlerTamamlandi && styles.gorevKartTamamlandi]}>
          <View style={styles.gorevHeader}>
            <Text style={styles.gorevEmoji}>{tumGorevlerTamamlandi ? '🎉' : '📋'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.gorevBaslik}>Bugün Seni Neler Bekliyor</Text>
              {tumGorevlerTamamlandi && (
                <Text style={styles.gorevTamamlandiAlt}>Tüm görevler tamamlandı! +{GOREV_BONUS_XP} XP</Text>
              )}
            </View>
            {/* İlerleme göstergesi */}
            <View style={styles.gorevSayacBadge}>
              <Text style={[styles.gorevSayacText, { color: tumGorevlerTamamlandi ? Colors.success : Colors.primary }]}>
                {tamamlananGorevSayisi}/3
              </Text>
            </View>
          </View>

          {/* Progress bar görev durumu için */}
          <View style={styles.gorevProgressBg}>
            <View style={[styles.gorevProgressFill, {
              width: `${(tamamlananGorevSayisi / 3) * 100}%`,
              backgroundColor: tumGorevlerTamamlandi ? Colors.success : Colors.primary,
            }]} />
          </View>

          {gunlukGorevler.map((gorev) => (
            <Pressable
              key={gorev.id}
              style={({ pressed }) => [
                styles.gorevItem,
                gorev.tamamlandi && styles.gorevItemTamamlandi,
                pressed && !gorev.tamamlandi && { opacity: 0.7 },
              ]}
              onPress={gorev.tamamlandi ? undefined : gorev.onPress}
            >
              <View style={[styles.gorevCheckCircle, gorev.tamamlandi && styles.gorevCheckDolu]}>
                {gorev.tamamlandi
                  ? <MaterialIcons name="check" size={14} color="#fff" />
                  : <MaterialIcons name={gorev.icon} size={14} color={Colors.textMuted} />}
              </View>
              <Text style={[styles.gorevLabel, gorev.tamamlandi && styles.gorevLabelTamamlandi]}>
                {gorev.label}
              </Text>
              {gorev.tamamlandi ? (
                <View style={styles.gorevTikBadge}>
                  <Text style={styles.gorevTikText}>✓ Tamamlandı</Text>
                </View>
              ) : (
                <>
                  {gorev.id === 'soru' && (
                    <Text style={styles.gorevSayac}>{gorev.mevcut}/20</Text>
                  )}
                  <MaterialIcons name="chevron-right" size={16} color={Colors.textMuted} />
                </>
              )}
            </Pressable>
          ))}

          {/* Bonus bilgisi */}
          {!tumGorevlerTamamlandi && (
            <View style={styles.bonusBilgi}>
              <MaterialIcons name="stars" size={14} color={Colors.gold} />
              <Text style={styles.bonusBilgiText}>
                Tümünü tamamla → +{GOREV_BONUS_XP} XP Bonus!
              </Text>
            </View>
          )}
        </View>

        {/* ─── Günlük Soru Hedefi ──────────────────────────── */}
        <View style={styles.hedefKart}>
          <View style={styles.hedefHeader}>
            <MaterialIcons name="flag" size={18} color={Colors.gold} />
            <Text style={styles.hedefBaslik}>Günlük Soru Hedefi</Text>
            <Text style={styles.hedefAdet}>{gorevDurumu.soruSayisi}/20 soru</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, {
              width: `${ilerlemeYuzdesi}%`,
              backgroundColor: soruTamamlandi ? Colors.success : Colors.primary,
            }]} />
          </View>
          <Text style={styles.hedefAlt}>
            {soruTamamlandi
              ? '🎉 Günlük soru hedefini tamamladın!'
              : `${20 - gorevDurumu.soruSayisi} soru daha çöz ve hedefe ulaş!`}
          </Text>
        </View>

        {/* ─── Öğrenme Döngüsü ─────────────────────────────── */}
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

        {/* ─── Hızlı Başla ─────────────────────────────────── */}
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

        {/* ─── Devam Et ────────────────────────────────────── */}
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

        {/* ─── AI Koç ──────────────────────────────────────── */}
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

        {/* ─── Zayıf Alanlar ───────────────────────────────── */}
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

        {/* ─── Akıllı Başlat ───────────────────────────────── */}
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

        {/* ─── Bana Özel Test ──────────────────────────────── */}
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

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  headerSol: { flex: 1 },
  appName: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, letterSpacing: 0.5 },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  headerIkonlar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerIconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  lbBadge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: Colors.bgCard, borderRadius: 8, padding: 1,
  },
  lbBadgeText: { fontSize: 9 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  streakFire: { fontSize: 18 },
  streakText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.gold },

  // XP Kartı
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
  gorevKartTamamlandi: {
    borderColor: Colors.success + '50',
    backgroundColor: Colors.bgCard,
  },
  gorevHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  gorevEmoji: { fontSize: 20 },
  gorevBaslik: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  gorevTamamlandiAlt: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.semibold, marginTop: 1 },
  gorevSayacBadge: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border,
  },
  gorevSayacText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  gorevProgressBg: {
    height: 4, backgroundColor: Colors.bgSurface, borderRadius: Radius.full,
    overflow: 'hidden', marginBottom: Spacing.sm,
  },
  gorevProgressFill: { height: '100%', borderRadius: Radius.full },
  gorevItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 11, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  gorevItemTamamlandi: { opacity: 0.8 },
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
  gorevSayac: { fontSize: FontSize.xs, color: Colors.textMuted, marginRight: 2 },
  bonusBilgi: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  bonusBilgiText: { fontSize: FontSize.xs, color: Colors.gold, fontWeight: FontWeight.semibold },

  // Hedef
  hedefKart: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  hedefHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  hedefBaslik: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, flex: 1 },
  hedefAdet: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  progressBg: { height: 10, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.sm },
  progressFill: { height: '100%', borderRadius: Radius.full },
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

  // Hızlı Başla
  hizliRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  hizliKart: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, minHeight: 110, justifyContent: 'flex-end' },
  hizliKartMavi: { backgroundColor: Colors.primary + '22', borderWidth: 1, borderColor: Colors.primary + '55' },
  hizliKartTuruncu: { backgroundColor: Colors.warning + '22', borderWidth: 1, borderColor: Colors.warning + '55' },
  pressedCard: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  hizliEmoji: { fontSize: 28, marginBottom: Spacing.xs },
  hizliKartBaslik: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  hizliKartAlt: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  // Devam Et
  devamKart: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg,
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  devamIcon: {
    width: 48, height: 48, borderRadius: Radius.md,
    backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center',
  },
  devamBilgi: { flex: 1 },
  devamBaslik: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  devamAlt: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 3 },

  // AI Koç
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

  // Zayıf Alanlar
  zayifKart: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard,
    borderRadius: Radius.md, padding: Spacing.sm + 4, marginBottom: Spacing.sm,
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
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
  ozelTestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 18, paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm, gap: Spacing.sm,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  ozelTestEmoji: { fontSize: 20 },
  ozelTestIcerik: { flex: 1 },
  ozelTestText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#FFFFFF' },
  ozelTestAlt: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
});
