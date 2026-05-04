// KPSS Master - Sabit Veriler (Mock SORULAR kaldırıldı - AI tarafından üretiliyor)

export interface Soru {
  id: string;
  kategori: string;
  ders: string;
  konu: string;
  soru: string;
  siklar: string[];
  dogru_cevap: string;
  aciklama: string;
  zorluk: 'Kolay' | 'Orta' | 'Zor';
}

export interface Konu {
  id: string;
  ad: string;
  basariYuzdesi: number;
  cozulenSoru: number;
  zorluk: 'Kolay' | 'Orta' | 'Zor';
}

export interface Kategori {
  id: string;
  ad: string;
  ders: string;
  emoji: string;
  renk: string;
  basariYuzdesi: number;
  cozulenSoru: number;
  toplamSoru: number;
  konular: Konu[];
}

export const KATEGORILER: Kategori[] = [
  {
    id: 'turkce',
    ad: 'Türkçe',
    ders: 'Türkçe',
    emoji: '📝',
    renk: '#4361EE',
    basariYuzdesi: 78,
    cozulenSoru: 156,
    toplamSoru: 200,
    konular: [
      { id: 'noktalama', ad: 'Noktalama İşaretleri', basariYuzdesi: 85, cozulenSoru: 40, zorluk: 'Kolay' },
      { id: 'cumle', ad: 'Cümle Bilgisi', basariYuzdesi: 72, cozulenSoru: 55, zorluk: 'Orta' },
      { id: 'paragraf', ad: 'Paragraf Soruları', basariYuzdesi: 68, cozulenSoru: 61, zorluk: 'Zor' },
      { id: 'kelime', ad: 'Kelime Anlamı', basariYuzdesi: 90, cozulenSoru: 30, zorluk: 'Kolay' },
      { id: 'deyim', ad: 'Deyim ve Atasözleri', basariYuzdesi: 75, cozulenSoru: 28, zorluk: 'Orta' },
      { id: 'anlatim', ad: 'Anlatım Bozuklukları', basariYuzdesi: 62, cozulenSoru: 22, zorluk: 'Orta' },
    ],
  },
  {
    id: 'matematik',
    ad: 'Matematik',
    ders: 'Matematik',
    emoji: '🔢',
    renk: '#F72585',
    basariYuzdesi: 52,
    cozulenSoru: 130,
    toplamSoru: 250,
    konular: [
      { id: 'problemler', ad: 'Problemler', basariYuzdesi: 45, cozulenSoru: 50, zorluk: 'Zor' },
      { id: 'oran', ad: 'Oran Orantı', basariYuzdesi: 70, cozulenSoru: 35, zorluk: 'Orta' },
      { id: 'sayi', ad: 'Sayı Sistemleri', basariYuzdesi: 60, cozulenSoru: 20, zorluk: 'Orta' },
      { id: 'kesir', ad: 'Kesirler', basariYuzdesi: 55, cozulenSoru: 25, zorluk: 'Kolay' },
      { id: 'geometri', ad: 'Temel Geometri', basariYuzdesi: 48, cozulenSoru: 18, zorluk: 'Orta' },
      { id: 'olasilik', ad: 'Olasılık', basariYuzdesi: 40, cozulenSoru: 12, zorluk: 'Zor' },
    ],
  },
  {
    id: 'tarih',
    ad: 'Tarih',
    ders: 'Tarih',
    emoji: '🏛️',
    renk: '#FF9F1C',
    basariYuzdesi: 44,
    cozulenSoru: 88,
    toplamSoru: 200,
    konular: [
      { id: 'inkılap', ad: 'İnkılap Tarihi', basariYuzdesi: 40, cozulenSoru: 45, zorluk: 'Zor' },
      { id: 'osmanli', ad: 'Osmanlı Tarihi', basariYuzdesi: 48, cozulenSoru: 30, zorluk: 'Orta' },
      { id: 'ataturk', ad: 'Atatürk İlkeleri', basariYuzdesi: 55, cozulenSoru: 13, zorluk: 'Kolay' },
      { id: 'kurtulusv', ad: 'Kurtuluş Savaşı', basariYuzdesi: 50, cozulenSoru: 20, zorluk: 'Orta' },
    ],
  },
  {
    id: 'cografya',
    ad: 'Coğrafya',
    ders: 'Coğrafya',
    emoji: '🗺️',
    renk: '#06D6A0',
    basariYuzdesi: 61,
    cozulenSoru: 73,
    toplamSoru: 120,
    konular: [
      { id: 'fiziki', ad: 'Fiziki Coğrafya', basariYuzdesi: 65, cozulenSoru: 38, zorluk: 'Orta' },
      { id: 'beseri', ad: 'Beşeri Coğrafya', basariYuzdesi: 58, cozulenSoru: 35, zorluk: 'Orta' },
      { id: 'ekonomik', ad: 'Ekonomik Coğrafya', basariYuzdesi: 55, cozulenSoru: 20, zorluk: 'Orta' },
    ],
  },
  {
    id: 'vatandaslik',
    ad: 'Vatandaşlık',
    ders: 'Vatandaşlık',
    emoji: '⚖️',
    renk: '#4CC9F0',
    basariYuzdesi: 73,
    cozulenSoru: 95,
    toplamSoru: 130,
    konular: [
      { id: 'anayasa', ad: 'Anayasa Hukuku', basariYuzdesi: 80, cozulenSoru: 50, zorluk: 'Orta' },
      { id: 'idare', ad: 'İdare Hukuku', basariYuzdesi: 66, cozulenSoru: 45, zorluk: 'Zor' },
    ],
  },
  {
    id: 'guncel',
    ad: 'Güncel Bilgiler',
    ders: 'Güncel Bilgiler',
    emoji: '📰',
    renk: '#9B5DE5',
    basariYuzdesi: 58,
    cozulenSoru: 45,
    toplamSoru: 80,
    konular: [
      { id: 'turkiye', ad: 'Türkiye Gündemi', basariYuzdesi: 62, cozulenSoru: 25, zorluk: 'Kolay' },
      { id: 'dunya', ad: 'Dünya Gündemi', basariYuzdesi: 54, cozulenSoru: 20, zorluk: 'Orta' },
    ],
  },
];

// SORULAR dizisi kaldırıldı → AI tarafından dinamik üretiliyor (services/learningService.ts - aiSoruUret)

export const ROZETLER = [
  { id: 'ilk_soru', ad: 'İlk Soru', aciklama: 'İlk soruyu çözdün!', emoji: '🎯', kazanildi: true },
  { id: 'on_dogru', ad: '10 Doğru Seri', aciklama: '10 soruyu üst üste doğru cevapla', emoji: '🔥', kazanildi: false },
  { id: 'yedi_gun', ad: '7 Günlük Seri', aciklama: '7 gün üst üste çalış', emoji: '📅', kazanildi: false },
  { id: 'konu_ustasi', ad: 'Konu Ustası', aciklama: 'Bir konuda %90 başarı yakala', emoji: '👑', kazanildi: false },
];

export const GUNLUK_HEDEF = 20;
