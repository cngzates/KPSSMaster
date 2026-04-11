// KPSS Master - Mock Data

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
    ders: 'Genel Yetenek',
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
    ],
  },
  {
    id: 'matematik',
    ad: 'Matematik',
    ders: 'Genel Yetenek',
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
    ],
  },
  {
    id: 'tarih',
    ad: 'Tarih',
    ders: 'Genel Kültür',
    emoji: '🏛️',
    renk: '#FF9F1C',
    basariYuzdesi: 44,
    cozulenSoru: 88,
    toplamSoru: 200,
    konular: [
      { id: 'inkılap', ad: 'İnkılap Tarihi', basariYuzdesi: 40, cozulenSoru: 45, zorluk: 'Zor' },
      { id: 'osmanli', ad: 'Osmanlı Tarihi', basariYuzdesi: 48, cozulenSoru: 30, zorluk: 'Orta' },
      { id: 'ataturk', ad: 'Atatürk İlkeleri', basariYuzdesi: 55, cozulenSoru: 13, zorluk: 'Kolay' },
    ],
  },
  {
    id: 'cografya',
    ad: 'Coğrafya',
    ders: 'Genel Kültür',
    emoji: '🗺️',
    renk: '#06D6A0',
    basariYuzdesi: 61,
    cozulenSoru: 73,
    toplamSoru: 120,
    konular: [
      { id: 'fiziki', ad: 'Fiziki Coğrafya', basariYuzdesi: 65, cozulenSoru: 38, zorluk: 'Orta' },
      { id: 'beşeri', ad: 'Beşeri Coğrafya', basariYuzdesi: 58, cozulenSoru: 35, zorluk: 'Orta' },
    ],
  },
  {
    id: 'vatandaslik',
    ad: 'Vatandaşlık',
    ders: 'Genel Kültür',
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
    ders: 'Genel Kültür',
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

export const SORULAR: Soru[] = [
  // Türkçe Soruları
  {
    id: 'q1',
    kategori: 'turkce',
    ders: 'Genel Yetenek',
    konu: 'Paragraf Soruları',
    soru: 'Aşağıdaki cümlelerin hangisinde altı çizili sözcük, cümlede özne görevindedir?',
    siklar: [
      'A) Bugün hava çok güzeldi.',
      'B) Kitabı raftan aldım.',
      'C) Arkadaşım bana bir hediye verdi.',
      'D) Annem sofrayı kurdu.',
      'E) Çocuklar bahçede oynuyor.',
    ],
    dogru_cevap: 'E',
    aciklama: 'Özne, cümlede eylemi gerçekleştiren kişi ya da varlıktır. "Çocuklar" sözcüğü "oynuyor" eylemini gerçekleştiren öznedir. Diğer seçeneklerde altı çizili sözcük özne değil, farklı görevlerdedir.',
    zorluk: 'Orta',
  },
  {
    id: 'q2',
    kategori: 'turkce',
    ders: 'Genel Yetenek',
    konu: 'Kelime Anlamı',
    soru: '"Muvazaa" kelimesinin Türkçe karşılığı aşağıdakilerden hangisidir?',
    siklar: [
      'A) Anlaşmazlık',
      'B) Danışıklı dövüş',
      'C) Sözleşme',
      'D) Hile',
      'E) İtiraz',
    ],
    dogru_cevap: 'B',
    aciklama: '"Muvazaa" hukuk terimi olarak iki tarafın aralarında gizli bir anlaşma yaparak üçüncü şahısları aldatmak amacıyla görünürde yaptıkları işlemi ifade eder. Türkçedeki karşılığı "danışıklı dövüş"tür.',
    zorluk: 'Zor',
  },
  {
    id: 'q3',
    kategori: 'matematik',
    ders: 'Genel Yetenek',
    konu: 'Problemler',
    soru: 'Bir mağazada ilk gün 120, ikinci gün birinci günün 1/3\'ü kadar ürün satılıyor. İki günde toplam kaç ürün satılmıştır?',
    siklar: [
      'A) 140',
      'B) 150',
      'C) 160',
      'D) 170',
      'E) 180',
    ],
    dogru_cevap: 'C',
    aciklama: 'İlk gün 120 ürün, ikinci gün 120 × (1/3) = 40 ürün satılmıştır. Toplam: 120 + 40 = 160 ürün.',
    zorluk: 'Kolay',
  },
  {
    id: 'q4',
    kategori: 'matematik',
    ders: 'Genel Yetenek',
    konu: 'Oran Orantı',
    soru: '3 işçi bir işi 12 günde bitiriyorsa, 4 işçi aynı işi kaç günde bitirir?',
    siklar: [
      'A) 6',
      'B) 7',
      'C) 8',
      'D) 9',
      'E) 10',
    ],
    dogru_cevap: 'D',
    aciklama: 'Ters orantı kullanılır: 3 × 12 = 4 × x → 36 = 4x → x = 9 gün.',
    zorluk: 'Orta',
  },
  {
    id: 'q5',
    kategori: 'tarih',
    ders: 'Genel Kültür',
    konu: 'İnkılap Tarihi',
    soru: 'Türkiye\'de çok partili sisteme geçişin ilk denemesi olan Terakkiperver Cumhuriyet Fırkası hangi yılda kurulmuştur?',
    siklar: [
      'A) 1923',
      'B) 1924',
      'C) 1925',
      'D) 1926',
      'E) 1927',
    ],
    dogru_cevap: 'B',
    aciklama: 'Terakkiperver Cumhuriyet Fırkası, 17 Kasım 1924\'te kurulmuş; ancak Şeyh Said İsyanı\'nın patlak vermesinin ardından 1925\'te kapatılmıştır. Bu parti, Türkiye\'nin ilk muhalefet partisi olarak tarihe geçmiştir.',
    zorluk: 'Orta',
  },
  {
    id: 'q6',
    kategori: 'tarih',
    ders: 'Genel Kültür',
    konu: 'Atatürk İlkeleri',
    soru: 'Aşağıdakilerden hangisi Atatürk\'ün "Devletçilik" ilkesini en iyi tanımlar?',
    siklar: [
      'A) Özel sektörün tamamen yasaklanması',
      'B) Devletin ekonomiye müdahalesinin sıfıra indirilmesi',
      'C) Özel teşebbüsün yetersiz kaldığı alanlarda devletin ekonomik faaliyette bulunması',
      'D) Tüm fabrikaların devlet eliyle kurulması',
      'E) Yabancı sermayenin ülkeye davet edilmesi',
    ],
    dogru_cevap: 'C',
    aciklama: 'Devletçilik ilkesi, özel sektörün giremediği veya giremeyeceği alanlarda devletin ekonomik faaliyetlere katılmasını öngörür. Bu ilke, tam anlamıyla devlet sosyalizmi ya da liberalizm değil; karma bir ekonomik anlayışı yansıtır.',
    zorluk: 'Orta',
  },
  {
    id: 'q7',
    kategori: 'vatandaslik',
    ders: 'Genel Kültür',
    konu: 'Anayasa Hukuku',
    soru: '1982 Anayasasına göre temel hak ve özgürlükler hangi hallerde sınırlandırılabilir?',
    siklar: [
      'A) Yalnızca olağanüstü dönemlerde',
      'B) Anayasanın ilgili maddelerindeki özel sebeplerle ve kanunla',
      'C) Cumhurbaşkanı kararnamesiyle her zaman',
      'D) Bakanlar Kurulu kararıyla',
      'E) Hiçbir şekilde sınırlandırılamaz',
    ],
    dogru_cevap: 'B',
    aciklama: 'Anayasa\'nın 13. maddesi uyarınca temel hak ve özgürlükler, özlerine dokunulmaksızın yalnızca Anayasa\'nın ilgili maddelerinde belirtilen sebeplere bağlı olarak ve ancak kanunla sınırlandırılabilir.',
    zorluk: 'Zor',
  },
  {
    id: 'q8',
    kategori: 'cografya',
    ders: 'Genel Kültür',
    konu: 'Fiziki Coğrafya',
    soru: 'Türkiye\'nin en yüksek dağı aşağıdakilerden hangisidir?',
    siklar: [
      'A) Erciyes Dağı',
      'B) Kaçkar Dağı',
      'C) Ağrı Dağı',
      'D) Süphan Dağı',
      'E) Uludağ',
    ],
    dogru_cevap: 'C',
    aciklama: 'Ağrı Dağı, 5.137 metre yüksekliğiyle Türkiye\'nin en yüksek noktasıdır. Doğu Anadolu\'da yer alan bu sönmüş volkanik dağ, aynı zamanda Türkiye\'nin simgelerinden biridir.',
    zorluk: 'Kolay',
  },
  {
    id: 'q9',
    kategori: 'turkce',
    ders: 'Genel Yetenek',
    konu: 'Deyim ve Atasözleri',
    soru: '"Bir elin nesi var, iki elin sesi var." atasözü hangi anlama gelir?',
    siklar: [
      'A) Yalnız çalışmak daha verimlidir.',
      'B) Birliktelik güç ve başarı getirir.',
      'C) İki el, birinden daha zararlı olabilir.',
      'D) Sesini yükseltmek sorunu çözmez.',
      'E) El emeği göz nuru.',
    ],
    dogru_cevap: 'B',
    aciklama: 'Bu atasözü, birlikte hareket etmenin, iş birliği yapmanın gücünü anlatır. Tek başına yapılamayan işler, birlikte kolayca başarılabilir.',
    zorluk: 'Kolay',
  },
  {
    id: 'q10',
    kategori: 'matematik',
    ders: 'Genel Yetenek',
    konu: 'Sayı Sistemleri',
    soru: 'Art arda gelen üç tek sayının toplamı 63 ise bu sayıların en büyüğü kaçtır?',
    siklar: [
      'A) 21',
      'B) 22',
      'C) 23',
      'D) 24',
      'E) 25',
    ],
    dogru_cevap: 'C',
    aciklama: 'Art arda gelen üç tek sayıyı n-2, n, n+2 olarak yazarsak: (n-2)+n+(n+2)=63 → 3n=63 → n=21. En büyük sayı: n+2=23.',
    zorluk: 'Orta',
  },
];

export const ROZETLER = [
  { id: 'ilk_soru', ad: 'İlk Soru', aciklama: 'İlk soruyu çözdün!', emoji: '🎯', kazanildi: true },
  { id: 'on_dogru', ad: '10 Doğru Seri', aciklama: '10 soruyu üst üste doğru cevapla', emoji: '🔥', kazanildi: false },
  { id: 'yedi_gun', ad: '7 Günlük Seri', aciklama: '7 gün üst üste çalış', emoji: '📅', kazanildi: false },
  { id: 'konu_ustasi', ad: 'Konu Ustası', aciklama: 'Bir konuda %90 başarı yakala', emoji: '👑', kazanildi: false },
];

export const GUNLUK_HEDEF = 20;
