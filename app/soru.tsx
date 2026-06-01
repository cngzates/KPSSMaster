
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, Vibration, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { KATEGORILER } from '@/constants/data';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';
import { aiSoruUret, MiniSoruData, userStatsGuncelle } from '@/services/learningService';

const SIKLAR_LABELS = ['A', 'B', 'C', 'D', 'E'];
const XP_DOGRU = 10;
const XP_TAMAMLAMA = 50;

// Zorluk belirle: kullanıcının o kategorideki başarı oranına göre
function zorluğuBelirle(basariYuzdesi: number): 'Kolay' | 'Orta' | 'Zor' {
  if (basariYuzdesi >= 75) return 'Zor';
  if (basariYuzdesi >= 50) return 'Orta';
  return 'Kolay';
}

// Konfeti biti
function KonfetiBit({ index, visible }: { index: number; visible: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  const rotAnim = useRef(new Animated.Value(0)).current;
  const renkler = [Colors.gold, Colors.success, Colors.primary, '#F72585', Colors.warning];
  const renk = renkler[index % renkler.length];
  const left = 15 + (index * 11) % 70;

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

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -70] });
  const opacity = anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] });
  const rotate = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${200 + index * 45}deg`] });

  if (!visible) return null;
  return (
    <Animated.View style={[
      styles.konfetiBit,
      { left: `${left}%`, backgroundColor: renk, opacity, transform: [{ translateY }, { rotate }] }
    ]} />
  );
}

// Soru arayüzü (AI + mock uyumlu)
interface SoruAI extends MiniSoruData {
  kategori?: string;
  ders?: string;
  konu?: string;
  zorluk: 'Kolay' | 'Orta' | 'Zor';
  kazanim?: string;
}

// ─── Paylaş Butonu ──────────────────────────────────────────────────────────
function PaylasBtnu({ sorular, userId }: { sorular: SoruAI[]; userId: string }) {
  const [paylasiliyor, setPaylasiliyor] = useState(false);
  const [paylasildi, setPaylasildi] = useState(false);

  const handlePaylas = async () => {
    if (paylasiliyor || paylasildi) return;
    setPaylasiliyor(true);
    try {
      const supabase = getSupabaseClient();
      const paylasilacaklar = sorular.slice(0, 3).map(s => ({
        user_id: userId,
        soru_metni: s.soru,
        siklar: s.siklar,
        dogru_cevap: s.dogru_cevap,
        aciklama: s.aciklama,
        ders: s.ders || '',
        kategori: s.kategori || '',
        zorluk: s.zorluk || 'Orta',
        kazanim: s.kazanim || '',
      }));
      await supabase.from('paylasilan_sorular').insert(paylasilacaklar);
      setPaylasildi(true);
    } catch (e) {
      console.error('Paylaşım hatası:', e);
    } finally {
      setPaylasiliyor(false);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [payBtn.btn, paylasildi && payBtn.paylasildi, pressed && { opacity: 0.85 }]}
      onPress={handlePaylas}
      disabled={paylasiliyor || paylasildi}
    >
      {paylasiliyor
        ? <ActivityIndicator size="small" color={Colors.primary} />
        : <MaterialIcons name={paylasildi ? 'check-circle' : 'share'} size={18} color={paylasildi ? Colors.success : Colors.primary} />}
      <Text style={[payBtn.btnText, paylasildi && { color: Colors.success }]}>
        {paylasildi ? 'Keşfet sekmesine eklendi!' : 'Bu soruları Keşfet\'e paylaş'}
      </Text>
    </Pressable>
  );
}

const payBtn = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.primary + '50', borderRadius: Radius.lg,
    paddingVertical: 12, paddingHorizontal: Spacing.md, marginTop: Spacing.sm,
    backgroundColor: Colors.primary + '10',
  },
  paylasildi: { borderColor: Colors.success + '50', backgroundColor: Colors.success + '10' },
  btnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary },
});

export default function SoruEkrani() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    kategoriId?: string;
    konuId?: string;
    konuAd?: string;
    mod?: string;
    zayifKategoriIds?: string;
    zayifKategoriAdlar?: string;
  }>();
  const { soruCevapla } = useApp();
  const { user } = useAuth();

  const [sorular, setSorular] = useState<SoruAI[]>([]);
  const [aktifIndex, setAktifIndex] = useState(0);
  const [secilenSik, setSecilenSik] = useState<string | null>(null);
  const [cevaplandi, setCevaplandi] = useState(false);
  const [testBitti, setTestBitti] = useState(false);
  const [dogruSayisi, setDogruSayisi] = useState(0);
  const [seriSayisi, setSeriSayisi] = useState(0);
  const [konfeti, setKonfeti] = useState(false);
  const [kazanilanXP, setKazanilanXP] = useState(0);

  // Yükleme durumu
  const [yukleniyorDurum, setYukleniyorDurum] = useState<'hazirlik' | 'yukleniyor' | 'hazir' | 'hata'>('hazirlik');
  const [hataMetni, setHataMetni] = useState('');

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;

  // Başarı oranını Supabase'den çek
  const getKategoriBasariYuzdesi = useCallback(async (kategoriId: string): Promise<number> => {
    if (!user) {
      // Kullanıcı giriş yapmamışsa constants/data'daki mock değeri kullan
      const kat = KATEGORILER.find(k => k.id === kategoriId);
      return kat?.basariYuzdesi ?? 50;
    }
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('soru_gecmisi')
        .select('dogru')
        .eq('user_id', user.id)
        .eq('kategori', kategoriId);
      if (!data || data.length < 5) {
        // Yetersiz veri → orta zorluk
        return 50;
      }
      const dogru = data.filter(r => r.dogru).length;
      return Math.round((dogru / data.length) * 100);
    } catch {
      return 50;
    }
  }, [user]);

  // AI'dan soruları yükle
  const soruYukle = useCallback(async () => {
    setYukleniyorDurum('yukleniyor');
    setSorular([]);
    setAktifIndex(0);
    setSecilenSik(null);
    setCevaplandi(false);
    setTestBitti(false);
    setDogruSayisi(0);
    setSeriSayisi(0);
    setKazanilanXP(0);

    const isKisiselMod = params.mod === 'kisisel';
    const kategoriId = params.kategoriId || 'turkce';
    const kategori = KATEGORILER.find(k => k.id === kategoriId);

    // Kişisel mod: zayif kategori listesinden karma soru üret
    if (isKisiselMod && params.zayifKategoriIds) {
      const zayifIds = params.zayifKategoriIds.split(',').filter(Boolean);
      const zayifAdlar = params.zayifKategoriAdlar || zayifIds.join(', ');

      // Her kategori için soru dağılımı: 10 soruyu böl
      const soruPerKat = Math.ceil(10 / zayifIds.length);

      try {
        const tumSorularArr = await Promise.all(
          zayifIds.map(async (katId) => {
            const kat = KATEGORILER.find(k => k.id === katId);
            if (!kat) return [];
            const konu = kat.konular.slice().sort((a, b) => a.basariYuzdesi - b.basariYuzdesi)[0];
            const basariYuzdesi = await getKategoriBasariYuzdesi(katId);
            const zorluk = zorluğuBelirle(basariYuzdesi);
            const katSorular = await aiSoruUret({
              konu: konu?.ad ?? kat.ad,
              ders: kat.ders,
              kategori: kat.ad,
              zorluk,
              soru_sayisi: soruPerKat,
              kullanici_zayiflari: zayifAdlar,
            });
            return katSorular.map((s, i) => ({
              ...s,
              id: s.id || `kisisel_${katId}_${Date.now()}_${i}`,
              kategori: katId,
              ders: kat.ders,
              konu: konu?.ad ?? kat.ad,
              zorluk: (s.zorluk as 'Kolay' | 'Orta' | 'Zor') || zorluk,
            }));
          })
        );

        const tumSorular = tumSorularArr.flat().slice(0, 10);

        if (tumSorular.length === 0) {
          setHataMetni('AI su an soru uretemedi. Lutfen tekrar dene.');
          setYukleniyorDurum('hata');
          return;
        }

        // Karıştır
        const karisik = tumSorular.sort(() => Math.random() - 0.5);
        setSorular(karisik as SoruAI[]);
        setYukleniyorDurum('hazir');
        Animated.timing(progressAnim, {
          toValue: (1 / karisik.length) * 100,
          duration: 400,
          useNativeDriver: false,
        }).start();
        return;
      } catch (e) {
        console.error('Kisisel test hatasi:', e);
        setHataMetni('Baglanti hatasi. Internet baglantini kontrol et.');
        setYukleniyorDurum('hata');
        return;
      }
    }

    // Normal mod
    let konuAd = params.konuAd || '';
    let ders = kategori?.ders || 'Genel Yetenek';

    if (!konuAd) {
      const konular = kategori?.konular || [];
      const rastgeleKonu = konular[Math.floor(Math.random() * konular.length)];
      konuAd = rastgeleKonu?.ad || kategori?.ad || 'Genel';
    }

    const basariYuzdesi = await getKategoriBasariYuzdesiLocal(kategoriId);
    const zorluk = zorluğuBelirle(basariYuzdesi);

    try {
      const aiSorular = await aiSoruUret({
        konu: konuAd,
        ders,
        kategori: kategori?.ad,
        zorluk,
        soru_sayisi: 10,
      });

      if (!aiSorular || aiSorular.length === 0) {
        setHataMetni('AI şu an soru üretemedi. Lütfen tekrar dene.');
        setYukleniyorDurum('hata');
        return;
      }

      const sonSorular: SoruAI[] = aiSorular.map((s, i) => ({
        ...s,
        id: s.id || `ai_${Date.now()}_${i}`,
        kategori: kategoriId,
        ders,
        konu: konuAd,
        zorluk: (s.zorluk as 'Kolay' | 'Orta' | 'Zor') || zorluk,
      }));

      setSorular(sonSorular);
      setYukleniyorDurum('hazir');

      // Progress başlat
      Animated.timing(progressAnim, {
        toValue: (1 / sonSorular.length) * 100,
        duration: 400,
        useNativeDriver: false,
      }).start();
    } catch (e) {
      console.error('Soru yükleme hatası:', e);
      setHataMetni('Bağlantı hatası. İnternet bağlantını kontrol et.');
      setYukleniyorDurum('hata');
    }
  }, [params.kategoriId, params.konuAd, params.konuId, params.mod, params.zayifKategoriIds, getKategoriBasariYuzdesi]);

  // Lokal başarı yüzdesi (sync)
  const getKategoriBasariYuzdesiLocal = useCallback(async (kategoriId: string): Promise<number> => {
    return getKategoriBasariYuzdesi(kategoriId);
  }, [getKategoriBasariYuzdesi]);

  useEffect(() => {
    soruYukle();
  }, [soruYukle]);

  useEffect(() => {
    if (sorular.length > 0 && aktifIndex > 0) {
      Animated.timing(progressAnim, {
        toValue: ((aktifIndex + 1) / sorular.length) * 100,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }
  }, [aktifIndex, sorular.length, progressAnim]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 7, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const triggerXPAnim = (xp: number) => {
    setKazanilanXP(xp);
    xpOpacity.setValue(1);
    xpAnim.setValue(0);
    Animated.parallel([
      Animated.timing(xpAnim, { toValue: -40, duration: 800, useNativeDriver: true }),
      Animated.timing(xpOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  };

  const handleSikSec = (label: string) => {
    if (cevaplandi) return;
    setSecilenSik(label);
  };

  const handleCevapla = async () => {
    if (!secilenSik || cevaplandi || sorular.length === 0) return;
    const mevcutSoru = sorular[aktifIndex];

    // Doğru cevabı normalize et (bazı AI çıktıları "A)" şeklinde verebilir)
    const normalize = (s: string) => s.replace(/[^A-E]/g, '').trim().toUpperCase();
    const dogru = normalize(secilenSik) === normalize(mevcutSoru.dogru_cevap);

    setCevaplandi(true);

    if (dogru) {
      const yeniSeri = seriSayisi + 1;
      setSeriSayisi(yeniSeri);
      setDogruSayisi(prev => prev + 1);
      setKonfeti(true);
      setTimeout(() => setKonfeti(false), 900);
      triggerXPAnim(XP_DOGRU);
    } else {
      setSeriSayisi(0);
      Vibration.vibrate(300);
      triggerShake();
    }

    soruCevapla({
      soruId: mevcutSoru.id,
      dogru,
      secilen: secilenSik,
    });

    // Supabase'e kaydet
    if (user) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('soru_gecmisi').insert({
          user_id: user.id,
          soru_id: mevcutSoru.id,
          dogru,
          secilen_sik: secilenSik,
          kategori: mevcutSoru.kategori || params.kategoriId || 'genel',
          ders: mevcutSoru.ders || '',
        });
      } catch (e) {
        console.error('soru_gecmisi kayıt hatası:', e);
      }
    }
  };

  const handleSonraki = () => {
    if (aktifIndex >= sorular.length - 1) {
      // Test bitti → XP güncelle
      if (user) {
        const toplamXP = dogruSayisi * XP_DOGRU + XP_TAMAMLAMA;
        userStatsGuncelle(user.id, toplamXP).catch(() => {});
      }
      setTestBitti(true);
      return;
    }
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setAktifIndex(prev => prev + 1);
      setSecilenSik(null);
      setCevaplandi(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const getSikBorderColor = (label: string) => {
    if (!cevaplandi) return secilenSik === label ? Colors.primary : Colors.borderLight;
    const mevcutSoru = sorular[aktifIndex];
    const normalize = (s: string) => s.replace(/[^A-E]/g, '').trim().toUpperCase();
    if (normalize(label) === normalize(mevcutSoru.dogru_cevap)) return Colors.success;
    if (secilenSik === label) return Colors.error;
    return Colors.borderLight;
  };

  const getSikBg = (label: string) => {
    if (!cevaplandi) return secilenSik === label ? Colors.primary + '25' : Colors.bgCardAlt;
    const mevcutSoru = sorular[aktifIndex];
    const normalize = (s: string) => s.replace(/[^A-E]/g, '').trim().toUpperCase();
    if (normalize(label) === normalize(mevcutSoru.dogru_cevap)) return Colors.success + '20';
    if (secilenSik === label) return Colors.error + '20';
    return Colors.bgCardAlt;
  };

  const getSikLabelBg = (label: string) => {
    if (!cevaplandi) return secilenSik === label ? Colors.primary : Colors.bgSurface;
    const mevcutSoru = sorular[aktifIndex];
    const normalize = (s: string) => s.replace(/[^A-E]/g, '').trim().toUpperCase();
    if (normalize(label) === normalize(mevcutSoru.dogru_cevap)) return Colors.success;
    if (secilenSik === label) return Colors.error;
    return Colors.bgSurface;
  };

  const isSoluk = (label: string) => {
    if (!cevaplandi) return false;
    const mevcutSoru = sorular[aktifIndex];
    const normalize = (s: string) => s.replace(/[^A-E]/g, '').trim().toUpperCase();
    return normalize(label) !== normalize(mevcutSoru.dogru_cevap) && secilenSik !== label;
  };

  // ─── YÜKLEME EKRANI ───────────────────────────────────────────
  if (yukleniyorDurum === 'yukleniyor' || yukleniyorDurum === 'hazirlik') {
    const isKisisel = params.mod === 'kisisel';
    const kategori = KATEGORILER.find(k => k.id === params.kategoriId);
    const zayifAdlar = params.zayifKategoriAdlar;
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.yukleniyorEkrani}>
          <View style={styles.yukleniyorIkon}>
            <MaterialIcons name={isKisisel ? 'person-pin' : 'auto-awesome'} size={40} color={Colors.primary} />
          </View>
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: Spacing.md }} />
          <Text style={styles.yukleniyorBaslik}>
            {isKisisel ? 'Kisisel Test Olusturuluyor...' : 'AI Soru Uretiyor...'}
          </Text>
          <Text style={styles.yukleniyorAlt}>
            {isKisisel && zayifAdlar
              ? `Zayif alanlarin: ${zayifAdlar} icin 10 soru hazirlaniyor`
              : `${kategori?.ad ?? 'KPSS'} konusunda kisisellestirilmis sorular hazirlaniyor`}
          </Text>
          <View style={styles.yukleniyorBilgi}>
            <View style={styles.yukleniyorAdim}>
              <MaterialIcons name="psychology" size={16} color={Colors.gold} />
              <Text style={styles.yukleniyorAdimText}>
                {isKisisel ? 'Zayif kategoriler tespit edildi' : 'Basari analiz ediliyor'}
              </Text>
            </View>
            <View style={styles.yukleniyorAdim}>
              <MaterialIcons name="tune" size={16} color={Colors.primary} />
              <Text style={styles.yukleniyorAdimText}>Zorluk seviyesi ayarlaniyor</Text>
            </View>
            <View style={styles.yukleniyorAdim}>
              <MaterialIcons name="quiz" size={16} color={Colors.success} />
              <Text style={styles.yukleniyorAdimText}>
                {isKisisel ? 'Karma kategorili 10 soru uretiliyor' : 'KPSS sorulari uretiliyor'}
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── HATA EKRANI ──────────────────────────────────────────────
  if (yukleniyorDurum === 'hata') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.hataEkrani}>
          <MaterialIcons name="error-outline" size={56} color={Colors.error} />
          <Text style={styles.hataBaslik}>Soru Üretilemedi</Text>
          <Text style={styles.hataAciklama}>{hataMetni}</Text>
          <Pressable
            style={({ pressed }) => [styles.tekrarBtn, pressed && { opacity: 0.85 }]}
            onPress={soruYukle}
          >
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.tekrarBtnText}>Tekrar Dene</Text>
          </Pressable>
          <Pressable style={styles.geriLink} onPress={() => router.back()}>
            <Text style={styles.geriLinkText}>Geri Dön</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── SONUÇ EKRANI ─────────────────────────────────────────────
  if (testBitti) {
    const basariYuzdesi = Math.round((dogruSayisi / sorular.length) * 100);
    const toplamXP = dogruSayisi * XP_DOGRU + XP_TAMAMLAMA;

    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.sonucEkrani}>
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

          {/* XP Kazanç */}
          <View style={styles.xpKazanim}>
            <MaterialIcons name="stars" size={22} color={Colors.gold} />
            <Text style={styles.xpKazanimText}>+{toplamXP} XP kazandın!</Text>
          </View>

          {/* Kişisel Test Özeti */}
          {params.mod === 'kisisel' && params.zayifKategoriAdlar ? (
            <View style={styles.kisiselTestBilgi}>
              <MaterialIcons name="person-pin" size={14} color={Colors.primary} />
              <Text style={styles.kisiselTestText}>
                Zayif alanlarin: {params.zayifKategoriAdlar}
              </Text>
            </View>
          ) : null}

          {/* Zorluk bilgisi */}
          <View style={styles.zorluKBilgi}>
            <MaterialIcons name="tune" size={14} color={Colors.textMuted} />
            <Text style={styles.zorluKBilgiText}>
              {sorular[0]?.zorluk ?? 'Orta'} seviyede AI tarafından üretildi
            </Text>
          </View>

          {/* Soruları Paylaş */}
          {user && sorular.length > 0 && (
            <PaylasBtnu sorular={sorular} userId={user.id} />
          )}

          <View style={styles.aiGeriBildirim}>
            <View style={styles.aiHeader}>
              <MaterialIcons name="smart-toy" size={18} color={Colors.primary} />
              <Text style={styles.aiBaslik}>AI Koç Değerlendirmesi</Text>
            </View>
            <Text style={styles.aiMetin}>
              {basariYuzdesi >= 70
                ? 'Harika performans! Zorluk seviyeni bir adım artırıyorum. Bir sonraki testte daha zorlu sorularla karşılaşacaksın.'
                : basariYuzdesi >= 50
                ? 'Gelişiyorsun! Yanlış yaptığın sorulara tekrar bak. Aynı zorluk seviyesinde birkaç test daha çözelim.'
                : 'Temel konuları pekiştirmek için daha kolay sorularla başlayalım. Kolay modda pratik yapmaya devam et.'}
            </Text>
          </View>

          <View style={styles.sonucBtnRow}>
            <Pressable
              style={({ pressed }) => [styles.tekrarBtn, { flex: 1 }, pressed && { opacity: 0.85 }]}
              onPress={soruYukle}
            >
              <MaterialIcons name="replay" size={18} color="#fff" />
              <Text style={styles.tekrarBtnText}>Yeni Test</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.anaSayfaBtn, pressed && { opacity: 0.85 }]}
              onPress={() => router.back()}
            >
              <Text style={styles.anaSayfaBtnText}>Geri Dön</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── SORU EKRANI ──────────────────────────────────────────────
  const mevcutSoru = sorular[aktifIndex];
  if (!mevcutSoru) return null;

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
          <View style={[styles.zorlukBadge, {
            backgroundColor:
              mevcutSoru.zorluk === 'Kolay' ? Colors.success + '20' :
              mevcutSoru.zorluk === 'Zor' ? Colors.error + '20' :
              Colors.primary + '20',
          }]}>
            <Text style={[styles.zorlukText, {
              color:
                mevcutSoru.zorluk === 'Kolay' ? Colors.success :
                mevcutSoru.zorluk === 'Zor' ? Colors.error :
                Colors.primary,
            }]}>
              {mevcutSoru.zorluk}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBg}>
        <Animated.View style={[styles.progressFill, {
          width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }]} />
      </View>

      {/* AI Badge */}
      <View style={styles.aiBadge}>
        <MaterialIcons name="auto-awesome" size={11} color={Colors.primary} />
        <Text style={styles.aiBadgeText}>AI Tarafından Üretildi</Text>
      </View>

      {/* Konfeti overlay */}
      <View style={styles.konfettiContainer} pointerEvents="none">
        {konfeti && Array.from({ length: 9 }).map((_, i) => (
          <KonfetiBit key={i} index={i} visible={konfeti} />
        ))}
      </View>

      {/* XP Float */}
      <Animated.View
        style={[styles.xpFloat, { opacity: xpOpacity, transform: [{ translateY: xpAnim }] }]}
        pointerEvents="none"
      >
        <Text style={styles.xpFloatText}>+{XP_DOGRU} XP</Text>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.soruContent}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Konu Chip */}
          <View style={styles.konuChip}>
            <Text style={styles.konuText}>
              {mevcutSoru.ders || params.kategoriId} • {mevcutSoru.konu || params.konuAd || 'KPSS'}
            </Text>
          </View>

          {/* Soru Metni */}
          <Animated.View style={[styles.soruKart, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.soruMetni}>{mevcutSoru.soru}</Text>
          </Animated.View>

          {/* Şıklar */}
          <View style={styles.siklar}>
            {mevcutSoru.siklar.map((sik, index) => {
              const label = SIKLAR_LABELS[index];
              const borderColor = getSikBorderColor(label);
              const bgColor = getSikBg(label);
              const labelBg = getSikLabelBg(label);
              const soluk = isSoluk(label);

              return (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.sik,
                    { borderColor, backgroundColor: bgColor, opacity: soluk ? 0.38 : 1 },
                    !cevaplandi && pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                  ]}
                  onPress={() => handleSikSec(label)}
                >
                  <View style={[styles.sikLabel, { backgroundColor: labelBg, borderColor }]}>
                    <Text style={styles.sikLabelText}>{label}</Text>
                  </View>
                  <Text style={styles.sikMetni}>{sik.replace(/^[A-E]\) /, '')}</Text>
                  {cevaplandi && (() => {
                    const normalize = (s: string) => s.replace(/[^A-E]/g, '').trim().toUpperCase();
                    if (normalize(label) === normalize(mevcutSoru.dogru_cevap)) {
                      return <MaterialIcons name="check-circle" size={20} color={Colors.success} />;
                    }
                    if (secilenSik === label) {
                      return <MaterialIcons name="cancel" size={20} color={Colors.error} />;
                    }
                    return null;
                  })()}
                </Pressable>
              );
            })}
          </View>

          {/* Açıklama */}
          {cevaplandi && mevcutSoru.kazanim ? (
            <View style={styles.kazanimChip}>
              <MaterialIcons name="school" size={12} color={Colors.gold} />
              <Text style={styles.kazanimText} numberOfLines={2}>{mevcutSoru.kazanim}</Text>
            </View>
          ) : null}

          {cevaplandi && (
            <View style={[styles.aciklamaKart, {
              borderColor: (() => {
                const normalize = (s: string) => s.replace(/[^A-E]/g, '').trim().toUpperCase();
                return normalize(secilenSik ?? '') === normalize(mevcutSoru.dogru_cevap)
                  ? Colors.success + '40'
                  : Colors.error + '40';
              })(),
              backgroundColor: (() => {
                const normalize = (s: string) => s.replace(/[^A-E]/g, '').trim().toUpperCase();
                return normalize(secilenSik ?? '') === normalize(mevcutSoru.dogru_cevap)
                  ? Colors.success + '10'
                  : Colors.error + '10';
              })(),
            }]}>
              <View style={styles.aciklamaHeader}>
                <MaterialIcons name="smart-toy" size={18} color={Colors.primary} />
                <Text style={styles.aciklamaBaslik}>AI Açıklaması</Text>
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

  // Yükleniyor
  yukleniyorEkrani: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  yukleniyorIkon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primary + '40', marginBottom: Spacing.md,
  },
  yukleniyorBaslik: {
    fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary,
    textAlign: 'center', marginBottom: Spacing.xs,
  },
  yukleniyorAlt: {
    fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 20, marginBottom: Spacing.lg,
  },
  yukleniyorBilgi: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm, alignSelf: 'stretch',
  },
  yukleniyorAdim: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  yukleniyorAdimText: { fontSize: FontSize.sm, color: Colors.textSecondary },

  // Hata
  hataEkrani: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg, gap: Spacing.md,
  },
  hataBaslik: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  hataAciklama: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  geriLink: { paddingVertical: 12 },
  geriLinkText: { fontSize: FontSize.sm, color: Colors.textSecondary },

  // Soru Header
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
  zorlukBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  zorlukText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  // Progress
  progressBg: {
    height: 5, backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.md, borderRadius: Radius.full, overflow: 'hidden', marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.full },

  // AI Badge
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'center', marginBottom: Spacing.sm,
    backgroundColor: Colors.primary + '12', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.primary + '25',
  },
  aiBadgeText: { fontSize: 10, color: Colors.primary, fontWeight: FontWeight.semibold },

  // Konfeti
  konfettiContainer: { position: 'absolute', top: 75, left: 0, right: 0, height: 90, zIndex: 100 },
  konfetiBit: { position: 'absolute', width: 9, height: 9, borderRadius: 2 },

  // XP Float
  xpFloat: {
    position: 'absolute', top: 120, alignSelf: 'center', zIndex: 200,
    backgroundColor: Colors.gold + '20', borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.gold + '50',
  },
  xpFloatText: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold, color: Colors.gold },

  // İçerik
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
    borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: Spacing.md,
    gap: Spacing.sm, borderWidth: 1.5,
  },
  sikLabel: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  sikLabelText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sikMetni: { flex: 1, fontSize: FontSize.base, color: Colors.textPrimary, lineHeight: 22, fontWeight: FontWeight.medium },

  // Açıklama
  kazanimChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.gold + '15', borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.gold + '30',
  },
  kazanimText: {
    fontSize: 10, color: Colors.gold, fontWeight: FontWeight.semibold, flex: 1,
  },
  aciklamaKart: {
    borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '30',
  },
  aciklamaHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  aciklamaBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary, flex: 1 },
  aciklamaMetin: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22 },

  // Alt buton
  altBtn: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.md, backgroundColor: Colors.bg,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  cevapla: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' },
  cevaplaDisabled: { backgroundColor: Colors.bgCardAlt, borderWidth: 1, borderColor: Colors.borderLight },
  cevaplaText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  cevaplaTextDisabled: { color: Colors.textMuted },

  // Sonuç
  sonucEkrani: {
    alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl, paddingBottom: Spacing.xl,
  },
  sonucEmoji: { fontSize: 68, marginBottom: Spacing.md },
  sonucBaslik: { fontSize: FontSize.hero, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, marginBottom: Spacing.lg },
  sonucKart: {
    flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.md, width: '100%', borderWidth: 1, borderColor: Colors.border,
  },
  sonucItem: { flex: 1, alignItems: 'center' },
  sonucAyrac: { width: 1, backgroundColor: Colors.border },
  sonucSayi: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, marginBottom: 4 },
  sonucLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  xpKazanim: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.gold + '15', borderRadius: Radius.full,
    paddingHorizontal: 16, paddingVertical: 8, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.gold + '40',
  },
  xpKazanimText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  kisiselTestBilgi: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary + '12', borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 6, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  kisiselTestText: { fontSize: FontSize.xs, color: Colors.primary, flex: 1, fontWeight: FontWeight.medium },
  zorluKBilgi: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: Spacing.md,
  },
  zorluKBilgiText: { fontSize: FontSize.xs, color: Colors.textMuted },
  aiGeriBildirim: {
    backgroundColor: Colors.primary + '15', borderRadius: Radius.lg, padding: Spacing.md,
    width: '100%', marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '30',
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  aiBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  aiMetin: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22 },
  sonucBtnRow: { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
  tekrarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14,
    paddingHorizontal: Spacing.xl, gap: Spacing.sm,
  },
  tekrarBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  anaSayfaBtn: {
    paddingVertical: 14, paddingHorizontal: Spacing.lg, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg,
  },
  anaSayfaBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
