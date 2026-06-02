import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { ROZETLER } from '@/constants/data';
import { useAuth, useAlert } from '@/template';
import { getSupabaseClient } from '@/template';
import { useRouter } from 'expo-router';
import { userStatsGetir } from '@/services/learningService';

const XP_PER_LEVEL = 500;

// Sonraki rozet hesapla
function getSonrakiRozet(toplamSoru: number, streak: number) {
  if (toplamSoru < 1) return { rozet: ROZETLER[0], hedef: 1, mevcut: 0, label: 'İlk soruyu çöz' };
  if (streak < 7) return { rozet: ROZETLER[2], hedef: 7, mevcut: streak, label: `${7 - streak} gün kaldı` };
  return { rozet: ROZETLER[3], hedef: 1, mevcut: 0, label: 'Bir konuda %90 başarıya ulaş' };
}

export default function Profil() {
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const [istatistik, setIstatistik] = useState({ toplam: 0, dogru: 0, yanlis: 0 });
  const [stats, setStats] = useState({ xp: 0, streak: 0, level: 1 });
  const [isPremium, setIsPremium] = useState(false);

  // Rozet glow animasyonları
  const glowAnims = useRef(ROZETLER.map(() => new Animated.Value(0.5))).current;

  useEffect(() => {
    if (user) {
      loadIstatistik();
      loadStats();
    }
  }, [user]);

  useEffect(() => {
    // Kazanılan rozetler için glow loop
    const anims = glowAnims.map((anim, i) => {
      if (ROZETLER[i].kazanildi || (i === 0 && istatistik.toplam > 0)) {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 1500 + i * 200, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.4, duration: 1500 + i * 200, useNativeDriver: true }),
          ])
        );
      }
      return null;
    });
    anims.forEach(a => a?.start());
    return () => anims.forEach(a => a?.stop());
  }, [istatistik.toplam]);

  const loadIstatistik = async () => {
    if (!user) return;
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.from('soru_gecmisi').select('dogru').eq('user_id', user.id);
      if (data) {
        const dogru = data.filter(d => d.dogru).length;
        setIstatistik({ toplam: data.length, dogru, yanlis: data.length - dogru });
      }
    } catch {}
  };

  const loadStats = async () => {
    if (!user) return;
    const data = await userStatsGetir(user.id);
    if (data) {
      setStats({ xp: data.xp, streak: data.streak, level: data.level });
      setIsPremium(data.is_premium ?? false);
    }
  };

  const basariYuzdesi = istatistik.toplam > 0
    ? Math.round((istatistik.dogru / istatistik.toplam) * 100) : 0;

  const xpProgress = (stats.xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100;
  const xpKalan = XP_PER_LEVEL - (stats.xp % XP_PER_LEVEL);
  const sonrakiRozet = getSonrakiRozet(istatistik.toplam, stats.streak);

  const handleCikis = () => {
    showAlert('Çıkış Yap', 'Hesabından çıkmak istediğine emin misin?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  const handleHesapSil = () => {
    showAlert('Hesabı Sil', 'Bu işlem geri alınamaz. Devam etmek istiyor musun?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        await logout();
        showAlert('Hesap silme için lütfen destek ile iletişime geç.', '');
      }},
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.baslik}>Profil</Text>
        </View>
        <View style={styles.girisYapilmamis}>
          <View style={styles.avatarBuyuk}>
            <MaterialIcons name="person" size={52} color={Colors.textMuted} />
          </View>
          <Text style={styles.girisBaslik}>Hesabına Giriş Yap</Text>
          <Text style={styles.girisAciklama}>
            Verilerini kaybetmemek ve tüm cihazlarda senkronize tutmak için giriş yap.
          </Text>
          <View style={styles.ozellikler}>
            {['Çalışma geçmişini kaydet', 'Tüm kategorilere eriş', 'AI koç önerileri al', 'Rozet ve başarılar kazan'].map((ozellik, i) => (
              <View key={i} style={styles.ozellikItem}>
                <MaterialIcons name="check-circle" size={18} color={Colors.success} />
                <Text style={styles.ozellikText}>{ozellik}</Text>
              </View>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [styles.girisBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.girisBtnText}>Giriş Yap / Kayıt Ol</Text>
          </Pressable>
          <View style={styles.premiumBanner}>
            <Text style={styles.premiumEmoji}>👑</Text>
            <View style={styles.premiumBilgi}>
              <Text style={styles.premiumBaslik}>KPSS Master Premium</Text>
              <Text style={styles.premiumAciklama}>Sınırsız soru • AI özel test • Reklamsız</Text>
            </View>
            <Text style={styles.premiumFiyat}>₺29/ay</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const adHarf = (user.email || 'K').charAt(0).toUpperCase();
  const displayAd = user.username || user.email?.split('@')[0] || 'Kullanıcı';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.baslik}>Profil</Text>
        </View>

        {/* Kullanıcı Kartı */}
        <View style={styles.kullaniciKart}>
          <View style={styles.avatarBuyuk}>
            <Text style={styles.avatarHarf}>{adHarf}</Text>
          </View>
          <View style={styles.kullaniciAdRow}>
            <Text style={styles.kullaniciAd}>{displayAd}</Text>
            {isPremium && (
              <View style={styles.premiumUserBadge}>
                <Text style={styles.premiumUserBadgeText}>👑 PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.kullaniciEmail}>{user.email}</Text>
          <View style={styles.istatRow}>
            <View style={styles.istatItem}>
              <Text style={[styles.istatSayi, { color: Colors.primary }]}>{istatistik.toplam}</Text>
              <Text style={styles.istatLabel}>Toplam Soru</Text>
            </View>
            <View style={styles.istatAyrac} />
            <View style={styles.istatItem}>
              <Text style={[styles.istatSayi, { color: Colors.success }]}>%{basariYuzdesi}</Text>
              <Text style={styles.istatLabel}>Başarı</Text>
            </View>
            <View style={styles.istatAyrac} />
            <View style={styles.istatItem}>
              <Text style={[styles.istatSayi, { color: Colors.gold }]}>🔥 {stats.streak}</Text>
              <Text style={styles.istatLabel}>Günlük Seri</Text>
            </View>
          </View>
        </View>

        {/* Level & XP — Büyük */}
        <View style={styles.levelKart}>
          <View style={styles.levelRow}>
            <View style={styles.levelCircle}>
              <Text style={styles.levelNumara}>{stats.level}</Text>
              <Text style={styles.levelLabel}>Seviye</Text>
            </View>
            <View style={styles.levelBilgi}>
              <View style={styles.levelHeader}>
                <Text style={styles.levelBaslik}>Toplam XP</Text>
                <Text style={styles.levelXP}>{stats.xp} XP</Text>
              </View>
              <View style={styles.levelBar}>
                <View style={[styles.levelFill, { width: `${xpProgress}%` }]} />
              </View>
              <Text style={styles.levelAlt}>{xpKalan} XP → Seviye {stats.level + 1}</Text>
            </View>
          </View>
        </View>

        {/* Bir Sonraki Rozet Hedefi */}
        <View style={styles.sonrakiRozetKart}>
          <View style={styles.sonrakiRozetHeader}>
            <MaterialIcons name="emoji-events" size={16} color={Colors.gold} />
            <Text style={styles.sonrakiRozetBaslik}>Bir Sonraki Hedef</Text>
          </View>
          <View style={styles.sonrakiRozetRow}>
            <Text style={styles.sonrakiRozetEmoji}>{sonrakiRozet.rozet.emoji}</Text>
            <View style={styles.sonrakiRozetBilgi}>
              <Text style={styles.sonrakiRozetAd}>{sonrakiRozet.rozet.ad}</Text>
              <Text style={styles.sonrakiRozetLabel}>{sonrakiRozet.label}</Text>
            </View>
          </View>
        </View>

        {/* Rozetler */}
        <View style={styles.bolum}>
          <Text style={styles.bolumBaslik}>🏅 Rozetler</Text>
          <View style={styles.rozetGrid}>
            {ROZETLER.map((rozet, i) => {
              const kazanildi = rozet.id === 'ilk_soru' ? istatistik.toplam > 0 : rozet.kazanildi;
              return (
                <View key={rozet.id} style={[styles.rozetKart, !kazanildi && styles.rozetKilitli]}>
                  {kazanildi && (
                    <Animated.View style={[styles.rozetGlow, { opacity: glowAnims[i] }]} />
                  )}
                  <Text style={[styles.rozetEmoji, !kazanildi && { opacity: 0.3 }]}>{rozet.emoji}</Text>
                  <Text style={[styles.rozetAd, !kazanildi && styles.rozetKilitliText]}>{rozet.ad}</Text>
                  <Text style={styles.rozetAciklama} numberOfLines={2}>{rozet.aciklama}</Text>
                  {kazanildi && (
                    <View style={styles.rozetKazanildiBadge}>
                      <MaterialIcons name="check" size={10} color="#fff" />
                    </View>
                  )}
                  {!kazanildi && (
                    <MaterialIcons name="lock" size={14} color={Colors.textMuted} style={{ marginTop: 4 }} />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Premium */}
        <View style={styles.premiumBolum}>
          {isPremium ? (
            <View style={[styles.premiumBanner, styles.premiumAktifBanner]}>
              <Text style={styles.premiumEmoji}>👑</Text>
              <View style={styles.premiumBilgi}>
                <Text style={[styles.premiumBaslik, { color: Colors.gold }]}>Premium Aktif!</Text>
                <Text style={styles.premiumAciklama}>Tüm özellikler açık • Sınırsız erişim</Text>
              </View>
              <View style={styles.premiumAktifBadge}>
                <MaterialIcons name="verified" size={16} color={Colors.gold} />
                <Text style={styles.premiumAktifText}>Aktif</Text>
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.premiumBanner, pressed && { opacity: 0.9 }]}
              onPress={() => router.push('/premium')}
            >
              <Text style={styles.premiumEmoji}>👑</Text>
              <View style={styles.premiumBilgi}>
                <Text style={styles.premiumBaslik}>KPSS Master Premium</Text>
                <Text style={styles.premiumAciklama}>100 soru • AI koç • Gelişmiş analiz</Text>
              </View>
              <View style={styles.premiumBtn}>
                <Text style={styles.premiumBtnText}>₺149</Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* Ayarlar */}
        <View style={styles.bolum}>
          <Text style={styles.bolumBaslik}>⚙️ Ayarlar</Text>
          <View style={styles.ayarlarKart}>
            {[
              { icon: 'privacy-tip', label: 'Gizlilik Politikası' },
              { icon: 'description', label: 'Kullanım Koşulları' },
            ].map((item, i) => (
              <Pressable key={i} style={[styles.ayarItem, i > 0 && styles.ayarItemBorder]}>
                <MaterialIcons name={item.icon as any} size={20} color={Colors.textSecondary} />
                <Text style={styles.ayarText}>{item.label}</Text>
                <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
              </Pressable>
            ))}
            <Pressable style={[styles.ayarItem, styles.ayarItemBorder]} onPress={handleHesapSil}>
              <MaterialIcons name="delete-forever" size={20} color={Colors.error} />
              <Text style={[styles.ayarText, { color: Colors.error }]}>Hesabımı Sil</Text>
              <MaterialIcons name="chevron-right" size={20} color={Colors.error} />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.cikisBtn, pressed && { opacity: 0.8 }]}
          onPress={handleCikis}
        >
          <MaterialIcons name="logout" size={18} color={Colors.error} />
          <Text style={styles.cikisBtnText}>Çıkış Yap</Text>
        </Pressable>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  baslik: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  girisYapilmamis: { alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.xl },
  avatarBuyuk: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.bgCard,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border, marginBottom: Spacing.md,
  },
  avatarHarf: { fontSize: 36, fontWeight: FontWeight.bold, color: Colors.primary },
  girisBaslik: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm, textAlign: 'center' },
  girisAciklama: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.lg },
  ozellikler: { alignSelf: 'stretch', marginBottom: Spacing.lg, gap: Spacing.sm },
  ozellikItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ozellikText: { fontSize: FontSize.sm, color: Colors.textPrimary },
  girisBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14,
    paddingHorizontal: Spacing.xl, alignSelf: 'stretch', alignItems: 'center', marginBottom: Spacing.md,
  },
  girisBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#FFFFFF' },
  kullaniciKart: {
    backgroundColor: Colors.bgCard, marginHorizontal: Spacing.md, borderRadius: Radius.xl,
    padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  kullaniciAdRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  kullaniciAd: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  premiumUserBadge: {
    backgroundColor: Colors.gold + '20', borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.gold + '50',
  },
  premiumUserBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.gold },
  kullaniciEmail: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  istatRow: { flexDirection: 'row', width: '100%', paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  istatItem: { flex: 1, alignItems: 'center' },
  istatAyrac: { width: 1, backgroundColor: Colors.border },
  istatSayi: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, marginBottom: 4 },
  istatLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  // Level Kartı — Büyük
  levelKart: {
    backgroundColor: Colors.bgCard, marginHorizontal: Spacing.md, borderRadius: Radius.xl,
    padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: Colors.gold + '40',
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  levelCircle: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: Colors.gold + '20', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.gold + '60',
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  levelNumara: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.gold, lineHeight: 28 },
  levelLabel: { fontSize: 9, color: Colors.gold, fontWeight: FontWeight.bold },
  levelBilgi: { flex: 1 },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  levelBaslik: { fontSize: FontSize.sm, color: Colors.textSecondary },
  levelXP: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  levelBar: { height: 10, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, overflow: 'hidden', marginBottom: 6 },
  levelFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: Radius.full },
  levelAlt: { fontSize: FontSize.xs, color: Colors.textMuted },
  // Sonraki Rozet
  sonrakiRozetKart: {
    marginHorizontal: Spacing.md, backgroundColor: Colors.gold + '10', borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.gold + '30', marginBottom: Spacing.md,
  },
  sonrakiRozetHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  sonrakiRozetBaslik: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.gold },
  sonrakiRozetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sonrakiRozetEmoji: { fontSize: 28 },
  sonrakiRozetBilgi: { flex: 1 },
  sonrakiRozetAd: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sonrakiRozetLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  bolum: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  bolumBaslik: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  rozetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  rozetKart: {
    width: '47%', backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, position: 'relative', overflow: 'hidden',
  },
  rozetKilitli: { opacity: 0.55 },
  rozetGlow: {
    position: 'absolute', top: -10, left: -10, right: -10, bottom: -10,
    backgroundColor: Colors.gold,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20,
  },
  rozetEmoji: { fontSize: 26, marginBottom: Spacing.xs },
  rozetAd: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 4 },
  rozetKilitliText: { color: Colors.textMuted },
  rozetAciklama: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  rozetKazanildiBadge: {
    position: 'absolute', top: Spacing.sm, right: Spacing.sm,
    width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  premiumBolum: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  premiumBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gold + '18',
    borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.gold + '40', gap: Spacing.sm,
  },
  premiumAktifBanner: { borderColor: Colors.gold + '60', backgroundColor: Colors.gold + '12' },
  premiumAktifBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.gold + '25', borderRadius: Radius.md,
    paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.gold + '50',
  },
  premiumAktifText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.gold },
  premiumEmoji: { fontSize: 28 },
  premiumBilgi: { flex: 1 },
  premiumBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  premiumAciklama: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  premiumFiyat: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.gold },
  premiumBtn: { backgroundColor: Colors.gold, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  premiumBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textInverse },
  ayarlarKart: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  ayarItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  ayarItemBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  ayarText: { flex: 1, fontSize: FontSize.base, color: Colors.textPrimary },
  cikisBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.error + '40', gap: Spacing.sm, marginBottom: Spacing.md,
  },
  cikisBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.error },
});
