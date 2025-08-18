"use client";
import { useEffect, useState } from "react";
const VAKIT_BASE = 'https://vakit.vercel.app';

export default function NamazWidget({ coords, variant = 'card', useIpFallback = false }) {
  const [times, setTimes] = useState(null);
  const [error, setError] = useState(null);
  const [label, setLabel] = useState("");
  const [nextInfo, setNextInfo] = useState(null);

  // Gelecek vakti hesaplayıcı (her yeniden çizimde güncel saat ile çalışır)
  const computeNext = (tm) => {
    try {
      const order = [["İmsak", tm.imsak],["Güneş", tm.gunes],["Öğle", tm.ogle],["İkindi", tm.ikindi],["Akşam", tm.aksam],["Yatsı", tm.yatsi]];
      const now = new Date();
      for (const [name, v] of order) {
        if (!v) continue;
        const [hh, mm] = v.split(":").map(Number);
        const cand = new Date(); cand.setHours(hh, mm, 0, 0);
        if (cand >= now) {
          const remaining = Math.floor((cand - now) / 60000);
          return { name, time: `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`, remaining_minutes: remaining };
        }
      }
      if (tm.imsak) {
        const [hh, mm] = tm.imsak.split(":").map(Number);
        const cand = new Date(Date.now() + 86400000); cand.setHours(hh, mm, 0, 0);
        const remaining = Math.floor((cand - new Date()) / 60000);
        return { name: "İmsak", time: `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`, remaining_minutes: remaining };
      }
    } catch {}
    return null;
  };

  useEffect(() => {
    const run = async () => {
      try {
        let lat, lng;
        if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
          lat = coords.lat; lng = coords.lng;
        } else if (useIpFallback) {
          const ipRes = await fetch(`${VAKIT_BASE}/api/ip`);
          if (ipRes.ok) {
            const ip = await ipRes.json();
            lat = ip?.lat; lng = ip?.lng;
          }
        }
        if (lat != null && lng != null) {
          // Günlük önbellek anahtarı
          const today = new Date().toISOString().slice(0,10);
          const tz = String(-new Date().getTimezoneOffset());
          const cacheKey = `vakit:${lat}:${lng}:${today}:${tz}`;

          // Önbellekten hızlı okuma (varsa UI'yı anında doldur)
          try {
            const cachedRaw = localStorage.getItem(cacheKey);
            if (cachedRaw) {
              const cached = JSON.parse(cachedRaw);
              if (cached?.times) {
                setTimes({ times: cached.times });
                if (cached.label) setLabel(cached.label);
                // nextInfo her render'da hesaplanacağından burada set etmeye gerek yok
              }
            }
          } catch {}

          const tUrl = new URL(`${VAKIT_BASE}/api/timesForGPS`);
          tUrl.searchParams.set('lat', String(lat));
          tUrl.searchParams.set('lng', String(lng));
          tUrl.searchParams.set('date', new Date().toISOString().slice(0,10));
          tUrl.searchParams.set('days', '1');
          tUrl.searchParams.set('timezoneOffset', String(-new Date().getTimezoneOffset()));
          tUrl.searchParams.set('calculationMethod', 'Turkey');
          tUrl.searchParams.set('lang', 'tr');
          const res = await fetch(tUrl.toString());
          if (!res.ok) throw new Error('Vakit servisi hatası');
          const payload = await res.json();
          let mapped;
          if (payload?.times && !Array.isArray(payload.times) && typeof payload.times === 'object') {
            const dateKeys = Object.keys(payload.times);
            if (dateKeys.length) {
              const arr = payload.times[dateKeys[0]] || [];
              const clean = (t) => (t ? String(t).split(' ')[0] : null);
              mapped = { imsak: clean(arr[0]), gunes: clean(arr[1]), ogle: clean(arr[2]), ikindi: clean(arr[3]), aksam: clean(arr[4]), yatsi: clean(arr[5]) };
            }
          } else {
            const first = Array.isArray(payload?.times) ? (payload.times[0] || {}) : (payload?.data || {});
            const clean = (t) => (t ? String(t).split(' ')[0] : null);
            mapped = {
              imsak: clean(first?.fajr ?? first?.imsak ?? first?.Fajr),
              gunes: clean(first?.sunrise ?? first?.gunes ?? first?.Sunrise),
              ogle: clean(first?.dhuhr ?? first?.ogle ?? first?.Dhuhr),
              ikindi: clean(first?.asr ?? first?.ikindi ?? first?.Asr),
              aksam: clean(first?.maghrib ?? first?.aksam ?? first?.Maghrib),
              yatsi: clean(first?.isha ?? first?.yatsi ?? first?.Isha),
            };
          }
          setTimes({ times: mapped });
          setNextInfo(computeNext(mapped));
          const pUrl = new URL(`${VAKIT_BASE}/api/place`);
          pUrl.searchParams.set('lat', String(lat));
          pUrl.searchParams.set('lng', String(lng));
          pUrl.searchParams.set('lang', 'tr');
          const pres = await fetch(pUrl.toString());
          if (pres.ok) {
            const pl = await pres.json();
            setLabel(`${pl?.name || ''}${pl?.stateName ? ' / ' + pl.stateName : ''}`);
            // Tüm verileri önbelleğe yaz
            try {
              localStorage.setItem(cacheKey, JSON.stringify({ times: mapped, label: `${pl?.name || ''}${pl?.stateName ? ' / ' + pl.stateName : ''}` }));
            } catch {}
          }
          return;
        }
        setError('Konum alınamadı');
      } catch (e) {
        console.error('Widget prayer times fetch failed', e);
        setError(e.message || 'İstek başarısız');
      }
    };
    run();
  }, [coords, useIpFallback]);

  // Dakikada bir kalan süreyi güncelle (times mevcutken)
  useEffect(() => {
    if (!times?.times) return;
    setNextInfo(computeNext(times.times));
    const id = setInterval(() => {
      setNextInfo(computeNext(times.times));
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [times]);

  if (!times && error && !useIpFallback && !coords) {
    return null;
  }

  // Slider görünümü için yardımcılar
  const fmtRemain = (m) => {
    if (m == null) return null;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  };
  const hijriDate = () => {
    try { return new Intl.DateTimeFormat('tr-TR-u-ca-islamic', { day:'numeric', month:'long', year:'numeric' }).format(new Date()); } catch { return null; }
  };

  const CompactCard = () => (
    <div className="min-w-[280px] sm:min-w-[360px] bg-white/90 border border-slate-200 rounded-2xl shadow-sm p-3 md:p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-slate-800 text-base md:text-lg">Namaz Vakitleri {label ? `— ${label}` : ''}</h3>
        <a href="/namaz/index.html" className="text-primary text-xs md:text-sm font-medium">Detaylar →</a>
      </div>
      {nextInfo && (
        <div className="text-xs md:text-sm text-slate-700">{nextInfo.name} vaktine kalan: <span className="font-semibold text-emerald-700">{fmtRemain(nextInfo.remaining_minutes)}</span></div>
      )}
      <div className="text-[11px] md:text-xs text-slate-500 mt-1">{hijriDate()} , {new Date().toLocaleDateString('tr-TR')}</div>
    </div>
  );

  const FullCard = () => (
    <div className="min-w-[280px] sm:min-w-[360px] bg-white/90 border border-slate-200 rounded-2xl shadow-sm p-3 md:p-4">
      <div className="grid grid-cols-3 gap-1.5 md:gap-2">
        {Object.entries(times.times).map(([k,v]) => (
          <div key={k} className="rounded-xl border p-2 text-center bg-white/80">
            <div className="text-[10px] uppercase text-slate-500 tracking-wider">{k}</div>
            <div className="text-sm font-bold text-slate-800">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={variant === 'hero' ? 'mt-0' : 'mt-6'}>
      {!times ? (
        <div className={`${variant === 'hero' ? 'max-w-4xl' : 'max-w-3xl'} mx-auto text-slate-500 text-xs md:text-sm`}>Yükleniyor…</div>
      ) : (
        <div className={`mx-auto ${variant === 'hero' ? 'max-w-4xl' : 'max-w-3xl'}`}>
          {error && <div className="text-red-600 text-xs md:text-sm mb-1">Hata: {error}</div>}
          <div className="flex items-stretch gap-3 overflow-x-auto snap-x snap-mandatory py-1">
            <div className="snap-center"><CompactCard /></div>
            <div className="snap-center"><FullCard /></div>
          </div>
        </div>
      )}
    </div>
  );
}


