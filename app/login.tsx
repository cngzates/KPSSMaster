import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useAuth, useAlert } from '@/template';

type Mod = 'secim' | 'giris' | 'kayit' | 'otp';

export default function LoginEkrani() {
  const { signInWithPassword, signUpWithPassword, sendOTP, verifyOTPAndLogin, operationLoading } = useAuth();
  const { showAlert } = useAlert();

  const [mod, setMod] = useState<Mod>('secim');
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreTekrar, setSifreTekrar] = useState('');
  const [otp, setOtp] = useState('');
  const [otpGonderildi, setOtpGonderildi] = useState(false);
  const [sifreGoster, setSifreGoster] = useState(false);

  const handleGiris = async () => {
    if (!email.trim() || !sifre.trim()) {
      showAlert('Hata', 'Email ve şifre zorunludur.');
      return;
    }
    const { error } = await signInWithPassword(email.trim(), sifre);
    if (error) showAlert('Giriş Hatası', error);
  };

  const handleOtpGonder = async () => {
    if (!email.trim()) {
      showAlert('Hata', 'Geçerli bir email adresi gir.');
      return;
    }
    if (sifre.length < 6) {
      showAlert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (sifre !== sifreTekrar) {
      showAlert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }
    const { error } = await sendOTP(email.trim());
    if (error) {
      showAlert('Hata', error);
      return;
    }
    setOtpGonderildi(true);
    setMod('otp');
    showAlert('Kod Gönderildi', `${email} adresine 4 haneli doğrulama kodu gönderildi.`);
  };

  const handleKayitTamamla = async () => {
    if (!otp.trim()) {
      showAlert('Hata', 'Doğrulama kodunu gir.');
      return;
    }
    const { error } = await verifyOTPAndLogin(email.trim(), otp.trim(), { password: sifre });
    if (error) showAlert('Kayıt Hatası', error);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Image
              source={require('@/assets/images/hero-onboarding.png')}
              style={styles.heroImage}
              contentFit="cover"
            />
            <View style={styles.heroOverlay}>
              <Text style={styles.appAd}>KPSS Master</Text>
              <Text style={styles.appSlogan}>AI destekli KPSS hazırlık sistemi</Text>
            </View>
          </View>

          {/* İçerik */}
          <View style={styles.icerik}>

            {/* Mod: Seçim */}
            {mod === 'secim' && (
              <>
                <Text style={styles.baslik}>Başlamak için giriş yap</Text>
                <Text style={styles.altBaslik}>Çalışma geçmişini kaydet, AI önerileri al</Text>
                <Pressable
                  style={({ pressed }) => [styles.anaBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => setMod('giris')}
                >
                  <MaterialIcons name="login" size={20} color="#fff" />
                  <Text style={styles.anaBtnText}>Giriş Yap</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.ikinciBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => setMod('kayit')}
                >
                  <MaterialIcons name="person-add" size={20} color={Colors.primary} />
                  <Text style={styles.ikinciBtnText}>Yeni Hesap Oluştur</Text>
                </Pressable>
              </>
            )}

            {/* Mod: Giriş Yap */}
            {mod === 'giris' && (
              <>
                <Text style={styles.baslik}>Tekrar hoş geldin!</Text>
                <Text style={styles.altBaslik}>Email ve şifrenle giriş yap</Text>

                <View style={styles.inputGrup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <View style={styles.inputWrap}>
                    <MaterialIcons name="email" size={18} color={Colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="ornek@email.com"
                      placeholderTextColor={Colors.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGrup}>
                  <Text style={styles.inputLabel}>Şifre</Text>
                  <View style={styles.inputWrap}>
                    <MaterialIcons name="lock" size={18} color={Colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="Şifren"
                      placeholderTextColor={Colors.textMuted}
                      value={sifre}
                      onChangeText={setSifre}
                      secureTextEntry={!sifreGoster}
                    />
                    <Pressable onPress={() => setSifreGoster(p => !p)}>
                      <MaterialIcons
                        name={sifreGoster ? 'visibility-off' : 'visibility'}
                        size={18}
                        color={Colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.anaBtn, operationLoading && styles.anaBtnDisabled, pressed && !operationLoading && { opacity: 0.85 }]}
                  onPress={handleGiris}
                  disabled={operationLoading}
                >
                  <Text style={styles.anaBtnText}>{operationLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}</Text>
                </Pressable>

                <Pressable style={styles.geriBtn} onPress={() => setMod('secim')}>
                  <MaterialIcons name="arrow-back" size={16} color={Colors.textSecondary} />
                  <Text style={styles.geriBtnText}>Geri Dön</Text>
                </Pressable>
              </>
            )}

            {/* Mod: Kayıt Ol */}
            {mod === 'kayit' && !otpGonderildi && (
              <>
                <Text style={styles.baslik}>Hesap Oluştur</Text>
                <Text style={styles.altBaslik}>Email doğrulamasıyla güvenli kayıt</Text>

                <View style={styles.inputGrup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <View style={styles.inputWrap}>
                    <MaterialIcons name="email" size={18} color={Colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="ornek@email.com"
                      placeholderTextColor={Colors.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGrup}>
                  <Text style={styles.inputLabel}>Şifre</Text>
                  <View style={styles.inputWrap}>
                    <MaterialIcons name="lock" size={18} color={Colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="En az 6 karakter"
                      placeholderTextColor={Colors.textMuted}
                      value={sifre}
                      onChangeText={setSifre}
                      secureTextEntry={!sifreGoster}
                    />
                    <Pressable onPress={() => setSifreGoster(p => !p)}>
                      <MaterialIcons
                        name={sifreGoster ? 'visibility-off' : 'visibility'}
                        size={18}
                        color={Colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.inputGrup}>
                  <Text style={styles.inputLabel}>Şifre Tekrar</Text>
                  <View style={styles.inputWrap}>
                    <MaterialIcons name="lock-outline" size={18} color={Colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="Şifreni tekrar gir"
                      placeholderTextColor={Colors.textMuted}
                      value={sifreTekrar}
                      onChangeText={setSifreTekrar}
                      secureTextEntry={!sifreGoster}
                    />
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.anaBtn, operationLoading && styles.anaBtnDisabled, pressed && !operationLoading && { opacity: 0.85 }]}
                  onPress={handleOtpGonder}
                  disabled={operationLoading}
                >
                  <Text style={styles.anaBtnText}>{operationLoading ? 'Kod gönderiliyor...' : 'Doğrulama Kodu Gönder'}</Text>
                </Pressable>

                <Pressable style={styles.geriBtn} onPress={() => setMod('secim')}>
                  <MaterialIcons name="arrow-back" size={16} color={Colors.textSecondary} />
                  <Text style={styles.geriBtnText}>Geri Dön</Text>
                </Pressable>
              </>
            )}

            {/* Mod: OTP Doğrulama */}
            {mod === 'otp' && (
              <>
                <View style={styles.otpIconWrap}>
                  <MaterialIcons name="mark-email-read" size={48} color={Colors.primary} />
                </View>
                <Text style={styles.baslik}>Email Doğrulama</Text>
                <Text style={styles.altBaslik}>{email} adresine gönderilen 4 haneli kodu gir</Text>

                <View style={styles.inputGrup}>
                  <Text style={styles.inputLabel}>Doğrulama Kodu</Text>
                  <View style={[styles.inputWrap, styles.otpInput]}>
                    <MaterialIcons name="vpn-key" size={18} color={Colors.textMuted} />
                    <TextInput
                      style={[styles.input, styles.otpText]}
                      placeholder="0000"
                      placeholderTextColor={Colors.textMuted}
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.anaBtn, operationLoading && styles.anaBtnDisabled, pressed && !operationLoading && { opacity: 0.85 }]}
                  onPress={handleKayitTamamla}
                  disabled={operationLoading}
                >
                  <Text style={styles.anaBtnText}>{operationLoading ? 'Hesap oluşturuluyor...' : 'Hesabı Onayla'}</Text>
                </Pressable>

                <Pressable style={styles.geriBtn} onPress={() => { setMod('kayit'); setOtpGonderildi(false); setOtp(''); }}>
                  <MaterialIcons name="arrow-back" size={16} color={Colors.textSecondary} />
                  <Text style={styles.geriBtnText}>Geri Dön</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { flexGrow: 1 },
  hero: { height: 260, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: 'rgba(13,15,28,0.65)',
  },
  appAd: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.extrabold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  appSlogan: {
    fontSize: FontSize.sm,
    color: Colors.primaryLight,
    marginTop: 4,
  },
  icerik: {
    flex: 1,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  baslik: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  altBaslik: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  inputGrup: { marginBottom: Spacing.md },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 52,
    color: Colors.textPrimary,
    fontSize: FontSize.base,
  },
  otpInput: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  otpText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: 8,
    textAlign: 'center',
  },
  otpIconWrap: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  anaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  anaBtnDisabled: { opacity: 0.5 },
  anaBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  ikinciBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '18',
    borderRadius: Radius.lg,
    paddingVertical: 16,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary + '50',
  },
  ikinciBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  geriBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: Spacing.xs,
  },
  geriBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
