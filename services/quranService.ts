
import { Surah, Ayah } from '../types';

const BASE_URL = 'https://api.alquran.cloud/v1';
const SURAHS_CACHE_KEY = 'quran_surahs_cache_v2';

export const fetchSurahs = async (): Promise<Surah[]> => {
  // Instant load from localStorage if available
  const cached = localStorage.getItem(SURAHS_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Background refresh to keep data fresh without blocking UI
      fetch(`${BASE_URL}/surah`).then(res => res.json()).then(data => {
        if (data.data) localStorage.setItem(SURAHS_CACHE_KEY, JSON.stringify(data.data));
      }).catch(() => {});
      return parsed;
    } catch (e) {
      localStorage.removeItem(SURAHS_CACHE_KEY);
    }
  }

  try {
    const response = await fetch(`${BASE_URL}/surah`);
    if (!response.ok) throw new Error("Connection failed");
    const data = await response.json();
    localStorage.setItem(SURAHS_CACHE_KEY, JSON.stringify(data.data));
    return data.data;
  } catch (err) {
    return [];
  }
};

export const fetchAyahsRangeWithTranslation = async (
  surahNumber: number, 
  start: number, 
  end: number, 
  translationId: string
): Promise<Ayah[]> => {
  try {
    // Use browser cache for faster repeated access
    const fetchOptions: RequestInit = { cache: 'force-cache' };
    const [arabicRes, transRes] = await Promise.all([
      fetch(`${BASE_URL}/surah/${surahNumber}/quran-uthmani`, fetchOptions),
      translationId !== 'none' ? fetch(`${BASE_URL}/surah/${surahNumber}/${translationId}`, fetchOptions) : Promise.resolve(null)
    ]);

    if (!arabicRes.ok) throw new Error("Fetch failed");
    
    const arabicData = await arabicRes.json();
    let transAyahs: any[] = [];
    if (transRes && transRes.ok) {
      const td = await transRes.json();
      transAyahs = td.data.ayahs;
    }

    return arabicData.data.ayahs
      .filter((a: any) => a.numberInSurah >= start && a.numberInSurah <= end)
      .map((a: any) => ({
        number: a.number,
        text: a.text,
        translationText: transAyahs.find((t: any) => t.numberInSurah === a.numberInSurah)?.text || "",
        numberInSurah: a.numberInSurah
      }));
  } catch (err: any) {
    throw new Error("Network error occurred");
  }
};
