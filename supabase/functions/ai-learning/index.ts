import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    const {
      tip,
      konu,
      ders,
      kategori,
      kullanici_metni,
      gecmis_mesajlar,
      zorluk,
      soru_sayisi,
    } = await req.json();

    let systemPrompt = '';
    let userPrompt = '';

    if (tip === 'konu_anlat') {
      systemPrompt = `Sen deneyimli bir KPSS eğitmenisin. Konuları kısa, net ve anlaşılır şekilde anlatırsın. 
Yanıtların her zaman Türkçe olsun. Maddeler halinde, örneklerle zenginleştirilmiş açıklamalar yap.
Maksimum 3-4 paragraf kullan. KPSS sınavına odaklan.`;
      userPrompt = `${ders} dersi, ${konu} konusunu KPSS seviyesinde anlat. Önemli noktaları vurgula ve somut örnekler ver.`;
    } else if (tip === 'basitleştir') {
      systemPrompt = `Sen KPSS eğitmenisin. Konuları çok sade ve anlaşılır dil kullanarak anlatırsın. 
Sanki 10. sınıf öğrencisine anlatır gibi basit anlat. Türkçe yanıtla.`;
      userPrompt = `Bu konuyu çok daha basit bir dille anlat, sanki hiç bilmiyormuşum gibi: ${konu} (${ders})`;
    } else if (tip === 'örnek_ver') {
      systemPrompt = `Sen KPSS eğitmenisin. ÖSYM tarzı gerçekçi ve öğretici örnekler üretirsin. Türkçe yanıtla.`;
      userPrompt = `${konu} konusundan KPSS'de çıkabilecek 2-3 somut örnek ver ve açıkla.`;
    } else if (tip === 'tekrar_anlat') {
      systemPrompt = `Sen KPSS eğitmenisin. Aynı konuyu farklı bir açıdan ve farklı benzetmelerle anlat. Türkçe yanıtla.`;
      userPrompt = `${konu} konusunu farklı bir yaklaşımla, farklı örnekler kullanarak tekrar anlat.`;
    } else if (tip === 'soru_uret') {
      const adet = soru_sayisi ?? 5;
      const seviye = zorluk ?? 'Orta';

      systemPrompt = `Sen KPSS soru üreticisisin. ÖSYM tarzı, özgün ve gerçekçi sorular üretirsin.
Zorluk seviyesine sıkı sıkıya uy:
- Kolay: Tanım ve temel bilgi soruları, doğrudan hatırlama
- Orta: Kavram analizi, ilişki kurma, yorum gerektiren sorular
- Zor: Karmaşık analiz, çok adımlı çıkarım, ince ayrım gerektiren sorular

SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir metin ekleme, markdown kullanma:
{
  "sorular": [
    {
      "id": "q1",
      "soru": "Soru metni burada olacak",
      "siklar": ["A) seçenek", "B) seçenek", "C) seçenek", "D) seçenek", "E) seçenek"],
      "dogru_cevap": "A",
      "aciklama": "Neden bu cevap doğru, kısa açıklama",
      "zorluk": "${seviye}"
    }
  ]
}`;
      userPrompt = `${ders} dersi, "${konu}" konusundan KPSS formatında ${adet} adet ${seviye} zorlukta çoktan seçmeli soru üret. Her soru benzersiz ve özgün olsun, aynı fikri tekrarlama. JSON formatında ver.`;
    } else if (tip === 'yazi_analiz') {
      systemPrompt = `Sen KPSS eğitmenisin. Öğrencinin yazdığı metni analiz edersin.
SADECE şu JSON formatında yanıt ver, markdown kullanma:
{
  "puan": 75,
  "dogru_noktalar": ["doğru ifade 1", "doğru ifade 2"],
  "eksikler": ["eksik nokta 1", "eksik nokta 2"],
  "oneri": "Kısa, yapıcı tavsiye cümlesi"
}`;
      userPrompt = `Öğrenci ${konu} konusu hakkında şunu yazdı:\n"${kullanici_metni}"\n\nBu metni analiz et, doğru noktaları ve eksikleri belirt. JSON formatında ver.`;
    } else if (tip === 'chat') {
      systemPrompt = `Sen KPSS konularında uzman bir AI koçsun. Öğrencilere ${konu} konusunda yardım ediyorsun.
Kısa, net, Türkçe yanıtlar ver. Gereksiz uzatma.`;
      userPrompt = kullanici_metni || '';
    } else {
      return new Response(
        JSON.stringify({ error: 'Geçersiz tip' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (gecmis_mesajlar && Array.isArray(gecmis_mesajlar)) {
      messages.push(...gecmis_mesajlar);
    }

    messages.push({ role: 'user', content: userPrompt });

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
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
