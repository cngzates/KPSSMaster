// AI Koç Servisi - Mock Implementation
import { KATEGORILER } from '@/constants/data';

export interface AIAnaliz {
  zayifKonular: { ders: string; konu: string; oneri: string }[];
  gucluKonular: string[];
  gunlukOneri: string;
  hedefSkor: number;
}

export function aiAnalizUret(dogruSayisi: number, yanlisSayisi: number): AIAnaliz {
  const toplamSoru = dogruSayisi + yanlisSayisi;
  const basariYuzdesi = toplamSoru > 0 ? Math.round((dogruSayisi / toplamSoru) * 100) : 0;

  return {
    zayifKonular: [
      {
        ders: 'Matematik',
        konu: 'Problemler',
        oneri: 'Problemler konusunda eksiksin. Günde 10 kolay problem çözmeni tavsiye ederim.',
      },
      {
        ders: 'Tarih',
        konu: 'İnkılap Tarihi',
        oneri: 'İnkılap Tarihi sorularında hata oranın yüksek. Kronolojik çalışmayı dene.',
      },
    ],
    gucluKonular: ['Türkçe - Kelime Anlamı', 'Vatandaşlık - Anayasa'],
    gunlukOneri:
      basariYuzdesi >= 70
        ? 'Harika gidiyorsun! Bugün zor sorulara odaklan ve 25 soru hedefle.'
        : 'Temel konuları pekiştirmeye devam et. Bugün 15 orta zorluk soru çöz.',
    hedefSkor: Math.min(basariYuzdesi + 10, 100),
  };
}

export function kisiselTestSorulariOner(kategoriId?: string): string {
  const kategori = KATEGORILER.find(k => k.id === kategoriId);
  if (kategori) {
    return `${kategori.ad} kategorisinde %${kategori.basariYuzdesi} başarın var. Eksik konuları kapatmak için özel test oluşturuldu.`;
  }
  return 'Zayıf olduğun konulara göre özel bir test hazırlandı. Başarılar!';
}
