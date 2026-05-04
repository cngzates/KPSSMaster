import React, { createContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { KATEGORILER, Soru, Kategori } from '@/constants/data';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';

export interface TestSonucu {
  soruId: string;
  dogru: boolean;
  secilen: string;
  kategori?: string;
  ders?: string;
}

interface AppContextType {
  gunlukCozulen: number;
  gunlukHedef: number;
  testSonuclari: TestSonucu[];
  soruCevapla: (sonuc: TestSonucu) => void;
  aktifKategori: Kategori | null;
  aktifKategoriSec: (kategori: Kategori) => void;
  suankiSorular: Soru[];
  kisiselTestBaslat: () => void;
  kategoriFiltreliSorular: (kategoriId: string) => Soru[];
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [gunlukCozulen, setGunlukCozulen] = useState(0);
  const [gunlukHedef] = useState(20);
  const [testSonuclari, setTestSonuclari] = useState<TestSonucu[]>([]);
  const [aktifKategori, setAktifKategori] = useState<Kategori | null>(null);
  const [suankiSorular, setSuankiSorular] = useState<Soru[]>([]);

  // Kullanıcı giriş yaptığında günlük ilerlemeyi yükle
  useEffect(() => {
    if (user) {
      loadGunlukIlerleme();
    } else {
      setGunlukCozulen(0);
      setTestSonuclari([]);
    }
  }, [user]);

  const loadGunlukIlerleme = async () => {
    if (!user) return;
    try {
      const supabase = getSupabaseClient();
      const bugun = new Date();
      bugun.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from('soru_gecmisi')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', bugun.toISOString());
      if (data) setGunlukCozulen(data.length);
    } catch {}
  };

  const soruCevapla = useCallback(async (sonuc: TestSonucu) => {
    setTestSonuclari(prev => [...prev, sonuc]);
    setGunlukCozulen(prev => Math.min(prev + 1, gunlukHedef));

    // Supabase'e kaydet (sadece giriş yapılmışsa)
    if (user) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('soru_gecmisi').insert({
          user_id: user.id,
          soru_id: sonuc.soruId,
          dogru: sonuc.dogru,
          secilen_sik: sonuc.secilen,
          kategori: sonuc.kategori || 'genel',
          ders: sonuc.ders || '',
        });
      } catch {}
    }
  }, [user, gunlukHedef]);

  const aktifKategoriSec = useCallback((kategori: Kategori) => {
    setAktifKategori(kategori);
  }, []);

  const kisiselTestBaslat = useCallback(() => {
    // AI tarafından dinamik üretiliyor — yerel liste gerekmiyor
  }, []);

  const kategoriFiltreliSorular = useCallback((_kategoriId: string): Soru[] => {
    return [];
  }, []);

  return (
    <AppContext.Provider value={{
      gunlukCozulen,
      gunlukHedef,
      testSonuclari,
      soruCevapla,
      aktifKategori,
      aktifKategoriSec,
      suankiSorular,
      kisiselTestBaslat,
      kategoriFiltreliSorular,
    }}>
      {children}
    </AppContext.Provider>
  );
}
