import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView,
  ActivityIndicator, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';
import { aiSoruUret, userStatsGuncelle } from '@/services/learningService';

interface QRSoruData {
  konu: string;
  ders: string;
  kategori?: string;
}

interface SoruData {
  id: string;
  soru: string;
  siklar: string[];
  dogru_cevap: string;
  aciklama: string;
  zorluk: 'Kolay' | 'Orta' | 'Zor';
  kazanim?: string;
  taktik?: string;
}

const SIKLAR_LABELS = ['A', 'B', 'C', 'D', 'E'];

// Tarayıcı çerçevesi animasyonu
function TarayiciCerceve() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cornerColor = Colors.primary;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[tc.cerceve, { transform: [{ scale: pulseAnim }] }]}>
      {/* Köşeler */}
      <View style={[tc.kose, tc.koseUstSol, { borderColor: cornerColor }]} />
      <View style={[tc.kose, tc.koseUstSag, { borderColor: cornerColor }]} />
      <View style={[tc.kose, tc.koseAltSol, { borderColor: cornerColor }]} />
      <View style={[tc.kose, tc.koseAltSag, { borderColor: cornerColor }]} />
    </Animated.View>
  );
}

const tc = StyleSheet.create({
  cerceve: {
    width: 240, height: 240, position: 'relative',
  },
  kose: { position: 'absolute', width: 30, height: 30, borderWidth: 3 },
  koseUstSol: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  koseUstSag: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  koseAltSol: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  koseAltSag: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
});

// Soru çözme modalı
function SoruModal({
  soru,
  gorünür,
  onKapat,
  user,
}: {
  soru: SoruData | null;
  gorünür: boolean;
  onKapat: () => void;
  user: any;
}) {
  const [secilen, setSecilen] = useState<string | null>(null);
  const [cevaplandi, setCevaplandi] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (gorünür) {
      setSecilen(null);
      setCevaplandi(false);
    }
  }, [gorünür, soru]);

  if (!soru) return null;

  const normalize = (s: string) => s.replace(/[^A-E]/g, '').trim().toUpperCase();

  const handleCevapla = async () => {
    if (!secilen || cevaplandi) return;
    const dogru = normalize(secilen) === normalize(soru.dogru_cevap);
    setCevaplandi(true);

    if (dogru) {
      Animated.sequence([
        Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 7, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }

    // Kaydet
    if (user) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('soru_gecmisi').insert({
          user_id: user.id,
          soru_id: soru.id,
          dogru,
          secilen_sik: secilen,
          kategori: 'qr',
          ders: '',
        });
        if (dogru) {
          userStatsGuncelle(user.id, 15).catch(() => {});
        }
      } catch {}
    }
  };

  const dogru = cevaplandi ? normalize(secilen ?? '') === normalize(soru.dogru_cevap) : null;

  return (
    <Modal visible={gorünür} transparent animationType="slide" onRequestClose={onKapat}>
      <View style={sm.overlay}>
        <Pressable style={sm.backdrop} onPress={cevaplandi ? onKapat : undefined} />
        <View style={sm.sheet}>
          <View style={sm.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Üst bar */}
            <View style={sm.topBar}>
              <View style={sm.qrBadge}>
                <MaterialIcons name="qr-code" size={12} color={Colors.primary} />
                <Text style={sm.qrBadgeText}>QR Soru</Text>
              </View>
              <View style={[sm.zorlukBadge, {
                backgroundColor: soru.zorluk === 'Kolay' ? Colors.success + '20'
                  : soru.zorluk === 'Zor' ? Colors.error + '20'
                  : Colors.warning + '20',
              }]}>
                <Text style={[sm.zorlukText, {
                  color: soru.zorluk === 'Kolay' ? Colors.success
                    : soru.zorluk === 'Zor' ? Colors.error
                    : Colors.warning,
                }]}>{soru.zorluk}</Text>
              </View>
            </View>

            {/* Soru */}
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <Text style={sm.soruMetin}>{soru.soru}</Text>
            </Animated.View>

            {/* Şıklar */}
            <View style={sm.siklar}>
              {soru.siklar.map((sik, i) => {
                const label = SIKLAR_LABELS[i];
                const secilenBu = secilen === label;
                const dogruBu = cevaplandi && normalize(label) === normalize(soru.dogru_cevap);
                const yanlisBu = cevaplandi && secilenBu && !dogruBu;
                const soluk = cevaplandi && !dogruBu && !secilenBu;
                return (
                  <Pressable
                    key={i}
                    style={[
                      sm.sik,
                      secilenBu && !cevaplandi && sm.sikSecili,
                      dogruBu && sm.sikDogru,
                      yanlisBu && sm.sikYanlis,
                      { opacity: soluk ? 0.4 : 1 },
                    ]}
                    onPress={() => { if (!cevaplandi) setSecilen(label); }}
                  >
                    <View style={[
                      sm.sikLabel,
                      secilenBu && !cevaplandi && { backgroundColor: Colors.primary, borderColor: Colors.primary },
                      dogruBu && { backgroundColor: Colors.success, borderColor: Colors.success },
                      yanlisBu && { backgroundColor: Colors.error, borderColor: Colors.error },
                    ]}>
                      <Text style={sm.sikLabelText}>{label}</Text>
                    </View>
                    <Text style={sm.sikMetni}>{sik.replace(/^[A-E]\) /, '')}</Text>
                    {dogruBu && <MaterialIcons name="check-circle" size={20} color={Colors.success} />}
                    {yanlisBu && <MaterialIcons name="cancel" size={20} color={Colors.error} />}
                  </Pressable>
                );
              })}
            </View>

            {/* Açıklama + Taktik */}
            {cevaplandi && (
              <View style={sm.aciklamaKart}>
                <View style={sm.aciklamaHeader}>
                  <MaterialIcons name="smart-toy" size={16} color={Colors.primary} />
                  <Text style={sm.aciklamaBaslik}>AI Açıklaması</Text>
                  {dogru
                    ? <View style={sm.dogru}><Text style={sm.dogruText}>✓ Doğru!</Text></View>
                    : <View style={sm.yanlis}><Text style={sm.yanlisText}>✗ Yanlış</Text></View>}
                </View>
                <Text style={sm.aciklamaMetin}>{soru.aciklama}</Text>

                {/* Akılda Kalıcı Taktik */}
                {soru.taktik ? (
                  <View style={sm.taktikKart}>
                    <View style={sm.taktikHeader}>
                      <Text style={sm.taktikEmoji}>💡</Text>
                      <Text style={sm.taktikBaslik}>Akılda Kalıcı Taktik</Text>
                    </View>
                    <Text style={sm.taktikMetin}>{soru.taktik}</Text>
                  </View>
                ) : null}

                {soru.kazanim ? (
                  <View style={sm.kazanimChip}>
                    <MaterialIcons name="school" size={11} color={Colors.gold} />
                    <Text style={sm.kazanimText}>{soru.kazanim}</Text>
                  </View>
                ) : null}

                <View style={sm.xpKazanim}>
                  <MaterialIcons name="stars" size={16} color={Colors.gold} />
                  <Text style={sm.xpText}>{dogru ? '+15 XP kazandın!' : 'Tekrar dene, doğruyu öğren!'}</Text>
                </View>
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Alt buton */}
          <View style={sm.altBtn}>
            {!cevaplandi ? (
              <Pressable
                style={[sm.cevapBtn, !secilen && sm.cevapBtnDisabled]}
                disabled={!secilen}
                onPress={handleCevapla}
              >
                <Text style={[sm.cevapBtnText, !secilen && { color: Colors.textMuted }]}>Cevapla</Text>
              </Pressable>
            ) : (
              <Pressable style={sm.cevapBtn} onPress={onKapat}>
                <Text style={sm.cevapBtnText}>Yeni QR Tara</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const sm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', inset: 0 },
  sheet: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.md, maxHeight: '92%',
    borderWidth: 1, borderColor: Colors.border,
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  qrBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary + '15', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.primary + '30',
  },
  qrBadgeText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold },
  zorlukBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  zorlukText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  soruMetin: { fontSize: FontSize.base, color: Colors.textPrimary, lineHeight: 26, fontWeight: FontWeight.medium, marginBottom: Spacing.md },
  siklar: { gap: 10, marginBottom: Spacing.md },
  sik: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.md, padding: 13, borderWidth: 1.5,
    borderColor: Colors.borderLight, backgroundColor: Colors.bgCardAlt,
  },
  sikSecili: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  sikDogru: { borderColor: Colors.success, backgroundColor: Colors.success + '15' },
  sikYanlis: { borderColor: Colors.error, backgroundColor: Colors.error + '15' },
  sikLabel: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.bgSurface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  sikLabelText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sikMetni: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20, fontWeight: FontWeight.medium },
  aciklamaKart: {
    backgroundColor: Colors.primary + '12', borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  aciklamaHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  aciklamaBaslik: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  dogru: { backgroundColor: Colors.success + '20', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  dogruText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.bold },
  yanlis: { backgroundColor: Colors.error + '20', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  yanlisText: { fontSize: FontSize.xs, color: Colors.error, fontWeight: FontWeight.bold },
  aciklamaMetin: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22, marginBottom: Spacing.sm },
  taktikKart: {
    backgroundColor: Colors.gold + '12', borderRadius: Radius.md, padding: Spacing.sm,
    borderWidth: 1, borderColor: Colors.gold + '30', marginBottom: Spacing.sm,
  },
  taktikHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 5 },
  taktikEmoji: { fontSize: 16 },
  taktikBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  taktikMetin: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 },
  kazanimChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.gold + '12', borderRadius: Radius.md, padding: 6, marginBottom: Spacing.sm,
  },
  kazanimText: { fontSize: 10, color: Colors.gold, flex: 1 },
  xpKazanim: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xpText: { fontSize: FontSize.xs, color: Colors.gold, fontWeight: FontWeight.bold },
  altBtn: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, backgroundColor: Colors.bgCard },
  cevapBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 15, alignItems: 'center' },
  cevapBtnDisabled: { backgroundColor: Colors.bgCardAlt, borderWidth: 1, borderColor: Colors.border },
  cevapBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
});

// ─── Ana Ekran ─────────────────────────────────────────────────────────────────
export default function QRCoz() {
  const router = useRouter();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [tarandiMi, setTarandiMi] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [aktifSoru, setAktifSoru] = useState<SoruData | null>(null);
  const [soruModalAcik, setSoruModalAcik] = useState(false);
  const [hata, setHata] = useState('');

  const handleBarkodTara = async (data: string) => {
    if (tarandiMi || yukleniyor) return;
    setTarandiMi(true);
    setHata('');
    setYukleniyor(true);

    try {
      let qrVeri: QRSoruData;

      // QR kod formatını ayrıştır: JSON veya basit konu metni
      try {
        qrVeri = JSON.parse(data);
      } catch {
        // JSON değilse, metin olarak konu kabul et
        qrVeri = { konu: data, ders: 'Genel Yetenek' };
      }

      // AI ile soru üret + taktik iste
      const sorular = await aiSoruUret({
        konu: qrVeri.konu,
        ders: qrVeri.ders || 'Genel Yetenek',
        kategori: qrVeri.kategori,
        zorluk: 'Orta',
        soru_sayisi: 1,
      });

      if (!sorular || sorular.length === 0) {
        setHata('QR kod okundu ama soru üretilemedi. Tekrar dene.');
        setTarandiMi(false);
        setYukleniyor(false);
        return;
      }

      // Taktiği ayrı olarak al
      const taktik = await getTaktik(qrVeri.konu, qrVeri.ders || 'Genel Yetenek', sorular[0].soru);

      const soruVerisi: SoruData = {
        id: `qr_${Date.now()}`,
        soru: sorular[0].soru,
        siklar: sorular[0].siklar,
        dogru_cevap: sorular[0].dogru_cevap,
        aciklama: sorular[0].aciklama,
        zorluk: sorular[0].zorluk as 'Kolay' | 'Orta' | 'Zor' || 'Orta',
        kazanim: sorular[0].kazanim,
        taktik,
      };

      setAktifSoru(soruVerisi);
      setSoruModalAcik(true);
    } catch (e) {
      console.error('QR çözme hatası:', e);
      setHata('Bağlantı hatası. İnternet bağlantını kontrol et.');
      setTarandiMi(false);
    } finally {
      setYukleniyor(false);
    }
  };

  const getTaktik = async (konu: string, ders: string, soru: string): Promise<string> => {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.functions.invoke('ai-learning', {
        body: {
          tip: 'taktik_uret',
          konu,
          ders,
          soru,
        },
      });
      return data?.content || '';
    } catch {
      return '';
    }
  };

  const handleSoruKapat = () => {
    setSoruModalAcik(false);
    setAktifSoru(null);
    setTarandiMi(false);
    setHata('');
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.izinYukleniyor}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.izinEkrani}>
          <Pressable style={styles.geriBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.izinIkon}>
            <MaterialIcons name="qr-code-scanner" size={52} color={Colors.primary} />
          </View>
          <Text style={styles.izinBaslik}>Kamera İzni Gerekiyor</Text>
          <Text style={styles.izinAciklama}>
            QR kodları taramak için kamera izni gerekiyor. KPSS sorularını QR kod ile çözebilirsin!
          </Text>
          <Pressable
            style={({ pressed }) => [styles.izinBtn, pressed && { opacity: 0.85 }]}
            onPress={requestPermission}
          >
            <MaterialIcons name="camera-alt" size={18} color="#fff" />
            <Text style={styles.izinBtnText}>Kamera İznini Ver</Text>
          </Pressable>
          <Pressable style={styles.geriLink} onPress={() => router.back()}>
            <Text style={styles.geriLinkText}>Geri Dön</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Kamera görünümü */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={tarandiMi ? undefined : (result) => handleBarkodTara(result.data)}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.geriBtn} onPress={() => router.back()}>
            <MaterialIcons name="close" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.baslik}>QR Soru Tara</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Tarayıcı alanı */}
        <View style={styles.tarayiciAlani}>
          <TarayiciCerceve />
          {yukleniyor && (
            <View style={styles.yukleniyor}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.yukleniyorText}>AI soru üretiyor...</Text>
            </View>
          )}
        </View>

        {/* Alt bilgi */}
        <View style={styles.altBilgi}>
          {hata ? (
            <View style={styles.hataKart}>
              <MaterialIcons name="error-outline" size={20} color={Colors.error} />
              <Text style={styles.hataText}>{hata}</Text>
            </View>
          ) : (
            <>
              <View style={styles.bilgiKart}>
                <MaterialIcons name="info-outline" size={16} color={Colors.primary} />
                <Text style={styles.bilgiText}>
                  QR kodu çerçeve içine hizala, AI otomatik soru üretecek
                </Text>
              </View>
              <View style={styles.ozellikler}>
                <View style={styles.ozellik}>
                  <MaterialIcons name="psychology" size={16} color={Colors.gold} />
                  <Text style={styles.ozellikText}>AI ile konu analizi</Text>
                </View>
                <View style={styles.ozellik}>
                  <MaterialIcons name="lightbulb" size={16} color={Colors.success} />
                  <Text style={styles.ozellikText}>Akılda kalıcı taktikler</Text>
                </View>
                <View style={styles.ozellik}>
                  <MaterialIcons name="stars" size={16} color={Colors.warning} />
                  <Text style={styles.ozellikText}>+15 XP kazan</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Soru Modalı */}
      <SoruModal
        soru={aktifSoru}
        gorünür={soruModalAcik}
        onKapat={handleSoruKapat}
        user={user}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  izinYukleniyor: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  izinEkrani: {
    flex: 1, alignItems: 'center', paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg, gap: Spacing.md, backgroundColor: Colors.bg,
  },
  izinIkon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primary + '40', marginTop: Spacing.xl,
  },
  izinBaslik: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  izinAciklama: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  izinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 14, paddingHorizontal: Spacing.xl,
  },
  izinBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  geriLink: { paddingVertical: 12 },
  geriLinkText: { fontSize: FontSize.sm, color: Colors.textSecondary },

  // Kamera overlay
  overlay: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  geriBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  baslik: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#fff' },

  tarayiciAlani: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  yukleniyor: {
    position: 'absolute', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: Radius.lg,
    padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm,
  },
  yukleniyorText: { fontSize: FontSize.sm, color: '#fff', fontWeight: FontWeight.medium },

  altBilgi: {
    backgroundColor: 'rgba(0,0,0,0.75)', padding: Spacing.md, gap: Spacing.sm,
  },
  hataKart: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.error + '20', borderRadius: Radius.md, padding: Spacing.sm,
    borderWidth: 1, borderColor: Colors.error + '40',
  },
  hataText: { fontSize: FontSize.sm, color: Colors.error, flex: 1 },
  bilgiKart: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.primary + '15', borderRadius: Radius.md, padding: Spacing.sm,
  },
  bilgiText: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  ozellikler: { flexDirection: 'row', justifyContent: 'space-around' },
  ozellik: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ozellikText: { fontSize: FontSize.xs, color: Colors.textSecondary },
});
