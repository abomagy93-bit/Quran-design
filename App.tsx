
import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { Surah, Ayah, AppState, TRANSLATIONS } from './types';
import { fetchSurahs, fetchAyahsRangeWithTranslation } from './services/quranService';
import { generateVisualPromptFromVerses, generateGeminiImage } from './services/videoService';

const QURAN_RADIO_URL = "https://n0e.radiojar.com/8s5u5tpdtwzuv";

// مكون البطاقة مع تحسين رسم النصوص والترجمات
const Card = memo(({ ayahs, bgUrl, surahName }: { 
  ayahs: Ayah[]; bgUrl: string; surahName: string; 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = bgUrl;
    img.onload = () => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // خلفية سوداء أساسية
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // رسم الصورة بخلفية خفيفة
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // تدرج لوني للتغطية العلوية والسفلية
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, 'rgba(0,0,0,0.9)');
      grad.addColorStop(0.35, 'rgba(0,0,0,0.1)');
      grad.addColorStop(0.65, 'rgba(0,0,0,0.1)');
      grad.addColorStop(1, 'rgba(0,0,0,0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const maxWidth = canvas.width * 0.88;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      // محرك تنسيق النصوص الذكي
      const layoutText = (text: string, maxW: number, initialSize: number, font: string, maxH: number, lineFactor: number = 1.9) => {
        let fontSize = initialSize;
        let lines: string[] = [];
        let totalH = 0;
        
        while (fontSize >= 16) {
          ctx.font = `bold ${fontSize}px ${font}`;
          lines = [];
          const words = text.split(/\s+/);
          let current = '';
          for (let word of words) {
            let test = current + word + ' ';
            if (ctx.measureText(test).width > maxW) {
              lines.push(current.trim());
              current = word + ' ';
            } else {
              current = test;
            }
          }
          lines.push(current.trim());
          totalH = lines.length * (fontSize * lineFactor);
          if (totalH <= maxH) break;
          fontSize -= 2;
        }
        return { lines, fontSize, totalH, lineH: fontSize * lineFactor };
      };

      // تحضير النصوص
      const arText = ayahs.map(a => `${a.text} ﴿${a.numberInSurah}﴾`).join(' ');
      const hasTranslation = ayahs.some(a => a.translationText && a.translationText.trim().length > 0);
      const trText = hasTranslation ? ayahs.map(a => `(${a.numberInSurah}) ${a.translationText}`).join(' ') : "";

      // رسم النص العربي
      const arAreaMaxH = hasTranslation ? canvas.height * 0.45 : canvas.height * 0.65;
      const arLayout = layoutText(arText, maxWidth, 72, "'Amiri', serif", arAreaMaxH, 2.3);
      
      ctx.fillStyle = "white";
      ctx.font = `bold ${arLayout.fontSize}px 'Amiri', serif`;
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 15;
      const startY = 140;
      arLayout.lines.forEach((l, i) => ctx.fillText(l, centerX, startY + (i * arLayout.lineH)));
      ctx.shadowBlur = 0;

      // رسم الترجمة إذا وجدت
      if (hasTranslation) {
        const separatorY = startY + arLayout.totalH + 40;
        ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.35, separatorY);
        ctx.lineTo(canvas.width * 0.65, separatorY);
        ctx.stroke();

        const trMaxH = canvas.height * 0.22;
        const trLayout = layoutText(trText, maxWidth * 0.9, 28, "'Tajawal', sans-serif", trMaxH, 1.6);
        
        ctx.fillStyle = "#cbd5e1"; // Slate-300
        ctx.font = `500 ${trLayout.fontSize}px 'Tajawal', sans-serif`;
        trLayout.lines.forEach((l, i) => ctx.fillText(l, centerX, separatorY + 40 + (i * trLayout.lineH)));
      }

      // تذييل البطاقة
      const info = ayahs.length > 1 ? `الآيات ${ayahs[0].numberInSurah}-${ayahs[ayahs.length-1].numberInSurah}` : `الآية ${ayahs[0].numberInSurah}`;
      const pureName = surahName.replace(/^سورة\s+/i, '');
      
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 36px 'Tajawal', sans-serif";
      ctx.fillText(`سورة ${pureName} • ${info}`, centerX, canvas.height - 180);
      
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "500 24px 'Tajawal', sans-serif";
      ctx.fillText("صدقة جارية لأمي رحمها الله وشهداء غزة", centerX, canvas.height - 110);
    };
  }, [ayahs, bgUrl, surahName]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 w-full max-w-[480px] mx-auto shadow-2xl transition-transform duration-150 hover:scale-[1.01] active:scale-95">
      <canvas ref={canvasRef} width={1080} height={1350} className="w-full aspect-[4/5] object-cover bg-black" />
      <div className="p-4 bg-slate-900">
        <button onClick={() => {
          const link = document.createElement('a');
          link.download = `QuranCard_${Date.now()}.png`;
          link.href = canvasRef.current!.toDataURL('image/png', 0.9);
          link.click();
        }} className="w-full py-3 bg-slate-800 text-amber-500 rounded-xl font-bold hover:bg-amber-500 hover:text-black transition-colors duration-200">حفظ البطاقة</button>
      </div>
    </div>
  );
});

export const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    step: 'setup', mode: 'image', displayMode: 'combined', surah: null, startAyah: 1, endAyah: 1, translation: TRANSLATIONS[0], mediaUrl: null, ayahsData: [],
  });
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchSurahs().then(setSurahs);
    return () => audioRef.current?.pause();
  }, []);

  const toggleRadio = useCallback(async () => {
    if (isRadioPlaying) {
      audioRef.current?.pause();
      setIsRadioPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(QURAN_RADIO_URL);
        audioRef.current.crossOrigin = "anonymous";
      }
      try {
        await audioRef.current.play();
        setIsRadioPlaying(true);
      } catch (e) {
        setError("خطأ في تشغيل الإذاعة");
      }
    }
  }, [isRadioPlaying]);

  const handleGenerate = useCallback(async () => {
    if (!state.surah) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAyahsRangeWithTranslation(state.surah.number, state.startAyah, state.endAyah, state.translation.identifier);
      const prompt = await generateVisualPromptFromVerses(data.map(a => a.text));
      const url = await generateGeminiImage(prompt);
      setState(prev => ({ ...prev, step: 'preview', mediaUrl: url, ayahsData: data }));
    } catch (err: any) {
      setError("خطأ، يرجى المحاولة مرة أخرى");
    } finally {
      setIsLoading(false);
    }
  }, [state]);

  const groupedAyahs = useMemo(() => {
    if (state.displayMode === 'separate') return state.ayahsData.map(a => [a]);
    const chunks: Ayah[][] = [];
    let current: Ayah[] = [];
    let len = 0;
    state.ayahsData.forEach(a => {
      // تحسين دمج الآيات بناءً على طول النص
      if (len + a.text.length > 700 && current.length > 0) {
        chunks.push(current);
        current = [a];
        len = a.text.length;
      } else {
        current.push(a);
        len += a.text.length;
      }
    });
    if (current.length > 0) chunks.push(current);
    return chunks;
  }, [state.ayahsData, state.displayMode]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans rtl flex flex-col selection:bg-amber-500/30">
      {/* شريط التنقل */}
      <nav className="fixed top-0 w-full z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center h-14">
        <div className="flex gap-2 items-center overflow-x-auto no-scrollbar">
          <a href="https://karim-god-nour.blogspot.com" target="_blank" className="whitespace-nowrap px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-bold border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all">مدونة مثل نوره</a>
          <a href="https://Quran-elkareem.netlify.app" target="_blank" className="whitespace-nowrap px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-bold border border-blue-500/20 hover:bg-blue-500 hover:text-black transition-all">مواقع قرآن الكريم</a>
          <button onClick={toggleRadio} className={`whitespace-nowrap px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${isRadioPlaying ? 'bg-amber-500 text-black border-amber-500 shadow-lg' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}>
            الإذاعة {isRadioPlaying ? '🔊' : '🔇'}
          </button>
        </div>
        <h2 className="text-amber-500/40 font-black text-[10px] uppercase tracking-tighter hidden sm:block">صدقة جارية</h2>
      </nav>

      <div className="flex-1 pt-20 pb-10 px-4 flex flex-col items-center">
        <header className="text-center mb-8 animate-fastFadeIn">
          <h1 className="text-3xl md:text-5xl font-black text-amber-500 mb-2 quran-font drop-shadow-lg">صانع بطاقات القرآن</h1>
          <p className="text-slate-400 text-sm opacity-70">تصاميم بصرية فورية مدعومة بالذكاء الاصطناعي</p>
        </header>

        <main className="w-full max-w-4xl">
          {state.step === 'setup' ? (
            <div className="bg-slate-900/40 p-6 md:p-8 rounded-[2rem] border border-slate-800 shadow-2xl space-y-6 animate-fastSlideIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest px-1">السورة الكريمة</label>
                  <select onChange={(e) => {
                    const s = surahs.find(x => x.number === +e.target.value);
                    setState(p => ({ ...p, surah: s || null, startAyah: 1, endAyah: 1 }));
                  }} className="w-full bg-black/40 p-3 rounded-xl border border-slate-700 text-amber-500 font-bold outline-none focus:border-amber-500 transition-colors appearance-none">
                    <option value="">-- اختر السورة --</option>
                    {surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest px-1">توزيع البطاقات</label>
                  <div className="flex gap-2">
                    <button onClick={() => setState(p => ({ ...p, displayMode: 'separate' }))} className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all ${state.displayMode === 'separate' ? 'bg-amber-500 text-black border-amber-500 shadow-lg' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}>منفصل (آية/بطاقة)</button>
                    <button onClick={() => setState(p => ({ ...p, displayMode: 'combined' }))} className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all ${state.displayMode === 'combined' ? 'bg-amber-500 text-black border-amber-500 shadow-lg' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}>مدمج (آيات متصلة)</button>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest px-1">الترجمة / التفسير</label>
                  <select 
                    value={state.translation.identifier} 
                    onChange={(e) => setState(p => ({ ...p, translation: TRANSLATIONS.find(t => t.identifier === e.target.value) || TRANSLATIONS[0] }))}
                    className="w-full bg-black/40 p-3 rounded-xl border border-slate-700 text-slate-200 font-medium outline-none focus:border-amber-500 transition-colors appearance-none"
                  >
                    {TRANSLATIONS.map(t => <option key={t.identifier} value={t.identifier}>{t.name}</option>)}
                  </select>
                </div>

                {state.surah && (
                  <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-xl border border-slate-800 animate-fastFadeIn">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold px-1">من الآية</label>
                      <select value={state.startAyah} onChange={(e) => setState(p => ({ ...p, startAyah: +e.target.value, endAyah: Math.max(p.endAyah, +e.target.value) }))} className="w-full bg-black/30 p-2 rounded-lg border border-slate-700 text-sm font-bold appearance-none">
                        {Array.from({length: state.surah.numberOfAyahs}, (_,i)=>i+1).map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold px-1">إلى الآية</label>
                      <select value={state.endAyah} onChange={(e) => setState(p => ({ ...p, endAyah: +e.target.value }))} className="w-full bg-black/30 p-2 rounded-lg border border-slate-700 text-sm font-bold appearance-none">
                        {Array.from({length: state.surah.numberOfAyahs}, (_,i)=>i+1).filter(n => n >= state.startAyah).map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {error && <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-center text-xs animate-shake">⚠️ {error}</div>}

              <button onClick={handleGenerate} disabled={isLoading || !state.surah} className="w-full py-5 bg-amber-500 text-black rounded-2xl font-black text-xl shadow-xl shadow-amber-500/10 disabled:opacity-50 hover:scale-[0.99] active:scale-95 transition-all">
                {isLoading ? "جاري توليد التصميم..." : "توليد البطاقة"}
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-fastFadeIn">
              <div className="flex justify-between items-center bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
                <div className="text-right">
                  <p className="font-black text-amber-500 text-lg">سورة {state.surah?.name}</p>
                  <p className="text-slate-400 text-xs">الآيات {state.startAyah} إلى {state.endAyah}</p>
                </div>
                <button onClick={() => setState(p => ({ ...p, step: 'setup' }))} className="px-6 py-2 bg-slate-800 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors">تغيير السورة</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {groupedAyahs.map((group, idx) => <Card key={idx} ayahs={group} bgUrl={state.mediaUrl!} surahName={state.surah!.name} />)}
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="py-12 text-center border-t border-slate-900 mt-auto px-6">
        <p className="text-slate-500 text-sm font-bold mb-1">صدقة جارية لأمي وشهداء غزة</p>
        <p className="text-amber-500/80 font-black text-2xl tracking-tighter">كريم آل عشماوي</p>
      </footer>

      <style>{`
        .animate-fastFadeIn { animation: fadeIn 0.15s ease-out forwards; }
        .animate-fastSlideIn { animation: slideUp 0.2s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        select { background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: left 0.75rem center; background-size: 1em; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
};

export default App;
