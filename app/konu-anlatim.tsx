import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { konuAnlat, konuBasitlesir, ornekVer, tekrarAnlat, chatMesaj } from '@/services/learningService';

interface Mesaj {
  id: string;
  rol: 'ai' | 'kullanici';
  icerik: string;
  yukleniyor?: boolean;
}

const HIZLI_AKSIYONLAR = [
  { id: 'basitlestir', label: 'Basitleştir', ikon: 'lightbulb-outline' as const },
  { id: 'ornek', label: 'Örnek Ver', ikon: 'code' as const },
  { id: 'tekrar', label: 'Tekrar Anlat', ikon: 'refresh' as const },
];

export default function KonuAnlatim() {
  const router = useRouter();
  const { konuAd, ders } = useLocalSearchParams<{ konuAd: string; ders: string }>();

  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [yazilan, setYazilan] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [baslangicYukleniyor, setBaslangicYukleniyor] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    ilkAnlatimYukle();
  }, []);

  const ilkAnlatimYukle = async () => {
    setBaslangicYukleniyor(true);
    const yuklemeId = Date.now().toString();
    setMesajlar([{ id: yuklemeId, rol: 'ai', icerik: '', yukleniyor: true }]);

    const yanit = await konuAnlat(konuAd || '', ders || '');
    setMesajlar([{
      id: yuklemeId,
      rol: 'ai',
      icerik: yanit.error
        ? `Üzgünüm, şu an bağlanamıyorum. Lütfen tekrar dene.\n\nHata: ${yanit.error}`
        : yanit.content,
    }]);
    setBaslangicYukleniyor(false);
    scrollAlt();
  };

  const mesajEkle = (mesaj: Mesaj) => {
    setMesajlar(prev => [...prev, mesaj]);
    setTimeout(scrollAlt, 100);
  };

  const scrollAlt = () => scrollRef.current?.scrollToEnd({ animated: true });

  const hizliAksiyon = async (aksiyonId: string) => {
    if (yukleniyor) return;
    setYukleniyor(true);

    const id = Date.now().toString();
    const yuklemeMsg: Mesaj = { id, rol: 'ai', icerik: '', yukleniyor: true };
    setMesajlar(prev => [...prev, yuklemeMsg]);
    scrollAlt();

    let yanit;
    if (aksiyonId === 'basitlestir') yanit = await konuBasitlesir(konuAd || '', ders || '');
    else if (aksiyonId === 'ornek') yanit = await ornekVer(konuAd || '', ders || '');
    else yanit = await tekrarAnlat(konuAd || '', ders || '');

    setMesajlar(prev => prev.map(m =>
      m.id === id ? { ...m, icerik: yanit!.content || yanit!.error || '', yukleniyor: false } : m
    ));
    setYukleniyor(false);
    scrollAlt();
  };

  const mesajGonder = async () => {
    if (!yazilan.trim() || yukleniyor) return;
    const kullaniciMsj = yazilan.trim();
    setYazilan('');
    setYukleniyor(true);

    const kulMsgId = Date.now().toString();
    mesajEkle({ id: kulMsgId, rol: 'kullanici', icerik: kullaniciMsj });

    const gecmis = mesajlar
      .filter(m => !m.yukleniyor)
      .map(m => ({ role: m.rol === 'ai' ? 'assistant' : 'user', content: m.icerik }));

    const aiId = (Date.now() + 1).toString();
    setMesajlar(prev => [...prev, { id: aiId, rol: 'ai', icerik: '', yukleniyor: true }]);
    scrollAlt();

    const yanit = await chatMesaj(konuAd || '', kullaniciMsj, gecmis);
    setMesajlar(prev => prev.map(m =>
      m.id === aiId ? { ...m, icerik: yanit.content || yanit.error || '', yukleniyor: false } : m
    ));
    setYukleniyor(false);
    scrollAlt();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.geriBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerBilgi}>
          <View style={styles.aiDot} />
          <View>
            <Text style={styles.headerBaslik}>AI Koç</Text>
            <Text style={styles.headerAlt}>{konuAd || 'Konu Anlatımı'}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Mesajlar */}
        <ScrollView
          ref={scrollRef}
          style={styles.mesajlar}
          contentContainerStyle={styles.mesajlarContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollAlt}
        >
          {mesajlar.map(mesaj => (
            <View key={mesaj.id} style={[
              styles.mesajWrap,
              mesaj.rol === 'kullanici' ? styles.kullaniciWrap : styles.aiWrap,
            ]}>
              {mesaj.rol === 'ai' && (
                <View style={styles.aiAvatar}>
                  <MaterialIcons name="auto-awesome" size={14} color={Colors.primary} />
                </View>
              )}
              <View style={[
                styles.mesajBalon,
                mesaj.rol === 'kullanici' ? styles.kullaniciBalon : styles.aiBalon,
              ]}>
                {mesaj.yukleniyor ? (
                  <View style={styles.yukleniyorDot}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.yukleniyorText}>Düşünüyor...</Text>
                  </View>
                ) : (
                  <Text style={[
                    styles.mesajText,
                    mesaj.rol === 'kullanici' ? styles.kullaniciText : styles.aiText,
                  ]}>
                    {mesaj.icerik}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Hızlı Aksiyonlar */}
        <View style={styles.hizliWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hizliScrollContent}>
            {HIZLI_AKSIYONLAR.map(aksiyon => (
              <Pressable
                key={aksiyon.id}
                style={({ pressed }) => [styles.hizliBtn, pressed && { opacity: 0.75 }, yukleniyor && styles.disabled]}
                onPress={() => hizliAksiyon(aksiyon.id)}
                disabled={yukleniyor}
              >
                <MaterialIcons name={aksiyon.ikon} size={15} color={Colors.primary} />
                <Text style={styles.hizliBtnText}>{aksiyon.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Input */}
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Soruyu sor..."
            placeholderTextColor={Colors.textMuted}
            value={yazilan}
            onChangeText={setYazilan}
            multiline
            maxLength={500}
          />
          <Pressable
            style={({ pressed }) => [styles.gonderBtn, !yazilan.trim() && styles.disabled, pressed && { opacity: 0.8 }]}
            onPress={mesajGonder}
            disabled={!yazilan.trim() || yukleniyor}
          >
            <MaterialIcons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm,
  },
  geriBtn: { padding: 4 },
  headerBilgi: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  aiDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success,
    shadowColor: Colors.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4,
  },
  headerBaslik: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerAlt: { fontSize: FontSize.xs, color: Colors.textSecondary },
  mesajlar: { flex: 1 },
  mesajlarContent: { padding: Spacing.md, gap: Spacing.md },
  mesajWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs },
  aiWrap: { justifyContent: 'flex-start' },
  kullaniciWrap: { justifyContent: 'flex-end' },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  mesajBalon: { maxWidth: '80%', borderRadius: Radius.lg, padding: Spacing.md },
  aiBalon: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  kullaniciBalon: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  mesajText: { fontSize: FontSize.sm, lineHeight: 20 },
  aiText: { color: Colors.textPrimary },
  kullaniciText: { color: '#fff' },
  yukleniyorDot: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  yukleniyorText: { fontSize: FontSize.xs, color: Colors.textMuted },
  hizliWrap: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  hizliScrollContent: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  hizliBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary + '15', borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  hizliBtnText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  disabled: { opacity: 0.5 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    color: Colors.textPrimary, fontSize: FontSize.sm,
    borderWidth: 1, borderColor: Colors.border, maxHeight: 100, minHeight: 44,
  },
  gonderBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
});
