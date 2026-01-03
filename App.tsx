
import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { Surah, Ayah, AppState, TRANSLATIONS } from './types';
import { fetchSurahs, fetchAyahsRangeWithTranslation } from './services/quranService';
import { generateVisualPromptFromVerses, generateGeminiImage } from './services/videoService';

const QURAN_RADIO_URL = "https://n0e.radiojar.com/8s5u5tpdtwzuv";

// مكون البطاقة مع تحسين رسم النصوص والترجمات والتنسيق الذكي
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
      
      // رسم الصورة بخلفية خفيفة لزيادة التباين
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // تدرج لوني احترافي للتغطية العلوية والسفلية
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, 'rgba(0,0,0,0.95)');
      grad.addColorStop(0.3, 'rgba(0,0,0,0.2)');
      grad.addColorStop(0.7, 'rgba(0,0,0,0.2)');
      grad.addColorStop(1, 'rgba(0,0,0,0.98)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const maxWidth = canvas.width * 0.90;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      // محرك تنسيق النصوص الذكي (Smart Sizing & Layout)
      const layoutText = (text: string, maxW: number, initialSize: number, font: string, maxH: number, lineFactor: number = 1.9) => {
        let fontSize = initialSize;
        let lines: string[] = [];
        let totalH = 0;
        
        while (fontSize >= 14) {
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

      // تحضير النصوص (عربي + ترجمة)
      const arText = ayahs.map(a => `${a.text} ﴿${a.numberInSurah}﴾`).join(' ');
      const hasTranslation = ayahs.some(a => a.translationText && a.translationText.trim().length > 0);
      const trText = hasTranslation ? ayahs.map(a => `(${a.numberInSurah}) ${a.translationText}`).join(' ') : "";

      // رسم النص العربي بتنسيق ذكي
      const arAreaMaxH = hasTranslation ? canvas.height * 0.48 : canvas.height * 0.68;
      const arLayout = layoutText(arText, maxWidth, 74, "'Amiri', serif", arAreaMaxH, 2.4);
      
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${arLayout.fontSize}px 'Amiri', serif`;
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 20;
      const startY = 150;
      arLayout.lines.forEach((l, i) => ctx.fillText(l, centerX, startY + (i * arLayout.lineH)));
      ctx.shadowBlur = 0;

      // رسم الترجمة / التفسير إذا تم اختياره
      if (hasTranslation) {
        const separatorY = startY + arLayout.totalH + 50;
        ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.38, separatorY);
        ctx.lineTo(canvas.width * 0.62, separatorY);
        ctx.stroke();

        const trMaxH = canvas.height * 0.25;
        const trLayout = layoutText(trText, maxWidth * 0.92, 30, "'Tajawal', sans-serif", trMaxH, 1.7);
        
        ctx.fillStyle = "#e2e8f0"; // Slate-200 لزيادة الوضوح
        ctx.font = `500 ${trLayout.fontSize}px 'Tajawal', sans-serif`;
        trLayout.lines.forEach((l, i) => ctx.fillText(l, centerX, separatorY + 45 + (i * trLayout.lineH)));
      }

      // تذييل البطاقة (اسم السورة والمعلومات)
      const info = ayahs.length > 1 ? `الآيات ${ayahs[0].numberInSurah}-${ayahs[ayahs.length-1].numberInSurah}` : `الآية ${ayahs[0].numberInSurah}`;
      const pureName = surahName.replace(/^سورة\s+/i, '');
      
      ctx.fillStyle = "#fbbf24"; // Amber-400
      ctx.font = "bold 38px 'Tajawal', sans-serif";
      ctx.fillText(`سورة ${pureName} • ${info}`, centerX, canvas.height - 180);
      
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "500 24px 'Tajawal', sans-serif";
      ctx.fillText("صدقة جارية لأمي رحمها الله وشهداء غزة", centerX, canvas.height - 110);
    };
  }, [ayahs, bgUrl, surahName]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 w-full max-w-[480px] mx-auto shadow-2xl transition-all duration-300 hover:shadow-amber-500/10 active:scale-95">
      <canvas ref={canvasRef} width={1080} height={1350} className="w-full aspect-[4/5] object-cover bg-black" />
      <div className="p-4 bg-slate-900">
        <button onClick={() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const link = document.createElement('a');
          link.download = `QuranCard_${surahName.replace(/\s+/g, '_')}_${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png', 1.0);
          link.click();
        }} className="w-full py-3.5 bg-slate-800 text-amber-500 rounded-xl font-bold hover:bg-amber-500 hover:text-black transition-all duration-300 shadow-lg active:translate-y-0.5">حفظ البطاقة بدقة عالية</button>
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
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
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
        setIsLoading(true);
        await audioRef.current.play();
        setIsRadioPlaying(true);
      } catch (e) {
        console.error("Radio Error:", e);
        setError("عذراً، تعذر تشغيل الإذاعة حالياً");
      } finally {
        setIsLoading(false);
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
      console.error("Generation Error:", err);
      setError("حدث خطأ في الاتصال بالخادم، يرجى المحاولة مرة أخرى");
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
      if (len + a.text.length > 680 && current.length > 0) {
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
      {/* شريط التنقل العلوي المطور */}
      <nav className="fixed top-0 w-full z-50 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800 px-4 py-3 flex justify-between items-center h-16 shadow-xl">
        <div className="flex gap-3 items-center overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <a href="https://karim-god-nour.blogspot.com" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-[11px] font-bold border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all shadow-sm">مدونة مثل نوره</a>
          <a href="https://Quran-elkareem.netlify.app" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-xl text-[11px] font-bold border border-blue-500/20 hover:bg-blue-500 hover:text-black transition-all shadow-sm">مواقع قرآن الكريم</a>
          <button onClick={toggleRadio} className={`whitespace-nowrap px-4 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${isRadioPlaying ? 'bg-amber-500 text-black border-amber-500 shadow-lg animate-pulse' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-500/50 hover:text-amber-500'}`}>
            الإذاعة {isRadioPlaying ? '🔊' : '🔇'}
          </button>
        </div>
        <h2 className="text-amber-500/40 font-black text-[11px] uppercase tracking-widest hidden lg:block select-none">صدقة جارية</h2>
      </nav>

      <div className="flex-1 pt-24 pb-12 px-4 flex flex-col items-center max-w-7xl mx-auto w-full">
        <header className="text-center mb-10 animate-fastFadeIn">
          <h1 className="text-4xl md:text-6xl font-black text-amber-500 mb-3 quran-font drop-shadow-2xl">صانع بطاقات القرآن</h1>
          <p className="text-slate-400 text-base md:text-lg opacity-80 max-w-2xl mx-auto leading-relaxed">حوّل الآيات الكريمة إلى تصاميم بصرية روحانية بدقة عالية باستخدام الذكاء الاصطناعي</p>
        </header>

        <main className="w-full max-w-5xl">
          {state.step === 'setup' ? (
            <div className="bg-slate-900/50 backdrop-blur-sm p-6 md:p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-8 animate-fastSlideIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs text-slate-500 uppercase font-black tracking-widest px-2">السورة الكريمة</label>
                  <div className="relative">
                    <select onChange={(e) => {
                      const s = surahs.find(x => x.number === +e.target.value);
                      setState(p => ({ ...p, surah: s || null, startAyah: 1, endAyah: 1 }));
                    }} className="w-full bg-black/40 p-4 rounded-2xl border border-slate-700 text-amber-500 font-bold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer">
                      <option value="">-- اختر السورة من القائمة --</option>
                      {surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs text-slate-500 uppercase font-black tracking-widest px-2">توزيع الآيات على البطاقة</label>
                  <div className="flex gap-3">
                    <button onClick={() => setState(p => ({ ...p, displayMode: 'separate' }))} className={`flex-1 py-4 rounded-2xl border font-black text-sm transition-all duration-300 ${state.displayMode === 'separate' ? 'bg-amber-500 text-black border-amber-500 shadow-xl scale-[1.02]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}>منفصل</button>
                    <button onClick={() => setState(p => ({ ...p, displayMode: 'combined' }))} className={`flex-1 py-4 rounded-2xl border font-black text-sm transition-all duration-300 ${state.displayMode === 'combined' ? 'bg-amber-500 text-black border-amber-500 shadow-xl scale-[1.02]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}>مدمج</button>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="text-xs text-slate-500 uppercase font-black tracking-widest px-2">إضافة الترجمة أو التفسير</label>
                  <select 
                    value={state.translation.identifier} 
                    onChange={(e) => setState(p => ({ ...p, translation: TRANSLATIONS.find(t => t.identifier === e.target.value) || TRANSLATIONS[0] }))}
                    className="w-full bg-black/40 p-4 rounded-2xl border border-slate-700 text-slate-200 font-bold outline-none focus:border-amber-500 transition-all appearance-none cursor-pointer"
                  >
                    {TRANSLATIONS.map(t => <option key={t.identifier} value={t.identifier}>{t.name}</option>)}
                  </select>
                </div>

                {state.surah && (
                  <div className="md:col-span-2 grid grid-cols-2 gap-6 bg-black/30 p-6 rounded-[1.5rem] border border-slate-800 animate-fastFadeIn shadow-inner">
                    <div className="space-y-2">
                      <label className="text-[11px] text-slate-400 font-black px-2">من الآية رقم</label>
                      <select value={state.startAyah} onChange={(e) => setState(p => ({ ...p, startAyah: +e.target.value, endAyah: Math.max(p.endAyah, +e.target.value) }))} className="w-full bg-slate-900/50 p-3 rounded-xl border border-slate-700 text-amber-500 font-black appearance-none cursor-pointer">
                        {Array.from({length: state.surah.numberOfAyahs}, (_,i)=>i+1).map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] text-slate-400 font-black px-2">إلى الآية رقم</label>
                      <select value={state.endAyah} onChange={(e) => setState(p => ({ ...p, endAyah: +e.target.value }))} className="w-full bg-slate-900/50 p-3 rounded-xl border border-slate-700 text-amber-500 font-black appearance-none cursor-pointer">
                        {Array.from({length: state.surah.numberOfAyahs}, (_,i)=>i+1).filter(n => n >= state.startAyah).map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {error && <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl text-center text-sm animate-shake shadow-lg font-bold">⚠️ {error}</div>}

              <button onClick={handleGenerate} disabled={isLoading || !state.surah} className="w-full py-6 bg-amber-500 text-black rounded-[2rem] font-black text-2xl shadow-2xl shadow-amber-500/20 disabled:opacity-50 hover:scale-[1.01] active:scale-95 transition-all duration-300 relative overflow-hidden group">
                <span className="relative z-10">{isLoading ? "جاري تصميم بطاقتك..." : "ابدأ التوليد الفني"}</span>
                {isLoading && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
              </button>
            </div>
          ) : (
            <div className="space-y-10 animate-fastFadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/90 backdrop-blur-md p-6 rounded-[2rem] border border-slate-800 shadow-2xl gap-4">
                <div className="text-right w-full sm:w-auto">
                  <p className="font-black text-amber-500 text-2xl drop-shadow-sm">سورة {state.surah?.name}</p>
                  <p className="text-slate-400 text-sm font-bold opacity-70 mt-1">عرض الآيات من {state.startAyah} إلى {state.endAyah}</p>
                </div>
                <button onClick={() => setState(p => ({ ...p, step: 'setup' }))} className="w-full sm:w-auto px-8 py-3 bg-slate-800 rounded-2xl text-base font-black hover:bg-slate-700 hover:text-amber-500 transition-all duration-300 shadow-lg border border-slate-700">تصميم كمان</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                {groupedAyahs.map((group, idx) => (
                  <div key={idx} className="animate-fastSlideIn" style={{ animationDelay: `${idx * 0.1}s` }}>
                    <Card ayahs={group} bgUrl={state.mediaUrl!} surahName={state.surah!.name} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="py-16 text-center border-t border-slate-900/50 mt-auto px-6 bg-black/20">
        <p className="text-slate-500 text-sm font-black mb-2 tracking-widest opacity-60 uppercase">صدقة جارية لأمي وشهداء غزة</p>
        <p className="text-amber-500/90 font-black text-3xl tracking-tighter drop-shadow-md">كريم آل عشماوي</p>
      </footer>

      <style>{`
        .animate-fastFadeIn { animation: fadeIn 0.2s ease-out forwards; }
        .animate-fastSlideIn { animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        select { background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: left 1.25rem center; background-size: 1.2em; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
      `}</style>
    </div>
  );
};

export default App;
