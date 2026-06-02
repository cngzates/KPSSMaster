import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, Linking, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useAuth, useAlert } from '@/template';
import { getSupabaseClient } from '@/template';

const IYZICO_LINK = 'https://iyzi.link/AKmtoA';

const PREMIUM_OZELLIKLER = [
  {
    icon: 'quiz' as const,
    baslik: '100 Soruluk Test Modu',
    aciklama: 'Standart 10 yerine tam 100 soruluk kapsamlı testler çöz',
    renk: Colors.primary,
  },
  {
    icon: 'auto-awesome' as const,
    baslik: 'Sınırsız AI Açıklama',
    aciklama: 'Her soru için detaylı AI açıklaması ve özel ipuçları al',
    renk: Colors.gold,
  },
  {
    icon: 'bar-chart' as const,
    baslik: 'Gelişmiş Analiz',
    aciklama: 'Detaylı performans grafikleri, konu bazlı derinlemesine analiz',
    renk: Colors.success,
  },
  {
    icon: 'bolt' as const,
    baslik: 'Öncelikli AI Erişimi',
    aciklama: 'Daha hızlı yanıt süreleri ve gelişmiş KPSS odaklı promptlar',
    renk: '#F72585',
  },
  {
    icon: 'star' as const,
    baslik: 'Premium Rozet',
    aciklama: 'Profilinde özel premium rozet ve toplulukta öne çıkma',
    renk: Colors.warning,
  },
];

export default function PremiumEkrani() {
  const router = useRouter();
  const { user } = useAlert ? useAuth() : { user: null };
  const { showAlert } = useAlert();
  const [isPremium, setIsPremium] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [aktifEdiliyor, setAktifEdiliyor] = useState(false);

  // Shimmer animasyonu
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const starAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(starAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(starAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (user) premiumDurumYukle();
    else setYukleniyor(false);
  }, [user]);

  const premiumDurumYukle = async () => {
    if (!user) return;
    setYukleniyor(true);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('user_stats')
        .select('is_premium')
        .eq('user_id', user.id)
        .single();
      setIsPremium(data?.is_premium ?? false);
    } catch {}
    finally { setYukleniyor(false); }
  };

  const handleSatinAl = async () => {
    await Linking.openURL(IYZICO_LINK);
  };

  const handleOdemeyiYaptim = async () => {
    if (!user) {
      showAlert('Giriş Gerekli', 'Premium aktivasyonu için giriş yapmanız gerekiyor.', [
        { text: 'Tamam', style: 'default' },
      ]);
      return;
    }

    showAlert(
      'Ödeme Onayı',
      'iyzico üzerinden ödeme yaptıysanız Premium hesabınız aktif edilecek. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Aktif Et',
          style: 'default',
          onPress: async () => {
            setAktifEdiliyor(true);
            try {
              const supabase = getSupabaseClient();

              // user_stats satırının var olup olmadığını kontrol et
              const { data: mevcut } = await supabase
                .from('user_stats')
                .select('id')
                .eq('user_id', user.id)
                .single();

              if (mevcut) {
                await supabase
                  .from('user_stats')
                  .update({
                    is_premium: true,
                    premium_activated_at: new Date().toISOString(),
                  })
                  .eq('user_id', user.id);
              } else {
                await supabase.from('user_stats').insert({
                  user_id: user.id,
                  xp: 0,
                  streak: 0,
                  level: 1,
                  is_premium: true,
                  premium_activated_at: new Date().toISOString(),
                });
              }

              setIsPremium(true);
              showAlert(
                '🎉 Premium Aktif!',
                'KPSS Master Premium hesabınız başarıyla aktive edildi. İyi çalışmalar!',
                [{ text: 'Harika!', style: 'default' }]
              );
            } catch (e) {
              console.error('Premium aktif hatası:', e);
              showAlert('Hata', 'Aktivasyon sırasında bir sorun oluştu. Lütfen tekrar deneyin.');
            } finally {
              setAktifEdiliyor(false);
            }
          },
        },
      ]
    );
  };

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.9, 0.3],
  });

  if (yukleniyor) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Premium Aktif Ekranı ──────────────────────────────────────────
  if (isPremium) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.geriHeader}>
          <Pressable style={styles.geriBtn} onPress={() => router.back()} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.aktifEkrani}>
          <Animated.View style={[styles.premiumIkonWrap, { transform: [{ scale: starAnim }] }]}>
            <Text style={styles.premiumIkon}>👑</Text>
          </Animated.View>
          <Text style={styles.aktifBaslik}>Premium Aktif!</Text>
          <Text style={styles.aktifAlt}>Tüm premium özelliklerin kilidini açtın.</Text>

          <View style={styles.aktifOzellikler}>
            {PREMIUM_OZELLIKLER.map((o, i) => (
              <View key={i} style={styles.aktifOzellikItem}>
                <View style={[styles.aktifOzellikIkon, { backgroundColor: o.renk + '20' }]}>
                  <MaterialIcons name={o.icon} size={18} color={o.renk} />
                </View>
                <Text style={styles.aktifOzellikText}>{o.baslik}</Text>
                <MaterialIcons name="check-circle" size={18} color={Colors.success} />
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.devamBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.devamBtnText}>Çalışmaya Devam Et</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Paywall Ekranı ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Geri Butonu */}
      <View style={styles.geriHeader}>
        <Pressable style={styles.geriBtn} onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.premiumChip}>
          <MaterialIcons name="verified" size={12} color={Colors.gold} />
          <Text style={styles.premiumChipText}>KPSS Master PRO</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.icerik}>
        {/* Hero */}
        <View style={styles.heroWrap}>
          <Animated.View style={[styles.heroIkonWrap, { opacity: shimmerOpacity }]}>
            <Text style={styles.heroIkon}>👑</Text>
          </Animated.View>
          <Text style={styles.heroBaslik}>KPSS Master{'\n'}Premium</Text>
          <Text style={styles.heroAlt}>
            Tüm özelliklerin kilidi açık, sınırsız pratik, AI koç desteği
          </Text>
        </View>

        {/* Fiyat Kartı */}
        <View style={styles.fiyatKart}>
          <View style={styles.fiyatSol}>
            <Text style={styles.fiyatLabel}>Tek Seferlik Ödeme</Text>
            <View style={styles.fiyatRow}>
              <Text style={styles.fiyatTL}>₺</Text>
              <Text style={styles.fiyatSayi}>149</Text>
            </View>
            <Text style={styles.fiyatAlt}>Ömür boyu erişim • iyzico güvencesi</Text>
          </View>
          <View style={styles.fiyatSag}>
            <View style={styles.kampanyaBadge}>
              <Text style={styles.kampanyaText}>%40 İndirim</Text>
            </View>
            <Text style={styles.eskiFiyat}>₺249</Text>
          </View>
        </View>

        {/* Özellikler */}
        <Text style={styles.bolumBaslik}>Premium ile neler kazanacaksın?</Text>
        <View style={styles.ozelliklerKart}>
          {PREMIUM_OZELLIKLER.map((o, i) => (
            <View key={i} style={[styles.ozellikItem, i > 0 && styles.ozellikItemBorder]}>
              <View style={[styles.ozellikIkonWrap, { backgroundColor: o.renk + '18' }]}>
                <MaterialIcons name={o.icon} size={20} color={o.renk} />
              </View>
              <View style={styles.ozellikBilgi}>
                <Text style={styles.ozellikBaslik}>{o.baslik}</Text>
                <Text style={styles.ozellikAciklama}>{o.aciklama}</Text>
              </View>
              <MaterialIcons name="check-circle" size={18} color={o.renk} />
            </View>
          ))}
        </View>

        {/* Güven Sinyalleri */}
        <View style={styles.guvenRow}>
          {[
            { icon: 'lock' as const, text: '256-bit SSL' },
            { icon: 'verified-user' as const, text: 'iyzico Güvencesi' },
            { icon: 'support-agent' as const, text: 'Destek' },
          ].map((item, i) => (
            <View key={i} style={styles.guvenItem}>
              <MaterialIcons name={item.icon} size={16} color={Colors.success} />
              <Text style={styles.guvenText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Satın Al Butonu */}
        <Pressable
          style={({ pressed }) => [styles.satinAlBtn, pressed && { opacity: 0.9 }]}
          onPress={handleSatinAl}
        >
          <MaterialIcons name="credit-card" size={20} color="#fff" />
          <View style={styles.satinAlIcerik}>
            <Text style={styles.satinAlText}>Hemen Satın Al — ₺149</Text>
            <Text style={styles.satinAlAlt}>iyzico ile güvenli ödeme</Text>
          </View>
          <MaterialIcons name="open-in-new" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>

        {/* Ödemeyi Yaptım */}
        <Pressable
          style={({ pressed }) => [styles.odemeYaptimBtn, pressed && { opacity: 0.8 }]}
          onPress={handleOdemeyiYaptim}
          disabled={aktifEdiliyor}
        >
          {aktifEdiliyor ? (
            <ActivityIndicator size="small" color={Colors.gold} />
          ) : (
            <MaterialIcons name="check-circle-outline" size={18} color={Colors.gold} />
          )}
          <Text style={styles.odemeYaptimText}>
            {aktifEdiliyor ? 'Aktif ediliyor...' : 'Ödemeyi yaptım, premium aktif et'}
          </Text>
        </Pressable>

        <Text style={styles.notText}>
          * Ödeme yaptıktan sonra "Ödemeyi yaptım" butonuna tıklayarak Premium üyeliğini aktive et.
          Sorun yaşarsan: support@kpssmaster.com
        </Text>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  geriHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  geriBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  premiumChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.gold + '18', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.gold + '40',
  },
  premiumChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.gold },

  icerik: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  // Hero
  heroWrap: { alignItems: 'center', paddingVertical: Spacing.lg },
  heroIkonWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.gold + '20', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.gold + '50', marginBottom: Spacing.md,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  heroIkon: { fontSize: 44 },
  heroBaslik: {
    fontSize: 32, fontWeight: FontWeight.extrabold, color: Colors.textPrimary,
    textAlign: 'center', lineHeight: 38, marginBottom: Spacing.sm,
  },
  heroAlt: {
    fontSize: FontSize.sm, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 20,
  },

  // Fiyat
  fiyatKart: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.gold + '12', borderRadius: Radius.xl, padding: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.gold + '40', marginBottom: Spacing.lg,
  },
  fiyatSol: { flex: 1 },
  fiyatLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4 },
  fiyatRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 2 },
  fiyatTL: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.gold, marginTop: 4 },
  fiyatSayi: { fontSize: 42, fontWeight: FontWeight.extrabold, color: Colors.gold, lineHeight: 48 },
  fiyatAlt: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },
  fiyatSag: { alignItems: 'center', gap: 6 },
  kampanyaBadge: {
    backgroundColor: Colors.error + '20', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.error + '40',
  },
  kampanyaText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.error },
  eskiFiyat: { fontSize: FontSize.base, color: Colors.textMuted, textDecorationLine: 'line-through' },

  bolumBaslik: {
    fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  // Özellikler
  ozelliklerKart: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, overflow: 'hidden',
  },
  ozellikItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  ozellikItemBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  ozellikIkonWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  ozellikBilgi: { flex: 1 },
  ozellikBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 2 },
  ozellikAciklama: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },

  // Güven
  guvenRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: Spacing.sm, marginBottom: Spacing.lg,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  guvenItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  guvenText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },

  // Satın Al
  satinAlBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.gold, borderRadius: Radius.xl,
    paddingVertical: 18, paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 8,
  },
  satinAlIcerik: { flex: 1 },
  satinAlText: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold, color: '#fff' },
  satinAlAlt: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // Ödemeyi Yaptım
  odemeYaptimBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.gold + '50', borderRadius: Radius.xl,
    paddingVertical: 14, marginBottom: Spacing.sm,
    backgroundColor: Colors.gold + '10',
  },
  odemeYaptimText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.gold },

  notText: {
    fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center',
    lineHeight: 18, paddingHorizontal: Spacing.sm, marginBottom: Spacing.md,
  },

  // Aktif Ekranı
  aktifEkrani: {
    alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg, paddingBottom: Spacing.xl,
  },
  premiumIkonWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.gold + '25', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.gold + '60', marginBottom: Spacing.md,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
  },
  premiumIkon: { fontSize: 52 },
  aktifBaslik: {
    fontSize: 32, fontWeight: FontWeight.extrabold, color: Colors.gold,
    textAlign: 'center', marginBottom: Spacing.sm,
  },
  aktifAlt: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  aktifOzellikler: {
    alignSelf: 'stretch', backgroundColor: Colors.bgCard, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.gold + '30', overflow: 'hidden', marginBottom: Spacing.xl,
  },
  aktifOzellikItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  aktifOzellikIkon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  aktifOzellikText: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  devamBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.gold, borderRadius: Radius.xl,
    paddingVertical: 16, paddingHorizontal: Spacing.xl, alignSelf: 'stretch',
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  devamBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold, color: '#fff' },
});
