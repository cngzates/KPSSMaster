import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  Modal, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';
import { useAlert } from '@/template';

interface PaylasilanSoru {
  id: string;
  user_id: string;
  soru_metni: string;
  siklar: string[];
  dogru_cevap: string;
  aciklama: string;
  ders: string;
  kategori: string;
  zorluk: string;
  kazanim: string;
  begeni_sayisi: number;
  yorum_sayisi: number;
  created_at: string;
  yazar_ad?: string;
  kullanici_begendi?: boolean;
  cozuldu?: boolean;
}

interface Yorum {
  id: string;
  user_id: string;
  yorum_metni: string;
  created_at: string;
  yazar_ad?: string;
}

const KATEGORI_FILTRELER = ['Tümü', 'Türkçe', 'Matematik', 'Tarih', 'Coğrafya', 'Vatandaşlık', 'Güncel'];
const ZORLUK_RENK: Record<string, string> = {
  'Kolay': Colors.success,
  'Orta': Colors.warning,
  'Zor': Colors.error,
};

// ─── Soru Kartı ───────────────────────────────────────────────────────────────
function SoruKarti({
  soru,
  onBegen,
  onYorumAc,
  onCoz,
}: {
  soru: PaylasilanSoru;
  onBegen: (id: string) => void;
  onYorumAc: (soru: PaylasilanSoru) => void;
  onCoz: (soru: PaylasilanSoru) => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleBegen = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onBegen(soru.id);
  };

  const zorlukRenk = ZORLUK_RENK[soru.zorluk] ?? Colors.primary;
  const tarih = new Date(soru.created_at);
  const tarihStr = `${tarih.getDate()}.${tarih.getMonth() + 1}.${tarih.getFullYear()}`;

  return (
    <View style={styles.soruKart}>
      {/* Üst bilgi */}
      <View style={styles.soruKartHeader}>
        <View style={styles.yazarWrap}>
          <View style={styles.yazarAvatar}>
            <Text style={styles.yazarAvatarText}>{(soru.yazar_ad || 'K').charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.yazarAd}>{soru.yazar_ad || 'Kullanıcı'}</Text>
            <Text style={styles.soruTarih}>{tarihStr}</Text>
          </View>
        </View>
        <View style={styles.soruMetaBadgeler}>
          <View style={[styles.zorlukBadge, { backgroundColor: zorlukRenk + '20' }]}>
            <Text style={[styles.zorlukText, { color: zorlukRenk }]}>{soru.zorluk}</Text>
          </View>
          {soru.cozuldu && (
            <View style={styles.cozulduBadge}>
              <MaterialIcons name="check-circle" size={12} color={Colors.success} />
              <Text style={styles.cozulduText}>Çözüldü</Text>
            </View>
          )}
        </View>
      </View>

      {/* Ders etiketi */}
      <View style={styles.dersChip}>
        <Text style={styles.dersText}>{soru.ders || soru.kategori || 'KPSS'}</Text>
      </View>

      {/* Soru metni */}
      <Text style={styles.soruMetin} numberOfLines={4}>{soru.soru_metni}</Text>

      {/* Şık özeti */}
      {soru.siklar && soru.siklar.length > 0 && (
        <View style={styles.sikOzet}>
          {soru.siklar.slice(0, 2).map((sik, i) => (
            <Text key={i} style={styles.sikOzetText} numberOfLines={1}>
              {'ABCDE'[i]}. {sik.replace(/^[A-E]\) /, '')}
            </Text>
          ))}
          {soru.siklar.length > 2 && (
            <Text style={styles.sikOzetMore}>+{soru.siklar.length - 2} seçenek daha</Text>
          )}
        </View>
      )}

      {/* Kazanım */}
      {soru.kazanim ? (
        <View style={styles.kazanimChip}>
          <MaterialIcons name="school" size={11} color={Colors.gold} />
          <Text style={styles.kazanimText} numberOfLines={1}>{soru.kazanim}</Text>
        </View>
      ) : null}

      {/* Alt butonlar */}
      <View style={styles.soruAltRow}>
        {/* Beğeni */}
        <Pressable style={styles.soruAltBtn} onPress={handleBegen}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <MaterialIcons
              name={soru.kullanici_begendi ? 'favorite' : 'favorite-border'}
              size={20}
              color={soru.kullanici_begendi ? Colors.error : Colors.textMuted}
            />
          </Animated.View>
          <Text style={[styles.soruAltBtnText, soru.kullanici_begendi && { color: Colors.error }]}>
            {soru.begeni_sayisi}
          </Text>
        </Pressable>

        {/* Yorum */}
        <Pressable style={styles.soruAltBtn} onPress={() => onYorumAc(soru)}>
          <MaterialIcons name="chat-bubble-outline" size={20} color={Colors.textMuted} />
          <Text style={styles.soruAltBtnText}>{soru.yorum_sayisi}</Text>
        </Pressable>

        {/* Çöz */}
        <Pressable
          style={({ pressed }) => [styles.cozBtn, pressed && { opacity: 0.85 }]}
          onPress={() => onCoz(soru)}
        >
          <MaterialIcons name="play-arrow" size={16} color={Colors.primary} />
          <Text style={styles.cozBtnText}>Bu Soruyu Çöz</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Yorum Modalı ─────────────────────────────────────────────────────────────
function YorumModal({
  soru,
  gorünür,
  onKapat,
  user,
}: {
  soru: PaylasilanSoru | null;
  gorünür: boolean;
  onKapat: () => void;
  user: any;
}) {
  const [yorumlar, setYorumlar] = useState<Yorum[]>([]);
  const [yeniYorum, setYeniYorum] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [gonderiyor, setGonderiyor] = useState(false);

  useEffect(() => {
    if (gorünür && soru) {
      yorumlariYukle();
    }
  }, [gorünür, soru]);

  const yorumlariYukle = async () => {
    if (!soru) return;
    setYukleniyor(true);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('soru_yorum')
        .select('id, user_id, yorum_metni, created_at')
        .eq('soru_id', soru.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        // Kullanıcı adlarını çek
        const userIds = [...new Set(data.map(y => y.user_id))];
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, username, email')
          .in('id', userIds);

        const profileMap: Record<string, string> = {};
        profiles?.forEach(p => {
          profileMap[p.id] = p.username || p.email?.split('@')[0] || 'Kullanıcı';
        });

        setYorumlar(data.map(y => ({
          ...y,
          yazar_ad: profileMap[y.user_id] || 'Kullanıcı',
        })));
      }
    } catch (e) {
      console.error('Yorum yükleme hatası:', e);
    } finally {
      setYukleniyor(false);
    }
  };

  const yorumGonder = async () => {
    if (!yeniYorum.trim() || !soru || !user || gonderiyor) return;
    setGonderiyor(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.from('soru_yorum').insert({
        user_id: user.id,
        soru_id: soru.id,
        yorum_metni: yeniYorum.trim(),
      });
      // Yorum sayısını artır
      await supabase
        .from('paylasilan_sorular')
        .update({ yorum_sayisi: (soru.yorum_sayisi || 0) + 1 })
        .eq('id', soru.id);

      setYeniYorum('');
      yorumlariYukle();
    } catch (e) {
      console.error('Yorum gönderme hatası:', e);
    } finally {
      setGonderiyor(false);
    }
  };

  if (!soru) return null;

  return (
    <Modal visible={gorünür} transparent animationType="slide" onRequestClose={onKapat}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={ym.overlay}
      >
        <Pressable style={ym.backdrop} onPress={onKapat} />
        <View style={ym.sheet}>
          <View style={ym.handle} />
          <View style={ym.header}>
            <Text style={ym.baslik}>Yorumlar</Text>
            <Pressable onPress={onKapat} hitSlop={12}>
              <MaterialIcons name="close" size={22} color={Colors.textMuted} />
            </Pressable>
          </View>

          {/* Soru özeti */}
          <View style={ym.soruOzet}>
            <Text style={ym.soruOzetText} numberOfLines={2}>{soru.soru_metni}</Text>
          </View>

          {yukleniyor ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
          ) : yorumlar.length === 0 ? (
            <View style={ym.bosYorum}>
              <MaterialIcons name="chat" size={40} color={Colors.textMuted} />
              <Text style={ym.bosYorumText}>Henüz yorum yok. İlk yorumu sen yap!</Text>
            </View>
          ) : (
            <ScrollView style={ym.yorumListesi} showsVerticalScrollIndicator={false}>
              {yorumlar.map((y) => {
                const tarih = new Date(y.created_at);
                const tarihStr = `${tarih.getDate()}.${tarih.getMonth() + 1}`;
                return (
                  <View key={y.id} style={ym.yorumItem}>
                    <View style={ym.yorumAvatar}>
                      <Text style={ym.yorumAvatarText}>{(y.yazar_ad || 'K').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={ym.yorumSag}>
                      <View style={ym.yorumHeader}>
                        <Text style={ym.yorumYazar}>{y.yazar_ad}</Text>
                        <Text style={ym.yorumTarih}>{tarihStr}</Text>
                      </View>
                      <Text style={ym.yorumMetin}>{y.yorum_metni}</Text>
                    </View>
                  </View>
                );
              })}
              <View style={{ height: Spacing.md }} />
            </ScrollView>
          )}

          {/* Yorum giriş */}
          {user ? (
            <View style={ym.inputRow}>
              <TextInput
                style={ym.input}
                value={yeniYorum}
                onChangeText={setYeniYorum}
                placeholder="Yorumunu yaz..."
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={300}
              />
              <Pressable
                style={[ym.gonderiBtn, (!yeniYorum.trim() || gonderiyor) && ym.gonderiBtnDisabled]}
                onPress={yorumGonder}
                disabled={!yeniYorum.trim() || gonderiyor}
              >
                {gonderiyor
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <MaterialIcons name="send" size={20} color="#fff" />}
              </Pressable>
            </View>
          ) : (
            <Text style={ym.girisGerekli}>Yorum yapmak için giriş yapman gerekiyor.</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ym = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.md, maxHeight: '80%',
    borderWidth: 1, borderColor: Colors.border,
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  baslik: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  soruOzet: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md, padding: Spacing.sm,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  soruOzetText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  bosYorum: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  bosYorumText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  yorumListesi: { flex: 1, marginBottom: Spacing.sm },
  yorumItem: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  yorumAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  yorumAvatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  yorumSag: { flex: 1, backgroundColor: Colors.bgSurface, borderRadius: Radius.md, padding: Spacing.sm },
  yorumHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  yorumYazar: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  yorumTarih: { fontSize: FontSize.xs, color: Colors.textMuted },
  yorumMetin: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  input: {
    flex: 1, backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    padding: Spacing.sm, color: Colors.textPrimary, borderWidth: 1,
    borderColor: Colors.border, fontSize: FontSize.sm, minHeight: 44, maxHeight: 100,
  },
  gonderiBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  gonderiBtnDisabled: { backgroundColor: Colors.bgCardAlt },
  girisGerekli: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', padding: Spacing.md },
});

// ─── Ana Ekran ─────────────────────────────────────────────────────────────────
export default function Kesfet() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();

  const [sorular, setSorular] = useState<PaylasilanSoru[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [filtre, setFiltre] = useState('Tümü');
  const [arama, setArama] = useState('');
  const [aramaAktif, setAramaAktif] = useState(false);
  const [yorumModalSoru, setYorumModalSoru] = useState<PaylasilanSoru | null>(null);
  const [qrModalAcik, setQrModalAcik] = useState(false);

  // Soru çözme modalı
  const [cozModal, setCozModal] = useState<{
    soru: PaylasilanSoru;
    secilen: string | null;
    cevaplandi: boolean;
  } | null>(null);

  const soruYukle = useCallback(async (yenile = false) => {
    if (yenile) setYenileniyor(true);
    else setYukleniyor(true);

    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from('paylasilan_sorular')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filtre !== 'Tümü') {
        query = query.or(`ders.ilike.%${filtre}%,kategori.ilike.%${filtre}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = data ?? [];

      // Kullanıcı adlarını çek
      const userIds = [...new Set(rows.map(r => r.user_id))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, username, email')
          .in('id', userIds);
        profiles?.forEach(p => {
          profileMap[p.id] = p.username || p.email?.split('@')[0] || 'Kullanıcı';
        });
      }

      // Kullanıcının beğenilerini çek
      let begeniSet = new Set<string>();
      let cozulenSet = new Set<string>();
      if (user) {
        const soruIds = rows.map(r => r.id);
        const [begeniRes, gecmisRes] = await Promise.all([
          supabase
            .from('soru_begeni')
            .select('soru_id')
            .eq('user_id', user.id)
            .in('soru_id', soruIds),
          supabase
            .from('soru_gecmisi')
            .select('soru_id')
            .eq('user_id', user.id)
            .in('soru_id', soruIds),
        ]);
        begeniRes.data?.forEach(b => begeniSet.add(b.soru_id));
        gecmisRes.data?.forEach(g => cozulenSet.add(g.soru_id));
      }

      const zenginSorular: PaylasilanSoru[] = rows.map(r => ({
        ...r,
        siklar: Array.isArray(r.siklar) ? r.siklar : JSON.parse(r.siklar || '[]'),
        yazar_ad: profileMap[r.user_id] || 'Kullanıcı',
        kullanici_begendi: begeniSet.has(r.id),
        cozuldu: cozulenSet.has(r.id),
      }));

      setSorular(zenginSorular);
    } catch (e) {
      console.error('Keşfet yükleme hatası:', e);
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, [filtre, user]);

  useEffect(() => {
    soruYukle();
  }, [soruYukle]);

  const handleBegen = async (soruId: string) => {
    if (!user) {
      showAlert('Giriş Yapman Gerekiyor', 'Beğenmek için lütfen giriş yap.');
      return;
    }
    const soru = sorular.find(s => s.id === soruId);
    if (!soru) return;

    const supabase = getSupabaseClient();
    if (soru.kullanici_begendi) {
      // Beğeniyi kaldır
      await supabase.from('soru_begeni').delete()
        .eq('user_id', user.id).eq('soru_id', soruId);
      await supabase.from('paylasilan_sorular')
        .update({ begeni_sayisi: Math.max(0, soru.begeni_sayisi - 1) })
        .eq('id', soruId);
      setSorular(prev => prev.map(s => s.id === soruId
        ? { ...s, kullanici_begendi: false, begeni_sayisi: Math.max(0, s.begeni_sayisi - 1) }
        : s
      ));
    } else {
      // Beğen
      await supabase.from('soru_begeni').insert({ user_id: user.id, soru_id: soruId });
      await supabase.from('paylasilan_sorular')
        .update({ begeni_sayisi: soru.begeni_sayisi + 1 })
        .eq('id', soruId);
      setSorular(prev => prev.map(s => s.id === soruId
        ? { ...s, kullanici_begendi: true, begeni_sayisi: s.begeni_sayisi + 1 }
        : s
      ));
    }
  };

  const handleCoz = (soru: PaylasilanSoru) => {
    setCozModal({ soru, secilen: null, cevaplandi: false });
  };

  const handleCevapla = () => {
    if (!cozModal || !cozModal.secilen || cozModal.cevaplandi) return;
    setCozModal(prev => prev ? { ...prev, cevaplandi: true } : null);

    // Soru geçmişine kaydet
    if (user && cozModal) {
      const dogru = cozModal.secilen === cozModal.soru.dogru_cevap;
      const supabase = getSupabaseClient();
      supabase.from('soru_gecmisi').insert({
        user_id: user.id,
        soru_id: cozModal.soru.id,
        dogru,
        secilen_sik: cozModal.secilen,
        kategori: cozModal.soru.kategori || 'genel',
        ders: cozModal.soru.ders || '',
      }).then(() => {
        setSorular(prev => prev.map(s => s.id === cozModal.soru.id ? { ...s, cozuldu: true } : s));
      });
    }
  };

  const aramaFiltreliSorular = sorular.filter(s => {
    if (!arama) return true;
    const q = arama.toLowerCase();
    return (
      s.soru_metni?.toLowerCase().includes(q) ||
      s.ders?.toLowerCase().includes(q) ||
      s.kategori?.toLowerCase().includes(q)
    );
  });

  const normalize = (s: string) => s.replace(/[^A-E]/g, '').trim().toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSol}>
          <Text style={styles.baslik}>Keşfet</Text>
          <Text style={styles.altBaslik}>Topluluk soruları</Text>
        </View>
        <View style={styles.headerBtnler}>
          <Pressable
            style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.7 }]}
            onPress={() => setAramaAktif(v => !v)}
          >
            <MaterialIcons name="search" size={22} color={aramaAktif ? Colors.primary : Colors.textSecondary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/qr-coz')}
          >
            <MaterialIcons name="qr-code-scanner" size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Arama kutusu */}
      {aramaAktif && (
        <View style={styles.aramaWrap}>
          <MaterialIcons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.aramaInput}
            value={arama}
            onChangeText={setArama}
            placeholder="Soru veya ders ara..."
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />
          {arama ? (
            <Pressable onPress={() => setArama('')} hitSlop={8}>
              <MaterialIcons name="close" size={18} color={Colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      )}

      {/* Kategori filtresi */}
      <View style={styles.filtreWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtreScroll}>
          {KATEGORI_FILTRELER.map(k => (
            <Pressable
              key={k}
              style={[styles.filtreChip, filtre === k && styles.filtreChipAktif]}
              onPress={() => setFiltre(k)}
            >
              <Text style={[styles.filtreText, filtre === k && styles.filtreTextAktif]}>{k}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Liste */}
      {yukleniyor ? (
        <View style={styles.yukleniyorWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.yukleniyorText}>Sorular yükleniyor...</Text>
        </View>
      ) : aramaFiltreliSorular.length === 0 ? (
        <View style={styles.bosHal}>
          <MaterialIcons name="explore-off" size={52} color={Colors.textMuted} />
          <Text style={styles.bosBaslik}>Henüz soru yok</Text>
          <Text style={styles.bosAciklama}>
            {filtre !== 'Tümü' ? `${filtre} kategorisinde` : ''} Topluluktan paylaşılan soru bekleniyor.
          </Text>
          <Text style={styles.bosAlt}>AI sorularını çözdükten sonra "Paylaş" butonu ile topluluğa ekleyebilirsin.</Text>
        </View>
      ) : (
        <FlatList
          data={aramaFiltreliSorular}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listeContent}
          refreshing={yenileniyor}
          onRefresh={() => soruYukle(true)}
          renderItem={({ item }) => (
            <SoruKarti
              soru={item}
              onBegen={handleBegen}
              onYorumAc={setYorumModalSoru}
              onCoz={handleCoz}
            />
          )}
          ListFooterComponent={<View style={{ height: 80 }} />}
        />
      )}

      {/* Soru Çözme Modalı */}
      <Modal visible={cozModal !== null} transparent animationType="slide" onRequestClose={() => setCozModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={cozStyles.overlay} onPress={() => setCozModal(null)}>
            <Pressable style={cozStyles.sheet} onPress={() => {}}>
              <View style={cozStyles.handle} />
              {cozModal && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Ders chip */}
                  <View style={cozStyles.dersChip}>
                    <Text style={cozStyles.dersText}>{cozModal.soru.ders || 'KPSS'}</Text>
                    <View style={[cozStyles.zorlukBadge, {
                      backgroundColor: (ZORLUK_RENK[cozModal.soru.zorluk] ?? Colors.primary) + '20',
                    }]}>
                      <Text style={[cozStyles.zorlukText, {
                        color: ZORLUK_RENK[cozModal.soru.zorluk] ?? Colors.primary,
                      }]}>{cozModal.soru.zorluk}</Text>
                    </View>
                  </View>

                  {/* Soru metni */}
                  <Text style={cozStyles.soruMetin}>{cozModal.soru.soru_metni}</Text>

                  {/* Şıklar */}
                  {cozModal.soru.siklar.map((sik, i) => {
                    const label = 'ABCDE'[i];
                    const secilenBu = cozModal.secilen === label;
                    const dogruBu = cozModal.cevaplandi && normalize(label) === normalize(cozModal.soru.dogru_cevap);
                    const yanlisBu = cozModal.cevaplandi && secilenBu && !dogruBu;
                    return (
                      <Pressable
                        key={i}
                        style={[
                          cozStyles.sik,
                          secilenBu && !cozModal.cevaplandi && cozStyles.sikSecili,
                          dogruBu && cozStyles.sikDogru,
                          yanlisBu && cozStyles.sikYanlis,
                        ]}
                        onPress={() => {
                          if (!cozModal.cevaplandi) setCozModal(prev => prev ? { ...prev, secilen: label } : null);
                        }}
                      >
                        <View style={[
                          cozStyles.sikLabel,
                          secilenBu && !cozModal.cevaplandi && { backgroundColor: Colors.primary, borderColor: Colors.primary },
                          dogruBu && { backgroundColor: Colors.success, borderColor: Colors.success },
                          yanlisBu && { backgroundColor: Colors.error, borderColor: Colors.error },
                        ]}>
                          <Text style={cozStyles.sikLabelText}>{label}</Text>
                        </View>
                        <Text style={cozStyles.sikMetin}>{sik.replace(/^[A-E]\) /, '')}</Text>
                        {dogruBu && <MaterialIcons name="check-circle" size={18} color={Colors.success} />}
                        {yanlisBu && <MaterialIcons name="cancel" size={18} color={Colors.error} />}
                      </Pressable>
                    );
                  })}

                  {/* Açıklama */}
                  {cozModal.cevaplandi && cozModal.soru.aciklama ? (
                    <View style={cozStyles.aciklama}>
                      <View style={cozStyles.aciklamaHeader}>
                        <MaterialIcons name="smart-toy" size={16} color={Colors.primary} />
                        <Text style={cozStyles.aciklamaBaslik}>AI Açıklaması</Text>
                      </View>
                      <Text style={cozStyles.aciklamaMetin}>{cozModal.soru.aciklama}</Text>
                      {cozModal.soru.kazanim ? (
                        <View style={cozStyles.kazanimChip}>
                          <MaterialIcons name="school" size={11} color={Colors.gold} />
                          <Text style={cozStyles.kazanimText}>{cozModal.soru.kazanim}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={{ height: 100 }} />
                </ScrollView>
              )}

              {/* Alt buton */}
              <View style={cozStyles.altBtn}>
                {!cozModal?.cevaplandi ? (
                  <Pressable
                    style={[cozStyles.cevapBtn, !cozModal?.secilen && cozStyles.cevapBtnDisabled]}
                    disabled={!cozModal?.secilen}
                    onPress={handleCevapla}
                  >
                    <Text style={[cozStyles.cevapBtnText, !cozModal?.secilen && { color: Colors.textMuted }]}>
                      Cevapla
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable style={cozStyles.cevapBtn} onPress={() => setCozModal(null)}>
                    <Text style={cozStyles.cevapBtnText}>Kapat</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Yorum Modalı */}
      <YorumModal
        soru={yorumModalSoru}
        gorünür={yorumModalSoru !== null}
        onKapat={() => setYorumModalSoru(null)}
        user={user}
      />
    </SafeAreaView>
  );
}

const cozStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.md, maxHeight: '90%',
    borderWidth: 1, borderColor: Colors.border,
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  dersChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  dersText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  zorlukBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  zorlukText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  soruMetin: { fontSize: FontSize.base, color: Colors.textPrimary, lineHeight: 26, fontWeight: FontWeight.medium, marginBottom: Spacing.md },
  sik: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.md, padding: 12, marginBottom: 8,
    borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: Colors.bgCardAlt,
  },
  sikSecili: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  sikDogru: { borderColor: Colors.success, backgroundColor: Colors.success + '15' },
  sikYanlis: { borderColor: Colors.error, backgroundColor: Colors.error + '15' },
  sikLabel: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.bgSurface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  sikLabelText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sikMetni: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 },
  aciklama: {
    backgroundColor: Colors.primary + '15', borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '30', marginTop: Spacing.sm,
  },
  aciklamaHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  aciklamaBaslik: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  aciklamaMetin: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22 },
  kazanimChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm,
    backgroundColor: Colors.gold + '15', borderRadius: Radius.md, padding: 6,
  },
  kazanimText: { fontSize: 10, color: Colors.gold, flex: 1 },
  altBtn: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, backgroundColor: Colors.bgCard },
  cevapBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 15, alignItems: 'center' },
  cevapBtnDisabled: { backgroundColor: Colors.bgCardAlt, borderWidth: 1, borderColor: Colors.border },
  cevapBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
  },
  headerSol: { flex: 1 },
  baslik: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  altBaslik: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  headerBtnler: { flexDirection: 'row', gap: Spacing.sm },
  headerIconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },

  // Arama
  aramaWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  aramaInput: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary },

  // Filtre
  filtreWrap: { borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: Spacing.sm },
  filtreScroll: { paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.sm },
  filtreChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  filtreChipAktif: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filtreText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  filtreTextAktif: { color: '#fff', fontWeight: FontWeight.bold },

  // Liste
  listeContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  // Boş hal
  yukleniyorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  yukleniyorText: { fontSize: FontSize.base, color: Colors.textSecondary },
  bosHal: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md, gap: Spacing.md },
  bosBaslik: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  bosAciklama: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  bosAlt: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },

  // Soru kartı
  soruKart: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  soruKartHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.sm },
  yazarWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  yazarAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  yazarAvatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  yazarAd: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  soruTarih: { fontSize: FontSize.xs, color: Colors.textMuted },
  soruMetaBadgeler: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  zorlukBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  zorlukText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  cozulduBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.success + '20', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3,
  },
  cozulduText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.bold },
  dersChip: {
    alignSelf: 'flex-start', backgroundColor: Colors.primary + '15',
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.primary + '30', marginBottom: Spacing.sm,
  },
  dersText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  soruMetin: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22, marginBottom: Spacing.sm },
  sikOzet: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md, padding: Spacing.sm,
    marginBottom: Spacing.sm, gap: 4, borderWidth: 1, borderColor: Colors.border,
  },
  sikOzetText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  sikOzetMore: { fontSize: FontSize.xs, color: Colors.textMuted, fontStyle: 'italic' },
  kazanimChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.gold + '12', borderRadius: Radius.md,
    paddingHorizontal: 8, paddingVertical: 5, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.gold + '25',
  },
  kazanimText: { fontSize: 10, color: Colors.gold, flex: 1, fontWeight: FontWeight.semibold },
  soruAltRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm,
  },
  soruAltBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 2 },
  soruAltBtnText: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium },
  cozBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto',
    backgroundColor: Colors.primary + '15', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  cozBtnText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold },
});
