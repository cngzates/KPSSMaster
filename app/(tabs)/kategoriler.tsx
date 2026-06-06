import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, FlatList,
  ActivityIndicator, Modal, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { KATEGORILER, Kategori } from '@/constants/data';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';

// ─── KPSS Konu Dağılımı ────────────────────────────────────────────────────
interface KonuItem {
  id: string;
  ad: string;
  emoji: string;
}

interface DersKonular {
  dersId: string;
  dersAd: string;
  emoji: string;
  renk: string;
  konular: KonuItem[];
}

const DERS_KONULARI: DersKonular[] = [
  {
    dersId: 'turkce',
    dersAd: 'Türkçe',
    emoji: '📖',
    renk: '#4CC9F0',
    konular: [
      { id: 'sozcukte_anlam', ad: 'Sözcükte Anlam', emoji: '💬' },
      { id: 'cumlenin_anlam', ad: 'Cümlenin Anlam', emoji: '📝' },
      { id: 'sozcuk_turleri', ad: 'Sözcük Türleri', emoji: '🔤' },
      { id: 'sozcukte_yapi', ad: 'Sözcükte Yapı', emoji: '🧱' },
      { id: 'cumlenin_ogeleri', ad: 'Cümlenin Ögeleri', emoji: '🔗' },
      { id: 'ses_olaylari', ad: 'Ses Olayları', emoji: '🔊' },
      { id: 'yazim_kurallari', ad: 'Yazım Kuralları', emoji: '✏️' },
      { id: 'noktalama_isaretleri', ad: 'Noktalama İşaretleri', emoji: '⁉️' },
      { id: 'paragrafta_anlam', ad: 'Paragrafta Anlam', emoji: '📄' },
      { id: 'paragrafta_anlatim', ad: 'Paragrafta Anlatım Yolları ve Biçimleri', emoji: '🗣️' },
      { id: 'sozel_mantik', ad: 'Sözel Mantık', emoji: '🧩' },
    ],
  },
  {
    dersId: 'matematik',
    dersAd: 'Matematik',
    emoji: '📐',
    renk: '#7B2FBE',
    konular: [
      { id: 'temel_kavramlar', ad: 'Temel Kavramlar', emoji: '🔢' },
      { id: 'rasyonel_sayilar', ad: 'Rasyonel Sayılar', emoji: '➗' },
      { id: 'ondalik_sayilar', ad: 'Ondalık Sayılar', emoji: '🔣' },
      { id: 'basit_esitsizlikler', ad: 'Basit Eşitsizlikler', emoji: '⚖️' },
      { id: 'mutlak_deger', ad: 'Mutlak Değer', emoji: '📊' },
      { id: 'uslu_sayilar', ad: 'Üslü Sayılar', emoji: '🔺' },
      { id: 'koklu_sayilar', ad: 'Köklü Sayılar', emoji: '√' },
      { id: 'carpanlara_ayirma', ad: 'Çarpanlara Ayırma', emoji: '✂️' },
      { id: 'denklem_cozme', ad: 'Denklem Çözme', emoji: '🟰' },
      { id: 'sayi_problemleri', ad: 'Sayı Problemleri', emoji: '🧮' },
      { id: 'yas_problemleri', ad: 'Yaş Problemleri', emoji: '👤' },
      { id: 'hareket_problemleri', ad: 'Hareket Problemleri', emoji: '🚗' },
      { id: 'yuzde_kar_zarar', ad: 'Yüzde, Kar-Zarar ve Faiz Problemleri', emoji: '💰' },
      { id: 'baginti_fonksiyon', ad: 'Bağıntı ve Fonksiyon', emoji: '📈' },
      { id: 'islem', ad: 'İşlem', emoji: '➕' },
      { id: 'olasilik', ad: 'Olasılık', emoji: '🎲' },
      { id: 'sayisal_mantik', ad: 'Sayısal Mantık', emoji: '🧠' },
    ],
  },
  {
    dersId: 'geometri',
    dersAd: 'Geometri',
    emoji: '📐',
    renk: '#06D6A0',
    konular: [
      { id: 'ozel_ucgenler', ad: 'Özel Üçgenler', emoji: '🔺' },
      { id: 'dortgenler', ad: 'Dörtgenler', emoji: '🔷' },
      { id: 'cokgenler', ad: 'Çokgenler', emoji: '🔶' },
      { id: 'analitik_geometri', ad: 'Analitik Geometri', emoji: '📍' },
    ],
  },
  {
    dersId: 'tarih',
    dersAd: 'Tarih',
    emoji: '🏛️',
    renk: '#E76F51',
    konular: [
      { id: 'islam_oncesi_turk', ad: "İslamiyet'ten Önceki Türk Devletleri", emoji: '🐺' },
      { id: 'ilk_musluman_turk', ad: 'İlk Müslüman Türk Devletleri', emoji: '☪️' },
      { id: 'osmanli_siyasi', ad: 'Osmanlı Devleti Siyasi', emoji: '🏰' },
      { id: 'osmanli_kultur', ad: 'Osmanlı Devleti Kültür ve Uygarlık', emoji: '🎨' },
      { id: 'kurtulus_hazirlik', ad: 'Kurtuluş Savaşı Hazırlık Dönemi', emoji: '⚔️' },
      { id: 'kurtulus_cepheler', ad: 'Kurtuluş Savaşı Cepheleri', emoji: '🗺️' },
      { id: 'devrim_tarihi', ad: 'Devrim Tarihi', emoji: '🏅' },
      { id: 'ataturk_ic_dis', ad: 'Atatürk Dönemi İç ve Dış Politika', emoji: '🕊️' },
      { id: 'ataturk_ilkeleri', ad: 'Atatürk İlkeleri', emoji: '⭐' },
      { id: 'cagdas_tarih', ad: 'Çağdaş Türk ve Dünya Tarihi', emoji: '🌍' },
    ],
  },
  {
    dersId: 'cografya',
    dersAd: 'Coğrafya',
    emoji: '🌍',
    renk: '#2DC653',
    konular: [
      { id: 'turkiye_konum', ad: 'Türkiye Coğrafi Konumu', emoji: '📍' },
      { id: 'yer_sekilleri', ad: "Türkiye'nin Yer Şekilleri ve Su Örtüsü", emoji: '⛰️' },
      { id: 'iklim_bitki', ad: "Türkiye'nin İklimi ve Bitki Örtüsü", emoji: '🌤️' },
      { id: 'toprak_cevre', ad: 'Toprak ve Doğal Çevre', emoji: '🌱' },
      { id: 'beseri_cografya', ad: "Türkiye'nin Beşeri Coğrafyası", emoji: '👥' },
      { id: 'tarim', ad: 'Tarım', emoji: '🌾' },
      { id: 'madenler_enerji', ad: 'Madenler ve Enerji Kaynakları', emoji: '⛏️' },
      { id: 'sanayi', ad: 'Sanayi', emoji: '🏭' },
      { id: 'ulasim', ad: 'Ulaşım', emoji: '🚆' },
      { id: 'turizm', ad: 'Turizm', emoji: '✈️' },
    ],
  },
  {
    dersId: 'vatandaslik',
    dersAd: 'Vatandaşlık',
    emoji: '⚖️',
    renk: '#F4A261',
    konular: [
      { id: 'hukuka_giris', ad: 'Hukuka Giriş', emoji: '📚' },
      { id: 'genel_esaslar', ad: 'Genel Esaslar', emoji: '📋' },
      { id: 'yasama', ad: 'Yasama', emoji: '🏛️' },
      { id: 'yurутme', ad: 'Yürütme', emoji: '🏢' },
      { id: 'idari_yapi', ad: 'İdari Yapı', emoji: '🗂️' },
      { id: 'guncel_olaylar', ad: 'Güncel Olaylar', emoji: '📰' },
    ],
  },
];

// ─── Kategori istatistikleri ─────────────────────────────────────────────────
interface KategoriStat {
  basariYuzdesi: number;
  cozulenSoru: number;
  dogru: number;
  yanlis: number;
}

interface ZenginKategori extends Kategori {
  gercekStat?: KategoriStat;
}

function getKategoriEtiket(
  kategori: ZenginKategori,
  tumKategoriler: ZenginKategori[]
): { label: string; emoji: string; renk: string } | null {
  const basari = kategori.gercekStat?.basariYuzdesi ?? kategori.basariYuzdesi;
  const gercekVerili = tumKategoriler.filter(k => (k.gercekStat?.cozulenSoru ?? 0) > 0);
  if (gercekVerili.length >= 2) {
    const sirali = [...gercekVerili].sort(
      (a, b) =>
        (a.gercekStat?.basariYuzdesi ?? a.basariYuzdesi) -
        (b.gercekStat?.basariYuzdesi ?? b.basariYuzdesi)
    );
    if (sirali[0].id === kategori.id || sirali[1]?.id === kategori.id)
      return { label: 'Sana önerilen', emoji: '🎯', renk: Colors.primary };
    const enCok = [...gercekVerili].sort(
      (a, b) => (b.gercekStat?.cozulenSoru ?? 0) - (a.gercekStat?.cozulenSoru ?? 0)
    )[0];
    if (enCok.id === kategori.id)
      return { label: 'En çok çalışılan', emoji: '🔥', renk: Colors.warning };
  } else {
    const sirali = [...tumKategoriler].sort((a, b) => a.basariYuzdesi - b.basariYuzdesi);
    if (sirali[0].id === kategori.id || sirali[1]?.id === kategori.id)
      return { label: 'Sana önerilen', emoji: '🎯', renk: Colors.primary };
  }
  if (basari >= 75 && (kategori.gercekStat?.cozulenSoru ?? 0) >= 5)
    return { label: 'Konu ustası', emoji: '👑', renk: Colors.gold };
  return null;
}

// ─── Konu Modalı ──────────────────────────────────────────────────────────────
function KonuModal({
  gorünür,
  ders,
  onKapat,
  onKonuSec,
  onKonuSoruCoz,
}: {
  gorünür: boolean;
  ders: DersKonular | null;
  onKapat: () => void;
  onKonuSec: (konu: KonuItem, ders: DersKonular) => void;
  onKonuSoruCoz: (konu: KonuItem, ders: DersKonular) => void;
}) {
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (gorünür) {
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, tension: 60, friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }).start();
    }
  }, [gorünür]);

  if (!ders) return null;

  return (
    <Modal visible={gorünür} transparent animationType="none" onRequestClose={onKapat}>
      <Pressable style={konuModalStyles.overlay} onPress={onKapat}>
        <Animated.View
          style={[konuModalStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <Pressable onPress={() => {}} style={{ flex: 1 }}>
            <View style={konuModalStyles.handle} />

            {/* Başlık */}
            <View style={konuModalStyles.header}>
              <View style={[konuModalStyles.dersIkon, { backgroundColor: ders.renk + '20' }]}>
                <Text style={konuModalStyles.dersEmoji}>{ders.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={konuModalStyles.baslik}>{ders.dersAd}</Text>
                <Text style={konuModalStyles.altBaslik}>{ders.konular.length} konu • AI ile öğren</Text>
              </View>
              <Pressable onPress={onKapat} hitSlop={12} style={konuModalStyles.kapatBtn}>
                <MaterialIcons name="close" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            {/* Bilgi Bandı */}
            <View style={konuModalStyles.bilgiBant}>
              <MaterialIcons name="auto-awesome" size={14} color={Colors.gold} />
              <Text style={konuModalStyles.bilgiText}>
                Bir konuya tıkla → AI sana detaylı anlatım yapsın, soru sorabilirsin
              </Text>
            </View>

            {/* Konu Listesi */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={konuModalStyles.liste}
            >
              {ders.konular.map((konu, i) => (
                <Pressable
                  key={konu.id}
                  style={({ pressed }) => [
                    konuModalStyles.konuItem,
                    i > 0 && konuModalStyles.konuItemBorder,
                    pressed && { backgroundColor: ders.renk + '10', opacity: 0.9 },
                  ]}
                  onPress={() => {}}
                >
                  <View style={[konuModalStyles.konuNo, { backgroundColor: ders.renk + '15', borderColor: ders.renk + '30' }]}>
                    <Text style={[konuModalStyles.konuNoText, { color: ders.renk }]}>{i + 1}</Text>
                  </View>
                  <Text style={konuModalStyles.konuEmoji}>{konu.emoji}</Text>
                  <Text style={konuModalStyles.konuAd}>{konu.ad}</Text>
                  <View style={konuModalStyles.konuAksiyonlar}>
                    <Pressable
                      style={[konuModalStyles.aiChip, { backgroundColor: ders.renk + '12', borderColor: ders.renk + '30' }]}
                      onPress={() => onKonuSec(konu, ders)}
                    >
                      <MaterialIcons name="auto-awesome" size={11} color={ders.renk} />
                      <Text style={[konuModalStyles.aiChipText, { color: ders.renk }]}>AI Anlat</Text>
                    </Pressable>
                    <Pressable
                      style={[konuModalStyles.soruChip, { backgroundColor: Colors.success + '12', borderColor: Colors.success + '30' }]}
                      onPress={() => onKonuSoruCoz(konu, ders)}
                    >
                      <MaterialIcons name="quiz" size={11} color={Colors.success} />
                      <Text style={[konuModalStyles.aiChipText, { color: Colors.success }]}>Soru Çöz</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const konuModalStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '88%', borderWidth: 1, borderColor: Colors.border,
    paddingBottom: 0,
  },
  handle: {
    width: 44, height: 5, backgroundColor: Colors.border + '80',
    borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dersIkon: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  dersEmoji: { fontSize: 24 },
  baslik: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  altBaslik: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  kapatBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.bgSurface, alignItems: 'center', justifyContent: 'center',
  },
  bilgiBant: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginHorizontal: Spacing.md, marginVertical: Spacing.sm,
    backgroundColor: Colors.gold + '10', borderRadius: Radius.lg,
    paddingHorizontal: Spacing.sm, paddingVertical: 9,
    borderWidth: 1, borderColor: Colors.gold + '25',
  },
  bilgiText: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1, lineHeight: 16 },
  liste: { paddingHorizontal: Spacing.md },
  konuItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 14,
  },
  konuItemBorder: { borderTopWidth: 1, borderTopColor: Colors.border + '70' },
  konuNo: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  konuNoText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  konuEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  konuAd: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary, lineHeight: 20 },
  konuAksiyonlar: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  aiChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1,
  },
  soruChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1,
  },
  aiChipText: { fontSize: 10, fontWeight: FontWeight.bold },
});

// ─── Ders Kartı ─────────────────────────────────────────────────────────────
function DersKarti({
  ders,
  onPress,
}: {
  ders: DersKonular;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [dersStyles.kart, pressed && dersStyles.pressed]}
      onPress={onPress}
    >
      <View style={[dersStyles.ikonWrap, { backgroundColor: ders.renk + '18', borderColor: ders.renk + '35' }]}>
        <Text style={dersStyles.emoji}>{ders.emoji}</Text>
      </View>
      <View style={dersStyles.bilgi}>
        <Text style={dersStyles.ad}>{ders.dersAd}</Text>
        <Text style={dersStyles.konuSayi}>{ders.konular.length} konu</Text>
      </View>
      <View style={[dersStyles.aiBtn, { backgroundColor: ders.renk + '15', borderColor: ders.renk + '30' }]}>
        <MaterialIcons name="auto-awesome" size={14} color={ders.renk} />
        <Text style={[dersStyles.aiBtnText, { color: ders.renk }]}>AI Anlat</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
    </Pressable>
  );
}

const dersStyles = StyleSheet.create({
  kart: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  ikonWrap: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  emoji: { fontSize: 24 },
  bilgi: { flex: 1 },
  ad: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  konuSayi: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1,
  },
  aiBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});

// ─── Tab Tipi ────────────────────────────────────────────────────────────────
type TabTip = 'Konu Anlatımı' | 'Soru Çöz';

export default function Kategoriler() {
  const router = useRouter();
  const { aktifKategoriSec } = useApp();
  const { user } = useAuth();

  const [aktifTab, setAktifTab] = useState<TabTip>('Konu Anlatımı');
  const [seciliDers, setSeciliDers] = useState<DersKonular | null>(null);
  const [modalAcik, setModalAcik] = useState(false);
  const [kategoriStatlar, setKategoriStatlar] = useState<Record<string, KategoriStat>>({});
  const [yukleniyor, setYukleniyor] = useState(false);

  // Gerçek istatistikleri yükle
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
    } catch {}
    finally { setYukleniyor(false); }
  }, [user]);

  useEffect(() => {
    gercekStatlariYukle();
  }, [gercekStatlariYukle]);

  const zenginKategoriler: ZenginKategori[] = KATEGORILER.map(k => ({
    ...k,
    gercekStat: kategoriStatlar[k.id] ?? undefined,
  }));

  const handleDersAc = (ders: DersKonular) => {
    setSeciliDers(ders);
    setModalAcik(true);
  };

  const handleKonuSec = (konu: KonuItem, ders: DersKonular) => {
    setModalAcik(false);
    setTimeout(() => {
      router.push({
        pathname: '/konu-anlatim',
        params: { konuAd: konu.ad, ders: ders.dersAd },
      });
    }, 300);
  };

  const handleKonuSoruCoz = (konu: KonuItem, ders: DersKonular) => {
    setModalAcik(false);
    const kategori = KATEGORILER.find(k => k.ders === ders.dersAd || k.id === ders.dersId);
    const kategoriId = kategori?.id ?? ders.dersId;
    setTimeout(() => {
      router.push({
        pathname: '/soru',
        params: { kategoriId, konuAd: konu.ad, mod: 'konu' },
      });
    }, 300);
  };

  const handleKategoriSoruCoz = (kategoriId: string) => {
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

  const toplamGercek = Object.values(kategoriStatlar).reduce((s, v) => s + v.cozulenSoru, 0);

  // Derslerin konu sayısı toplamı
  const toplamKonu = DERS_KONULARI.reduce((s, d) => s + d.konular.length, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.baslik}>Dersler</Text>
          <Text style={styles.altBaslik}>{DERS_KONULARI.length} ders • {toplamKonu} konu</Text>
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

      {/* Tab */}
      <View style={styles.tabWrap}>
        {(['Konu Anlatımı', 'Soru Çöz'] as TabTip[]).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tabBtn, aktifTab === tab && styles.tabBtnAktif]}
            onPress={() => setAktifTab(tab)}
          >
            <MaterialIcons
              name={tab === 'Konu Anlatımı' ? 'auto-awesome' : 'quiz'}
              size={15}
              color={aktifTab === tab ? '#fff' : Colors.textMuted}
            />
            <Text style={[styles.tabText, aktifTab === tab && styles.tabTextAktif]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.icerik}>

        {/* ─── Konu Anlatımı Sekmesi ─── */}
        {aktifTab === 'Konu Anlatımı' && (
          <>
            {/* Hero Bilgi */}
            <View style={styles.heroBant}>
              <View style={styles.heroBantIkon}>
                <MaterialIcons name="school" size={20} color={Colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroBantBaslik}>AI ile Konu Anlatımı</Text>
                <Text style={styles.heroBantAlt}>
                  Bir ders seç → konuya tıkla → yapay zeka sana özel anlatım yapsın
                </Text>
              </View>
            </View>

            {/* Ders Listesi */}
            {DERS_KONULARI.map(ders => (
              <DersKarti key={ders.dersId} ders={ders} onPress={() => handleDersAc(ders)} />
            ))}
          </>
        )}

        {/* ─── Soru Çöz Sekmesi ─── */}
        {aktifTab === 'Soru Çöz' && (
          <>
            {/* Bilgi bandı */}
            {!yukleniyor && user && toplamGercek === 0 && (
              <View style={styles.bilgiBant}>
                <MaterialIcons name="info-outline" size={14} color={Colors.primary} />
                <Text style={styles.bilgiText}>
                  Soru çözdükçe her kategorinin gerçek başarı oranı burada güncellenir.
                </Text>
              </View>
            )}

            {/* Kategori grid */}
            <View style={styles.grid}>
              {zenginKategoriler.map((item) => {
                const gercek = item.gercekStat;
                const basariYuzdesi = gercek ? gercek.basariYuzdesi : item.basariYuzdesi;
                const cozulenSoru = gercek ? gercek.cozulenSoru : item.cozulenSoru;
                const veriGercek = Boolean(gercek && gercek.cozulenSoru > 0);
                const basariRenk = getBasariRenk(basariYuzdesi);
                const etiket = getKategoriEtiket(item, zenginKategoriler);

                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [styles.kategoriKart, pressed && styles.pressedCard]}
                    onPress={() => handleKategoriSoruCoz(item.id)}
                  >
                    {etiket && (
                      <View style={[styles.etiketBadge, { backgroundColor: etiket.renk + '20', borderColor: etiket.renk + '40' }]}>
                        <Text style={styles.etiketEmoji}>{etiket.emoji}</Text>
                        <Text style={[styles.etiketText, { color: etiket.renk }]}>{etiket.label}</Text>
                      </View>
                    )}
                    <View style={[styles.kategoriIconWrap, { backgroundColor: item.renk + '20', borderColor: item.renk + '40' }]}>
                      <Text style={styles.kategoriEmoji}>{item.emoji}</Text>
                    </View>
                    <Text style={styles.kategoriAd}>{item.ad}</Text>
                    <Text style={styles.kategoriDers}>{item.ders}</Text>
                    <View style={styles.progressWrap}>
                      <View style={styles.progressBg}>
                        <View style={[styles.progressFill, { width: `${basariYuzdesi}%`, backgroundColor: basariRenk }]} />
                      </View>
                      <Text style={[styles.basariYuzde, { color: basariRenk }]}>%{basariYuzdesi}</Text>
                    </View>
                    <View style={styles.istatRow}>
                      <View style={styles.istatSolRow}>
                        <Text style={styles.istatText}>{cozulenSoru} soru</Text>
                        {veriGercek && (
                          <View style={styles.gercekBadge}>
                            <MaterialIcons name="verified" size={10} color={Colors.success} />
                            <Text style={styles.gercekBadgeText}>Gerçek</Text>
                          </View>
                        )}
                      </View>
                      <MaterialIcons name="chevron-right" size={16} color={Colors.textMuted} />
                    </View>
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
              })}
            </View>
          </>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Konu Seçim Modalı */}
      <KonuModal
        gorünür={modalAcik}
        ders={seciliDers}
        onKapat={() => setModalAcik(false)}
        onKonuSec={handleKonuSec}
        onKonuSoruCoz={handleKonuSoruCoz}
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

  // Tab
  tabWrap: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: Radius.lg,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  tabBtnAktif: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textMuted },
  tabTextAktif: { color: '#fff', fontWeight: FontWeight.bold },

  icerik: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  // Hero Bant
  heroBant: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.gold + '10', borderRadius: Radius.xl,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.gold + '25',
  },
  heroBantIkon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.gold + '20', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.gold + '40',
  },
  heroBantBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  heroBantAlt: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },

  // Bilgi Bant
  bilgiBant: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.primary + '10', borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.primary + '20',
  },
  bilgiText: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1, lineHeight: 16 },

  // Kategori grid (Soru Çöz sekmesi)
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  kategoriKart: {
    width: '48%', backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
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
