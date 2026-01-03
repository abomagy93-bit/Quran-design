
export interface Surah {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
}

export interface Ayah {
  number: number;
  text: string;
  translationText?: string;
  numberInSurah: number;
}

export interface Translation {
  identifier: string;
  name: string;
  language: string;
}

export type GenerationMode = 'image' | 'video';
export type DisplayMode = 'separate' | 'combined';

export interface AppState {
  step: 'setup' | 'preview';
  mode: GenerationMode;
  displayMode: DisplayMode;
  surah: Surah | null;
  startAyah: number;
  endAyah: number;
  translation: Translation;
  mediaUrl: string | null;
  ayahsData: Ayah[];
}

export const TRANSLATIONS: Translation[] = [
  { identifier: 'none', name: 'بدون ترجمة', language: 'ar' },
  { identifier: 'ar.muyassar', name: 'التفسير الميسر (عربي)', language: 'ar' },
  { identifier: 'ar.jalalayn', name: 'تفسير الجلالين (عربي)', language: 'ar' },
  { identifier: 'en.sahih', name: 'English (Sahih Intl)', language: 'en' },
  { identifier: 'fr.hamidullah', name: 'Français (Hamidullah)', language: 'fr' },
  { identifier: 'es.asad', name: 'Español (Muhammad Asad)', language: 'es' },
  { identifier: 'de.aburida', name: 'Deutsch (Abu Rida)', language: 'de' },
  { identifier: 'tr.diyanet', name: 'Türkçe (Diyanet)', language: 'tr' },
  { identifier: 'ur.jalandhry', name: 'اردو (Fateh Jalandhry)', language: 'ur' },
  { identifier: 'id.indonesian', name: 'Bahasa Indonesia', language: 'id' },
  { identifier: 'ru.kuliev', name: 'Русский (Kuliev)', language: 'ru' },
  { identifier: 'it.piccardo', name: 'Italiano (Piccardo)', language: 'it' },
  { identifier: 'zh.jian', name: 'Chinese (Ma Jian)', language: 'zh' },
];
