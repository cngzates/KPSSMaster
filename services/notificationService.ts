import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Bildirim gösterim ayarı (uygulama açıkken de göster)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// İzin iste
export async function bildirimIzniAl(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status: mevcut } = await Notifications.getPermissionsAsync();
    if (mevcut === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// Tüm zamanlanmış bildirimleri iptal et
export async function tumBildirimleriIptalEt() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}

// Günlük çalışma hatırlatıcısı kur (her gün saat 20:00)
export async function gunlukHatirlaticiKur(saat = 20, dakika = 0) {
  const izin = await bildirimIzniAl();
  if (!izin) return;

  try {
    // Önce mevcut hatırlatıcıları temizle
    const mevcutlar = await Notifications.getAllScheduledNotificationsAsync();
    for (const b of mevcutlar) {
      if (b.content.data?.tip === 'gunluk_hatirlat') {
        await Notifications.cancelScheduledNotificationAsync(b.identifier);
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📚 KPSS Master',
        body: 'Bugün henüz çalışmadın! Serine devam etmek için 5 dakikan yeter.',
        data: { tip: 'gunluk_hatirlat' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: saat,
        minute: dakika,
      },
    });
  } catch (e) {
    console.error('Hatırlatıcı kurulamadı:', e);
  }
}

// Streak milestone bildirimi (anlık)
export async function streakMilestoneBildir(streak: number) {
  const izin = await bildirimIzniAl();
  if (!izin) return;

  const mesajlar: Record<number, { baslik: string; body: string }> = {
    3:  { baslik: '🔥 3 Günlük Seri!', body: 'Harika! 3 gün üst üste çalıştın. Devam et!' },
    7:  { baslik: '🔥 7 Günlük Seri!', body: 'Bir hafta boyunca hiç durmadın! Bu azmini KPSS\'de de göster.' },
    14: { baslik: '🔥 14 Günlük Seri!', body: '2 hafta! Bu kararlılıkla KPSS\'i geçeceksin.' },
    30: { baslik: '🏆 30 Günlük Seri!', body: 'Muhteşem! Tam 1 ay kesintisiz çalıştın. Gerçek bir şampiyon!' },
  };

  const m = mesajlar[streak];
  if (!m) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: m.baslik,
        body: m.body,
        data: { tip: 'streak_milestone', streak },
        sound: true,
      },
      trigger: null, // Anlık
    });
  } catch {}
}

// Seri kırılma uyarısı
export async function seriKirilmaUyarisi(streak: number) {
  if (streak < 3) return;
  const izin = await bildirimIzniAl();
  if (!izin) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Seriniz tehlikede!',
        body: `${streak} günlük serinizi kaybetmemek için bugün en az 1 soru çözün!`,
        data: { tip: 'seri_kirılma_uyarisi' },
        sound: true,
      },
      trigger: null,
    });
  } catch {}
}

// Bildirim dinleyici ekle (uygulama içi)
export function bildirimDinleyiciEkle(
  onBildirim: (bildirim: Notifications.Notification) => void
) {
  const sub = Notifications.addNotificationReceivedListener(onBildirim);
  return () => sub.remove();
}

// Bildirime tıklama dinleyici
export function bildirimTiklaDinleyiciEkle(
  onTikla: (response: Notifications.NotificationResponse) => void
) {
  const sub = Notifications.addNotificationResponseReceivedListener(onTikla);
  return () => sub.remove();
}
