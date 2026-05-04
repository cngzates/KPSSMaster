import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Ders bazlı KPSS odaklı system context ────────────────────────────────
const DERS_CONTEXT: Record<string, string> = {
  'Türkçe': `
KPSS Türkçe sınavında çıkan başlıca konu ve soru tipleri:
- Paragraf soruları (ana düşünce, yardımcı düşünce, başlık, boşluk doldurma)
- Cümle tamamlama / anlatım bozuklukları / anlam bilgisi
- Sözcük türleri (isim, sıfat, zarf, zamir, bağlaç, edat, ünlem, fiil)
- Cümle bilgisi (özne, yüklem, nesne, tümleç, dolaylı tümleç)
- Noktalama ve yazım kuralları
- Deyim ve atasözleri
- Kelime anlamı / eş anlam / zıt anlam / yakın anlam
Sık çıkan yıllar: 2019-2023 arasında paragraf + anlatım bozukluğu en yoğun konular.`,

  'Matematik': `
KPSS Matematik sınavında çıkan başlıca konu ve soru tipleri:
- Dört işlem ve sayı sistemleri
- Kesirler, ondalık sayılar, üslü sayılar, köklü sayılar
- Oran orantı, yüzde, faiz
- Problemler (yaş, hareket, işçi-havuz, karışım, para)
- Mantık ve küme problemleri
- Temel geometri (alan, çevre, hacim)
- Olasılık ve istatistik
Sık çıkan yıllar: 2019-2023 arası oran orantı + problem çözme en yoğun konular.`,

  'Tarih': `
KPSS Tarih sınavında çıkan başlıca konular:
- Osmanlı Devleti kuruluş ve yükseliş dönemi
- Osmanlı gerileme ve çöküş dönemi
- Kurtuluş Savaşı ve Lozan Antlaşması
- Türkiye Cumhuriyeti'nin kuruluşu
- Atatürk dönemi inkılapları (1923-1938)
- Cumhuriyet tarihi (1950 sonrası çok partili dönem)
- Tarih metodolojisi, kronoloji, tarih felsefesi
Sık çıkan yıllar: Atatürk ilkeleri ve inkılapları her yıl %30-40 oranında çıkar.`,

  'Coğrafya': `
KPSS Coğrafya sınavında çıkan başlıca konular:
- Türkiye'nin fiziki coğrafyası (dağlar, ovalar, akarsular, göller)
- Türkiye'nin iklimi ve bitki örtüsü
- Nüfus coğrafyası ve yerleşim
- Ekonomik coğrafya (tarım, hayvancılık, madencilik, sanayi, turizm)
- Türkiye'nin bölgeleri ve şehirleri
- Dünya coğrafyası (kıtalar, ülkeler, iklim kuşakları)
- Harita bilgisi ve kartografya
Sık çıkan yıllar: Fiziki coğrafya + ekonomi coğrafyası ağırlıklı.`,

  'Vatandaşlık': `
KPSS Vatandaşlık (Anayasa + İdare Hukuku) sınavında çıkan konular:
- 1982 Anayasası temel hükümler (Cumhuriyetin nitelikleri, temel ilkeler)
- Temel hak ve özgürlükler (bireysel, sosyal, siyasi haklar)
- Türkiye Büyük Millet Meclisi yapısı ve işleyişi
- Cumhurbaşkanlığı yetkileri
- Yargı organları (Anayasa Mahkemesi, Yargıtay, Danıştay, AİHM)
- İdare hukuku kavramları (idari işlem, idari yaptırım)
- Yerel yönetimler
Sık çıkan yıllar: Anayasa değişiklikleri ve TBMM yapısı ağırlıklı.`,

  'Güncel Bilgiler': `
KPSS Güncel Bilgiler sınavında çıkan konular:
- Türkiye'nin önemli kurumları ve bürokratik yapı
- Uluslararası örgütler (BM, NATO, AB, AGİT, İKÖ)
- Ekonomik büyüklükler ve göstergeler
- Güncel ulusal ve uluslararası gelişmeler
- Ödüller (Nobel, Oscar, Türkiye ödülleri)
- Türkiye'nin imzaladığı uluslararası antlaşmalar
- Teknoloji ve bilim gelişmeleri`,

  'Genel Yetenek': `
KPSS Genel Yetenek sınavı Türkçe + Matematik kombinasyonundan oluşur.
Soru dağılımı: Türkçe %40, Matematik %60.`,

  'Genel Kültür': `
KPSS Genel Kültür sınavı Tarih + Coğrafya + Vatandaşlık + Güncel Bilgiler kombinasyonundan oluşur.
Konulara yaklaşık eşit ağırlık verilir.`,
};

// ─── Zorluk bazlı talimatlar ──────────────────────────────────────────────
const ZORLUK_TALIMATLARI: Record<string, string> = {
  'Kolay': `
- Doğrudan tanım veya temel bilgi sorusu olsun
- Şık yapısı açık, yanıltıcı değil
- Temel kavramları ölçsün
- Cümle yapısı sade ve kısa`,
  'Orta': `
- Kavram analizi ve ilişki kurma gerektirsin
- Yorum ve çıkarım içersin
- En az 1-2 çeldirici şık güçlü olsun
- Gerçek sınav atmosferini yansıtsın`,
  'Zor': `
- Çok adımlı mantık yürütme gerektirsin
- İnce ayrımları ölçsün
- Tüm şıklar makul görünsün, çeldirici güçlü olsun
- ÖSYM'nin en zorlu soru tarzında olsun
- Paragraf varsa uzun ve dikkat gerektirsin`,
};

// ─── Soru üretim prompt builder ───────────────────────────────────────────
function soruUretimPrompt(params: {
  konu: string;
  ders: string;
  kategori?: string;
  zorluk: string;
  soru_sayisi: number;
  kullanici_zayiflari?: string;
}): { system: string; user: string } {
  const dersContext = DERS_CONTEXT[params.ders] || DERS_CONTEXT[params.kategori ?? ''] || '';
  const zorlukTalimat = ZORLUK_TALIMATLARI[params.zorluk] || ZORLUK_TALIMATLARI['Orta'];

  // Karma zorluk dağılımı (5+ soru için otomatik %30-50-20 karışımı)
  let zorlukDagilim = '';
  if (params.soru_sayisi >= 5) {
    const kolay = Math.round(params.soru_sayisi * 0.3);
    const orta = Math.round(params.soru_sayisi * 0.5);
    const zor = params.soru_sayisi - kolay - orta;
    zorlukDagilim = `
SORU DAĞILIMI (ZORUNLU):
- ${kolay} soru: Kolay (doğrudan tanım/temel bilgi)
- ${orta} soru: Orta (yorum/analiz)
- ${zor} soru: Zor (çok adımlı mantık, ince ayrım)
Her sorunun "zorluk" alanını buna göre doldur.`;
  }

  const system = `Sen KPSS uzmanı, deneyimli bir eğitim koçu ve ÖSYM soru analiz uzmanısın.
Görevin: Gerçek KPSS sınavı kalitesinde, ÖSYM mantığına uygun özgün sorular üretmek.

${dersContext}

ZORLUK SEVİYESİ KURALLARI (${params.zorluk}):${zorlukTalimat}

GENEL KURALLAR:
- Tüm içerik Türkçe olacak
- Aynı tip veya aynı konuyu ölçen sorular tekrar etmeyecek
- Her soru ÖSYM'de çıkabilecek gerçekçilikte olacak
- Ezber değil, yorum ve mantık ölçülecek
- Güçlü çeldirici şıklar içerecek
- Açıklama adım adım ve öğretici olacak
- "kazanım" alanı: bu sorunun hangi KPSS kazanımını ölçtüğünü 1 cümleyle yaz

${zorlukDagilim}

SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir metin ekleme, markdown kullanma:
{
  "sorular": [
    {
      "id": "q1",
      "soru": "Soru metni",
      "siklar": ["A) seçenek", "B) seçenek", "C) seçenek", "D) seçenek", "E) seçenek"],
      "dogru_cevap": "A",
      "aciklama": "Adım adım çözüm ve neden doğru açıklaması",
      "zorluk": "Kolay|Orta|Zor",
      "kazanim": "Bu sorunun ölçtüğü KPSS kazanımı"
    }
  ]
}`;

  const kullaniciZayifMetni = params.kullanici_zayiflari
    ? `\nKullanıcı bu konularda zayıf: ${params.kullanici_zayiflari}. Buna göre sorular üret.`
    : '';

  const user = `${params.ders} dersi, "${params.konu}" konusundan KPSS formatında ${params.soru_sayisi} adet çoktan seçmeli soru üret.
Her soru benzersiz, özgün ve gerçek sınav atmosferinde olsun.${kullaniciZayifMetni}
JSON formatında ver.`;

  return { system, user };
}

// ─── Konu anlatım prompt builder ─────────────────────────────────────────
function konuAnlatimPrompt(konu: string, ders: string, mod: string): { system: string; user: string } {
  const dersContext = DERS_CONTEXT[ders] || '';

  const system = `Sen deneyimli bir KPSS eğitmeni ve konu anlatım uzmanısın.
Öğrencilere konuları sade, anlaşılır ve KPSS odaklı şekilde anlatırsın.

${dersContext}

ANLATIM KURALLARI:
- Türkçe yaz
- KPSS sınavında çıkan noktalara odaklan
- Gereksiz akademik detay ekleme
- Somut örnekler kullan
- Önemli noktaları madde madde listele
- Maksimum 4-5 paragraf veya 8-10 madde`;

  const userMap: Record<string, string> = {
    'konu_anlat': `${ders} dersi, "${konu}" konusunu KPSS odaklı anlat. Sınavda çıkan önemli noktalara vurgula, somut örnekler ver.`,
    'basitleştir': `"${konu}" konusunu çok sade bir dille anlat. Sanki konuyu hiç bilmeyen birine öğretiyorsun. Karmaşık terimlerden kaçın.`,
    'örnek_ver': `"${konu}" konusundan KPSS'de çıkabilecek 2-3 somut örnek olay veya uygulama ver ve açıkla.`,
    'tekrar_anlat': `"${konu}" konusunu farklı bir bakış açısıyla, farklı benzetmeler ve örnekler kullanarak tekrar anlat.`,
  };

  return { system, user: userMap[mod] || userMap['konu_anlat'] };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    const body = await req.json();
    const {
      tip,
      konu,
      ders,
      kategori,
      kullanici_metni,
      gecmis_mesajlar,
      zorluk,
      soru_sayisi,
      kullanici_zayiflari,
    } = body;

    let systemPrompt = '';
    let userPrompt = '';

    // ─── Soru üretimi (Pro V3) ──────────────────────────────────────────
    if (tip === 'soru_uret') {
      const adet = soru_sayisi ?? 5;
      const seviye = zorluk ?? 'Orta';
      const { system, user } = soruUretimPrompt({
        konu: konu ?? 'Genel KPSS',
        ders: ders ?? 'Genel Yetenek',
        kategori,
        zorluk: seviye,
        soru_sayisi: adet,
        kullanici_zayiflari,
      });
      systemPrompt = system;
      userPrompt = user;

    // ─── Konu anlatımı ──────────────────────────────────────────────────
    } else if (['konu_anlat', 'basitleştir', 'örnek_ver', 'tekrar_anlat'].includes(tip)) {
      const { system, user } = konuAnlatimPrompt(konu ?? '', ders ?? '', tip);
      systemPrompt = system;
      userPrompt = user;

    // ─── Yazı analizi ───────────────────────────────────────────────────
    } else if (tip === 'yazi_analiz') {
      systemPrompt = `Sen KPSS eğitmenisin ve öğrencinin yazılı cevaplarını değerlendiriyorsun.
Gerçekçi, yapıcı ve gelişime yönelik geri bildirim verirsin. Türkçe yaz.

SADECE şu JSON formatında yanıt ver, markdown kullanma:
{
  "puan": 75,
  "dogru_noktalar": ["doğru ifade 1", "doğru ifade 2"],
  "eksikler": ["eksik nokta 1", "eksik nokta 2"],
  "oneri": "Kısa, yapıcı tavsiye cümlesi"
}`;
      userPrompt = `Öğrenci ${konu} konusu hakkında şunu yazdı:\n"${kullanici_metni}"\n\nBu metni KPSS odaklı değerlendir. JSON formatında ver.`;

    // ─── Chat (AI Koç) ──────────────────────────────────────────────────
    } else if (tip === 'chat') {
      const dersContext = DERS_CONTEXT[ders ?? ''] || '';
      systemPrompt = `Sen KPSS konularında uzman bir AI koçsun.
Öğrencilere "${konu}" konusunda kısa, net ve pratik yanıtlar veriyorsun.
${dersContext}
Türkçe yaz. Gereksiz uzatma. KPSS'e odaklan.`;
      userPrompt = kullanici_metni || '';

    // ─── Taktik üretimi ─────────────────────────────────────────────
    } else if (tip === 'taktik_uret') {
      systemPrompt = `Sen KPSS eğitmeni ve bellek uzmanısın.
Görevin: Verilen KPSS sorusu için akılda kalıcı, pratik ve özgün bir taktik/mnemonik üretmek.

TAKTİK KURALLARI:
- Kısa, akılda kalıcı ve Türkçe olacak
- Soru tipine uygun teknik kullan: bellek sarayı, kısaltma, uyaklı cümle, görsel çağrışım
- 2-4 cümle ile sınırlı
- Somut ve uygulanabilir olacak
- Sınavda hız kazandıracak ipucu içerecek

SADECE taktiği yaz, başka hiçbir şey ekleme.`;
      userPrompt = `Bu KPSS sorusu için akılda kalıcı bir çözüm taktiği yaz:

"${kullanici_metni || konu}"

Taktik:`;

    } else {
      return new Response(
        JSON.stringify({ error: 'Geçersiz tip' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // ─── AI İsteği ──────────────────────────────────────────────────────
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (gecmis_mesajlar && Array.isArray(gecmis_mesajlar)) {
      messages.push(...gecmis_mesajlar);
    }

    messages.push({ role: 'user', content: userPrompt });

    console.log(`[ai-learning] tip=${tip}, ders=${ders}, konu=${konu}, zorluk=${zorluk}, adet=${soru_sayisi}`);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        temperature: tip === 'soru_uret' ? 0.8 : 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', errText);
      return new Response(
        JSON.stringify({ error: `AI API Hatası: ${errText}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    console.log(`[ai-learning] Başarılı yanıt, içerik uzunluğu: ${content.length}`);

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Edge Function error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
