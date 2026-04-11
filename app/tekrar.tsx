import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { yaziAnaliz } from '@/services/learningService';

type Durum = 'yazma' | 'analiz_ediliyor' | 'sonuc';

interface AnalizSonuc {
  puan: number;
  dogru_noktalar: string[];
  eksikler: string[];
  oneri: string;
}

export default function Tekrar() {
  const router = useRouter();
  const { konuAd, ders } = useLocalSearchParams<{ konuAd: string; ders: string }>();

  const [metin, setMetin] = useState('');
  const [durum, setDurum] = useState<Durum>('yazma');
  const [sonuc, setSonuc] = useState<AnalizSonuc | null>(null);

  const analizEt = async () => {
    if (metin.trim().length < 20) return;
    setDurum('analiz_ediliyor');

    const sonucData = await yaziAnaliz(konuAd || '', metin);
    if (sonucData) {
      setSonuc(sonucData);
      setDurum('sonuc');
    } else {
      setSonuc({
        puan: 70,
        dogru_noktalar: ['İyi bir başlangıç yaptın'],
        eksikler: ['Daha detaylı açıklama gerekebilir'],
        oneri: 'Konuyu biraz daha detaylı açıklamayı dene.',
      });
      setDurum('sonuc');
    }
  };

  const puanRengi = (puan: number) => {
    if (puan >= 75) return Colors.success;
    if (puan >= 50) return Colors.warning;
    return Colors.error;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.geriBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.headerBaslik}>Tekrar & Yazma</Text>
          <Text style={styles.headerAlt}>{konuAd}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {durum === 'yazma' && (
            <>
              {/* Yönerge */}
              <View style={styles.yonergeKart}>
                <MaterialIcons name="edit-note" size={28} color={Colors.warning} />
                <View style={styles.yonergeBilgi}>
                  <Text style={styles.yonergeBaslik}>Ne Öğrendin?</Text>
                  <Text style={styles.yonergeAciklama}>
                    {konuAd} konusunda öğrendiklerini kendi cümlelerinle açıkla. AI analiz edecek.
                  </Text>
                </View>
              </View>

              {/* İpuçları */}
              <View style={styles.ipucuWrap}>
                {[
                  'Ana kavramları açıkla',
                  'Kendi örneklerini ver',
                  'KPSS\'de nasıl çıkar yaz',
                ].map((ipucu, i) => (
                  <View key={i} style={styles.ipucu}>
                    <MaterialIcons name="tips-and-updates" size={14} color={Colors.primary} />
                    <Text style={styles.ipucuText}>{ipucu}</Text>
                  </View>
                ))}
              </View>

              {/* Yazma Alanı */}
              <TextInput
                style={styles.textArea}
                placeholder={`${konuAd} konusunda öğrendiklerimi şöyle özetleyebilirim...`}
                placeholderTextColor={Colors.textMuted}
                value={metin}
                onChangeText={setMetin}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />

              <Text style={styles.karakterSayac}>
                {metin.length} karakter {metin.length < 20 ? '(en az 20)' : '✓'}
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.analizBtn,
                  metin.trim().length < 20 && styles.disabled,
                  pressed && { opacity: 0.85 }
                ]}
                onPress={analizEt}
                disabled={metin.trim().length < 20}
              >
                <MaterialIcons name="auto-awesome" size={20} color="#fff" />
                <Text style={styles.analizBtnText}>AI ile Analiz Et</Text>
              </Pressable>
            </>
          )}

          {durum === 'analiz_ediliyor' && (
            <View style={styles.yukleniyorWrap}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.yukleniyorBaslik}>AI Analiz Ediyor...</Text>
              <Text style={styles.yukleniyorAlt}>Eksiklerini ve doğrularını belirliyor</Text>
            </View>
          )}

          {durum === 'sonuc' && sonuc && (
            <>
              {/* Puan Dairesi */}
              <View style={styles.puanWrap}>
                <View style={[styles.puanCircle, { borderColor: puanRengi(sonuc.puan) }]}>
                  <Text style={[styles.puanText, { color: puanRengi(sonuc.puan) }]}>
                    {sonuc.puan}
                  </Text>
                  <Text style={styles.puanLabel}>/ 100</Text>
                </View>
                <Text style={styles.puanAciklama}>
                  {sonuc.puan >= 75 ? 'Harika bir özet!' : sonuc.puan >= 50 ? 'İyi bir başlangıç!' : 'Daha fazla çalış!'}
                </Text>
              </View>

              {/* Doğru Noktalar */}
              {sonuc.dogru_noktalar.length > 0 && (
                <View style={styles.bolum}>
                  <Text style={[styles.bolumBaslik, { color: Colors.success }]}>
                    ✅ Doğru Noktalar
                  </Text>
                  {sonuc.dogru_noktalar.map((n, i) => (
                    <View key={i} style={[styles.liste, { borderColor: Colors.success + '30' }]}>
                      <MaterialIcons name="check-circle" size={16} color={Colors.success} />
                      <Text style={styles.listeText}>{n}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Eksikler */}
              {sonuc.eksikler.length > 0 && (
                <View style={styles.bolum}>
                  <Text style={[styles.bolumBaslik, { color: Colors.error }]}>
                    ⚠️ Eksikler
                  </Text>
                  {sonuc.eksikler.map((e, i) => (
                    <View key={i} style={[styles.liste, { borderColor: Colors.error + '30' }]}>
                      <MaterialIcons name="warning" size={16} color={Colors.error} />
                      <Text style={styles.listeText}>{e}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* AI Öneri */}
              <View style={styles.oneriKart}>
                <MaterialIcons name="auto-awesome" size={18} color={Colors.primary} />
                <Text style={styles.oneriText}>{sonuc.oneri}</Text>
              </View>

              {/* Aksiyonlar */}
              <View style={styles.aksiyon}>
                <Pressable
                  style={({ pressed }) => [styles.tekrarBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => { setMetin(''); setDurum('yazma'); setSonuc(null); }}
                >
                  <MaterialIcons name="refresh" size={18} color={Colors.primary} />
                  <Text style={styles.tekrarBtnText}>Tekrar Yaz</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.devamBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => router.back()}
                >
                  <Text style={styles.devamBtnText}>Döngüye Dön</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  geriBtn: { padding: 4 },
  headerBaslik: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerAlt: { fontSize: FontSize.xs, color: Colors.textMuted },
  scrollContent: { padding: Spacing.md, gap: Spacing.md, flexGrow: 1 },
  yonergeKart: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    backgroundColor: Colors.warning + '15', borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.warning + '30',
  },
  yonergeBilgi: { flex: 1 },
  yonergeBaslik: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.warning, marginBottom: 4 },
  yonergeAciklama: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  ipucuWrap: { gap: 6 },
  ipucu: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ipucuText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  textArea: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    color: Colors.textPrimary, fontSize: FontSize.sm, lineHeight: 22,
    borderWidth: 1.5, borderColor: Colors.border, minHeight: 160,
  },
  karakterSayac: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right' },
  analizBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.warning, borderRadius: Radius.lg,
    paddingVertical: 16, gap: Spacing.sm,
  },
  analizBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textInverse },
  disabled: { opacity: 0.45 },
  yukleniyorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  yukleniyorBaslik: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  yukleniyorAlt: { fontSize: FontSize.sm, color: Colors.textSecondary },
  puanWrap: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  puanCircle: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 5, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bgCard,
  },
  puanText: { fontSize: 42, fontWeight: FontWeight.extrabold },
  puanLabel: { fontSize: FontSize.sm, color: Colors.textMuted },
  puanAciklama: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  bolum: { gap: Spacing.sm },
  bolumBaslik: { fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: 4 },
  liste: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.sm + 2,
    borderWidth: 1,
  },
  listeText: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 18 },
  oneriKart: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.primary + '15', borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '30',
  },
  oneriText: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 18 },
  aksiyon: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  tekrarBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.lg, paddingVertical: 14, gap: 6,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  tekrarBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  devamBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, gap: 6,
  },
  devamBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
});
