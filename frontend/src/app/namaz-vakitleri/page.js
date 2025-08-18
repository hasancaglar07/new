"use client";
import { useEffect, useRef, useState, useMemo } from "react";

const VAKIT_BASE = 'https://vakit.vercel.app';

export default function PrayerTimesPage() {
  // Modlar ve veri
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [times, setTimes] = useState(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [now, setNow] = useState(new Date());
  const [isHydrated, setIsHydrated] = useState(false);
  // Sade mod: aylık ve favoriler kaldırıldı

  // GPS verisi
  const [coords, setCoords] = useState(null); // {lat,lng}

  // Ayarlar (web+RN Bridge)
  const [ezanEnabled, setEzanEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ezan_settings')||'{}').enabled ?? true; } catch { return true; }
  });
  const [ezanType, setEzanType] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ezan_settings')||'{}').ezanType || 'traditional'; } catch { return 'traditional'; }
  });
  const [ezanVolume, setEzanVolume] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ezan_settings')||'{}').volume ?? 0.8; } catch { return 0.8; }
  });
  const [notifyEnabled, setNotifyEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notification_settings')||'{}').enabled ?? true; } catch { return true; }
  });
  const [beforeMinutes, setBeforeMinutes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notification_settings')||'{}').beforeMinutes ?? 10; } catch { return 10; }
  });
  const [widgetTheme, setWidgetTheme] = useState(() => {
    try { return JSON.parse(localStorage.getItem('widget_theme')||'null') || { style:'modern', color:'emerald' }; } catch { return { style:'modern', color:'emerald' }; }
  });

  // Vakit arama/suggestion
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null); // {id,name,stateName,...}
  const debounceRef = useRef(null);

  const tzOffsetMinutes = -new Date().getTimezoneOffset(); // TR için 180

  // Yardımcı: API payload'ını normalize et (timesForPlace ve timesForGPS'yi destekler)
  const parseTimesPayload = (payload) => {
    const clean = (t) => (t ? String(t).split(" ")[0] : null);
    // 1) Yapı: { times: { 'YYYY-MM-DD': [fajr,sunrise,dhuhr,asr,maghrib,isha] } }
    if (payload?.times && !Array.isArray(payload.times) && typeof payload.times === 'object') {
      const dates = Object.keys(payload.times);
      if (dates.length) {
        const date = dates[0];
        const arr = payload.times[date] || [];
        if (Array.isArray(arr) && arr.length >= 6) {
          return {
            date,
            times: {
              imsak: clean(arr[0]),
              gunes: clean(arr[1]),
              ogle: clean(arr[2]),
              ikindi: clean(arr[3]),
              aksam: clean(arr[4]),
              yatsi: clean(arr[5]),
            }
          };
        }
      }
    }
    // 2) Yapı: { times: [ {fajr,sunrise,...} ] } veya { data: {...} }
    const items = payload?.times || payload?.data || [];
    const first = Array.isArray(items) ? (items[0] || {}) : items;
    const times = {
      imsak: clean(first?.fajr ?? first?.imsak ?? first?.Fajr),
      gunes: clean(first?.sunrise ?? first?.gunes ?? first?.Sunrise),
      ogle: clean(first?.dhuhr ?? first?.ogle ?? first?.Dhuhr),
      ikindi: clean(first?.asr ?? first?.ikindi ?? first?.Asr),
      aksam: clean(first?.maghrib ?? first?.aksam ?? first?.Maghrib),
      yatsi: clean(first?.isha ?? first?.yatsi ?? first?.Isha),
    };
    return { date: first?.date || new Date().toISOString().slice(0,10), times };
  };

  const computeNext = (tm) => {
    try {
      const order = [
        ["İmsak", tm.imsak],
        ["Güneş", tm.gunes],
        ["Öğle", tm.ogle],
        ["İkindi", tm.ikindi],
        ["Akşam", tm.aksam],
        ["Yatsı", tm.yatsi],
      ];
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
      // gün bitti → ertesi gün imsak
      if (tm.imsak) {
        const [hh, mm] = tm.imsak.split(":").map(Number);
        const cand = new Date(Date.now() + 86400000); cand.setHours(hh, mm, 0, 0);
        const remaining = Math.floor((cand - new Date()) / 60000);
        return { name: "İmsak", time: `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`, remaining_minutes: remaining };
      }
    } catch {}
    return null;
  };

  // Yardımcı: HH:MM -> dakika
  const toMinutes = (hhmm) => {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  // Günün bölümü
  // Arka plan sade tutuldu

  // Timeline kaldırıldı: daha sade kurumsal görünüm

  // Zamanı her saniye güncelle
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Hydration guard to avoid SSR/client mismatches for dynamic UI
  useEffect(() => { setIsHydrated(true); }, []);

  // Vakit: PlaceID ile doğrudan (tam doğruluk ve hız)
  const fetchTimesVakitPlace = async (placeId) => {
    setLoading(true); setError(null);
    try {
      const url = new URL(`${VAKIT_BASE}/api/timesForPlace`);
      url.searchParams.set('id', String(placeId));
      url.searchParams.set('timezoneOffset', String(tzOffsetMinutes));
      url.searchParams.set('lang', 'tr');
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Vakit servisi hatası');
      const payload = await res.json();
      const parsed = parseTimesPayload(payload);
      const timesMap = parsed.times;
      const np = computeNext(timesMap);
      setTimes({
        date: parsed.date,
        city: selectedPlace?.stateName || selectedPlace?.name || '',
        district: selectedPlace?.name || '',
        times: timesMap,
        next_prayer: np,
        timezone: 'Europe/Istanbul',
        source: 'vakit.vercel.app:place',
      });
      const label = selectedPlace?.name ? `${selectedPlace.name}${selectedPlace.stateName ? ' / ' + selectedPlace.stateName : ''}` : (locationLabel || '');
      setLocationLabel(label);
      try {
        // Place bilgisi ile koordinatları al ve header ile paylaş
        const pRes = await fetch(`${VAKIT_BASE}/api/placeById?id=${placeId}`);
        let payloadPlace = null;
        if (pRes.ok) payloadPlace = await pRes.json();
        const lat = payloadPlace?.latitude || payloadPlace?.lat;
        const lng = payloadPlace?.longitude || payloadPlace?.lng;
        if (lat && lng) {
          setCoords({ lat, lng });
          window.localStorage.setItem('prayer_location', JSON.stringify({ lat, lng }));
          try { if (window.MihmandarBridge?.setLocation) window.MihmandarBridge.setLocation(lat, lng); } catch {}
        } else {
          window.localStorage.setItem('prayer_location', JSON.stringify({ placeId, name: selectedPlace?.name, stateName: selectedPlace?.stateName }));
        }
        window.dispatchEvent(new Event('prayerLocationChanged'));
      } catch {}
    } catch (e) {
      setError(e.message || 'İstek başarısız');
    } finally { setLoading(false); }
  };

  // GPS ile doğrudan vakit (timesForGPS) ve yer adı
  const fetchTimesVakitGPS = async (lat, lng) => {
    setLoading(true); setError(null);
    try {
      const tUrl = new URL(`${VAKIT_BASE}/api/timesForGPS`);
      tUrl.searchParams.set('lat', String(lat));
      tUrl.searchParams.set('lng', String(lng));
      tUrl.searchParams.set('date', new Date().toISOString().slice(0,10));
      tUrl.searchParams.set('days', '1');
      tUrl.searchParams.set('timezoneOffset', String(tzOffsetMinutes));
      tUrl.searchParams.set('calculationMethod', 'Turkey');
      tUrl.searchParams.set('lang', 'tr');
      const res = await fetch(tUrl.toString());
      if (!res.ok) throw new Error('Vakit servisi hatası');
      const payload = await res.json();
      const parsed = parseTimesPayload(payload);
      const timesMap = parsed.times;
      const np = computeNext(timesMap);
      setTimes({
        date: parsed.date,
        city: '',
        district: '',
        times: timesMap,
        next_prayer: np,
        timezone: 'Europe/Istanbul',
        source: 'vakit.vercel.app:gps',
      });

      // Yer adı
      const pUrl = new URL(`${VAKIT_BASE}/api/place`);
      pUrl.searchParams.set('lat', String(lat));
      pUrl.searchParams.set('lng', String(lng));
      pUrl.searchParams.set('lang', 'tr');
      const pres = await fetch(pUrl.toString());
      if (pres.ok) {
        const pl = await pres.json();
        setLocationLabel(`${pl?.name || ''}${pl?.stateName ? ' / ' + pl.stateName : ''}`);
      }
      try { if (window.MihmandarBridge?.setLocation) window.MihmandarBridge.setLocation(lat, lng); } catch {}
    } catch (e) {
      setError(e.message || 'İstek başarısız');
    } finally { setLoading(false); }
  };

  // İlk yüklemede: cookie/localStorage'dan konum oku; yoksa IP ile yaklaşık konum ve vakit
  useEffect(() => {
    (async () => {
      try {
        const saved = typeof window !== 'undefined' ? window.localStorage.getItem('prayer_location') : null;
        if (saved) {
          const obj = JSON.parse(saved);
          if (obj?.placeId) { setSelectedPlace(obj); await fetchTimesVakitPlace(obj.placeId); return; }
          if (obj?.lat && obj?.lng) { setCoords({lat: obj.lat, lng: obj.lng}); await fetchTimesVakitGPS(obj.lat, obj.lng); return; }
        }
        const ipRes = await fetch(`${VAKIT_BASE}/api/ip`);
        if (ipRes.ok) {
          const ipD = await ipRes.json();
          if (ipD?.lat && ipD?.lng) {
            setCoords({ lat: ipD.lat, lng: ipD.lng });
            await fetchTimesVakitGPS(ipD.lat, ipD.lng);
            window.localStorage.setItem('prayer_location', JSON.stringify({ lat: ipD.lat, lng: ipD.lng }));
            return;
          }
        }
      } catch {}
      // IP başarısız ise default: İstanbul Place
      try {
        const sp = await fetch(`${VAKIT_BASE}/api/searchPlaces?q=Istanbul&lang=tr`);
        if (sp.ok) {
          const list = await sp.json();
          if (Array.isArray(list) && list[0]?.id) {
            const p = list[0];
            setSelectedPlace(p);
            await fetchTimesVakitPlace(p.id);
            window.localStorage.setItem('prayer_location', JSON.stringify({ placeId: p.id, name: p.name, stateName: p.stateName }));
            try { window.dispatchEvent(new Event('prayerLocationChanged')); } catch {}
          }
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arama önerileri (debounce)
  useEffect(() => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const url = new URL(`${VAKIT_BASE}/api/searchPlaces`);
        url.searchParams.set('q', query);
        url.searchParams.set('lang', 'tr');
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const list = await res.json();
        setSuggestions(list || []);
      } catch { setSuggestions([]); }
    }, 300);
  }, [query]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { setError('Tarayıcınız konum erişimini desteklemiyor.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        fetchTimesVakitGPS(latitude, longitude);
        try { 
          window.localStorage.setItem('prayer_location', JSON.stringify({ lat: latitude, lng: longitude }));
          window.dispatchEvent(new Event('prayerLocationChanged'));
          try { if (window.MihmandarBridge?.setLocation) window.MihmandarBridge.setLocation(latitude, longitude); } catch {}
        } catch {}
      },
      (err) => setError('Konum izni reddedildi veya alınamadı.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleManualEnter = async (e) => {
    if (e.key !== 'Enter' || !query.trim()) return;
    try {
      const url = new URL(`${VAKIT_BASE}/api/searchPlaces`);
      url.searchParams.set('q', query.trim());
      url.searchParams.set('lang', 'tr');
      const res = await fetch(url.toString());
      if (!res.ok) return;
      const list = await res.json();
      if (Array.isArray(list) && list[0]?.id) {
        setSelectedPlace(list[0]);
        await fetchTimesVakitPlace(list[0].id);
      }
    } catch {}
  };

  // Aylık ve favoriler fonksiyonları kaldırıldı

  return (
    <div className={"min-h-screen pb-24 bg-white"}>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Namaz Vakitleri</h1>

        {/* Timeline kaldırıldı */}

        {/* Önce günün vakitleri kartı */}
        {loading && <div className="bg-white border rounded-xl p-6 text-center">Yükleniyor…</div>}
        {error && <div className="bg-white border rounded-xl p-6 text-center text-red-600">Hata: {error}</div>}
        {isHydrated && times && !loading && !error && (
          <div className="relative overflow-hidden rounded-3xl border p-8 shadow-xl mb-8 bg-white">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500 rounded-full -translate-x-16 -translate-y-16"></div>
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-500 rounded-full translate-x-12 translate-y-12"></div>
            </div>
            
            <div className="relative">
              {/* Enhanced Header */}
              <div className="flex flex-wrap items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7v10c0 5.55 3.84 10 9 10s9-4.45 9-10V7l-10-5z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 flex items-center gap-2" suppressHydrationWarning>
                        📅 {isHydrated ? new Date(times.date).toLocaleDateString('tr-TR') : ''} • <span className="text-slate-700">{isHydrated ? new Intl.DateTimeFormat('tr-TR-u-ca-islamic', { day:'numeric', month:'long', year:'numeric' }).format(new Date(times.date)) : ''}</span>
                      </p>
                      <h2 className="text-2xl font-bold text-slate-900">
                        📍 {locationLabel || `${times.city || ''}${times.district ? ' / ' + times.district : ''}`}
                      </h2>
                      {/* Tek gösterim tercih edildi: sağdaki rozet kalacak */}
                    </div>
                  </div>
                </div>
                
                {/* Header Next Prayer Badge with animation (single source) */}
                {times.next_prayer?.name && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                    <span className="relative inline-flex items-center justify-center w-5 h-5">
                      <span className="absolute inline-flex h-4 w-4 rounded-full bg-emerald-400 opacity-40 animate-ping"></span>
                      <svg className="relative w-5 h-5 text-emerald-600 animate-spin" style={{ animationDuration: '6s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="9" className="opacity-20" />
                        <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m12.364-6.364l-2.121 2.121M8.757 15.243l-2.121 2.121m10.607 0l-2.121-2.121M8.757 8.757 6.636 6.636"/>
                      </svg>
                    </span>
                    <span className="font-semibold">{times.next_prayer?.name}</span>
                    <span>— {times.next_prayer?.time} (≈ {times.next_prayer?.remaining_minutes} dk)</span>
                  </div>
                )}
              </div>

              {/* Grid + Widget CTA yan yana */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {Object.entries(times.times).map(([k,v], index) => {
                      const icons = { imsak: '🌙', gunes: '🌅', ogle: '☀️', ikindi: '🌆', aksam: '🌇', yatsi: '🌃' };
                      return (
                        <div key={k} className={"relative overflow-hidden rounded-2xl p-4 text-center bg-slate-50 border shadow-sm"} style={{animationDelay: `${index * 100}ms`}}>
                          <div className="text-2xl mb-2">{icons[k]}</div>
                          <div className="text-xs uppercase tracking-wider text-slate-600 mb-1">{k}</div>
                          <div className="text-xl font-bold text-slate-900">{v}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-blue-500 rounded-2xl p-5 text-white shadow-lg">
                  <div className="text-sm opacity-90 mb-2">Ana ekranınıza widget ekleyin</div>
                  <div className="text-2xl font-bold mb-3">📱 Namaz Widget&#39;ı EKLE</div>
                  <div className="text-xs opacity-90 mb-4">3x2 boyut • Sıradaki vakit • Kalan süre • Hijri tarih</div>
                  <button onClick={()=>{ try{ window.MihmandarBridge?.addWidget?.(); }catch(e){} }} className="w-full bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl py-3 font-semibold">Widget&#39;ı Ana Ekrana Ekle</button>
                  <div className="mt-3 text-[11px] opacity-90">İlk kurulumda: {beforeMinutes} dk önce bildirim ve vakitte ezan sesi açık olur. Sonradan kapatabilirsiniz.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Search Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 order-1 md:order-none shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🔍</span>
              </div>
              <label className="text-lg font-semibold text-slate-700">Şehir/İlçe Ara</label>
            </div>
            <input
              value={query}
              onChange={(e)=> setQuery(e.target.value)}
              onKeyDown={handleManualEnter}
              placeholder="Örn: Keçiören, Fatih, Üsküdar"
              className="w-full border-2 border-blue-200 rounded-xl p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            {suggestions?.length > 0 && (
              <div className="mt-3 max-h-48 overflow-auto border-2 border-blue-200 rounded-xl bg-white">
                {suggestions.map((s)=> (
                  <button
                    key={s.id}
                    onClick={()=> { setSelectedPlace(s); setQuery(`${s.name} / ${s.stateName || s.country}`); setSuggestions([]); fetchTimesVakitPlace(s.id); }}
                    className="block w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-blue-100 last:border-b-0"
                  >
                    <span className="font-medium text-slate-800">{s.name}</span>
                    <span className="text-slate-500 block text-sm">{s.stateName ? `${s.stateName}` : ''} {s.country ? ` (${s.country})` : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nearby Places Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-6 order-2 md:order-none shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🗺️</span>
              </div>
              <label className="text-lg font-semibold text-slate-700">Yakınımdakiler</label>
            </div>
            <p className="text-sm text-slate-600 mb-4">Konum izni verdiğinizde çevrenizdeki yerleri listeler.</p>
            <button
              onClick={async ()=>{
                if (!navigator.geolocation) { setError('Tarayıcınız konum erişimini desteklemiyor.'); return; }
                navigator.geolocation.getCurrentPosition(async (pos)=>{
                  const { latitude, longitude } = pos.coords;
                  setCoords({ lat: latitude, lng: longitude });
                  try {
                    const nb = new URL(`${VAKIT_BASE}/api/nearByPlaces`);
                    nb.searchParams.set('lat', String(latitude));
                    nb.searchParams.set('lng', String(longitude));
                    nb.searchParams.set('lang', 'tr');
                    const r = await fetch(nb.toString());
                    if (r.ok) {
                      const list = await r.json();
                      setSuggestions(list || []);
                    }
                  } catch {}
                }, ()=>setError('Konum alınamadı'));
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl py-3 font-semibold hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🌍 Yakınımdakileri Listele
            </button>
          </div>

          {/* GPS Location Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-100 p-6 flex flex-col justify-between order-3 md:order-none shadow-lg hover:shadow-xl transition-all duration-300">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">📍</span>
                </div>
                <label className="text-lg font-semibold text-slate-700">GPS Konumum</label>
              </div>
              <p className="text-sm text-slate-600 mb-4">İzin verdiğinizde bulunduğunuz konuma göre vakitler hesaplanır.</p>
            </div>
            <button 
              onClick={handleUseMyLocation} 
              className="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl py-3 font-semibold hover:from-emerald-600 hover:to-green-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🎯 Konumumu Kullan
            </button>
          </div>
        </div>

        {/* Kıble pusulası */}
        {coords?.lat && coords?.lng && (
          <div className="mt-6 bg-white rounded-2xl border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Kıble Pusulası</h3>
            <QiblaCompass lat={coords.lat} lng={coords.lng} />
          </div>
        )}

        {/* Aylık vakitler kaldırıldı */}
        
        {/* Ayarlar Bölümü: Ezan, Bildirim, Widget Tema (hydrate olduktan sonra göster) */}
        {isHydrated && (
        <div className="mt-8 space-y-6">
          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">🔊 Ezan Ayarları</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-3 p-3 rounded-xl border">
                <input type="checkbox" checked={ezanEnabled} onChange={(e)=>{ setEzanEnabled(e.target.checked); const v={enabled:e.target.checked, ezanType, volume:ezanVolume}; localStorage.setItem('ezan_settings', JSON.stringify(v)); try{window.MihmandarBridge?.setEzanSettings?.(v)}catch{}}} />
                <span>Ezan sesi açık</span>
              </label>
              <div className="p-3 rounded-xl border">
                <div className="text-sm text-slate-600 mb-2">Ezan türü</div>
                <select value={ezanType} onChange={(e)=>{ setEzanType(e.target.value); const v={enabled:ezanEnabled, ezanType:e.target.value, volume:ezanVolume}; localStorage.setItem('ezan_settings', JSON.stringify(v)); try{window.MihmandarBridge?.setEzanSettings?.(v)}catch{}}} className="w-full border rounded-lg p-2">
                  <option value="traditional">Geleneksel</option>
                  <option value="modern">Modern</option>
                  <option value="builtin">Basit</option>
                </select>
              </div>
              <div className="p-3 rounded-xl border">
                <div className="text-sm text-slate-600 mb-2">Ses düzeyi: {(ezanVolume*100)|0}%</div>
                <input type="range" min="0" max="1" step="0.01" value={ezanVolume} onChange={(e)=>{ const val=Number(e.target.value); setEzanVolume(val); const v={enabled:ezanEnabled, ezanType, volume:val}; localStorage.setItem('ezan_settings', JSON.stringify(v)); try{window.MihmandarBridge?.setEzanSettings?.(v)}catch{}}} className="w-full"/>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">🔔 Bildirim Ayarları</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-3 p-3 rounded-xl border">
                <input type="checkbox" checked={notifyEnabled} onChange={(e)=>{ setNotifyEnabled(e.target.checked); const v={enabled:e.target.checked, beforeMinutes}; localStorage.setItem('notification_settings', JSON.stringify(v)); try{window.MihmandarBridge?.setNotificationSettings?.(v)}catch{}}} />
                <span>Bildirimler açık</span>
              </label>
              <div className="p-3 rounded-xl border">
                <div className="text-sm text-slate-600 mb-2">Vakitten önce uyar</div>
                <input type="number" min="0" max="60" value={beforeMinutes} onChange={(e)=>{ const vNum = Math.max(0, Math.min(60, Number(e.target.value)||0)); setBeforeMinutes(vNum); const v={enabled:notifyEnabled, beforeMinutes:vNum}; localStorage.setItem('notification_settings', JSON.stringify(v)); try{window.MihmandarBridge?.setNotificationSettings?.(v)}catch{}}} className="w-full border rounded-lg p-2"/>
                <div className="text-xs text-slate-500 mt-1">Dakika</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">📱 Widget Tasarımı</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-xl border">
                <div className="text-sm text-slate-600 mb-2">Stil</div>
                <select value={widgetTheme.style} onChange={(e)=>{ const t={...widgetTheme, style:e.target.value}; setWidgetTheme(t); localStorage.setItem('widget_theme', JSON.stringify(t)); try{window.MihmandarBridge?.setWidgetTheme?.(t)}catch{}}} className="w-full border rounded-lg p-2">
                  <option value="compact">Kompakt</option>
                  <option value="modern">Modern</option>
                  <option value="full">Tam</option>
                </select>
              </div>
              <div className="p-3 rounded-xl border">
                <div className="text-sm text-slate-600 mb-2">Renk</div>
                <select value={widgetTheme.color} onChange={(e)=>{ const t={...widgetTheme, color:e.target.value}; setWidgetTheme(t); localStorage.setItem('widget_theme', JSON.stringify(t)); try{window.MihmandarBridge?.setWidgetTheme?.(t)}catch{}}} className="w-full border rounded-lg p-2">
                  <option value="emerald">Yeşil</option>
                  <option value="indigo">Mavi</option>
                  <option value="rose">Kırmızı</option>
                  <option value="amber">Turuncu</option>
                </select>
              </div>
              <div className="p-3 rounded-xl border flex items-end">
                <button onClick={()=>{ try{window.MihmandarBridge?.updateWidget?.({ theme: widgetTheme });}catch{} }} className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl py-3 font-semibold hover:from-emerald-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl">Widget&#39;ı Uygula</button>
              </div>
            </div>
          </div>
        </div>
        )}
        
      </div>
    </div>
  );
}

// Basit Kıble pusulası bileşeni (bearing hesaplayıp görsel ok döndürür)
function QiblaCompass({ lat, lng }) {
  const KAABA = { lat: 21.4225, lng: 39.8262 };
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const bearing = useMemo(() => {
    try {
      const φ1 = toRad(lat), φ2 = toRad(KAABA.lat);
      const Δλ = toRad(KAABA.lng - lng);
      const y = Math.sin(Δλ) * Math.cos(φ2);
      const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
      const θ = Math.atan2(y, x);
      const brng = (toDeg(θ) + 360) % 360;
      return Math.round(brng);
    } catch { return null; }
  }, [lat, lng, KAABA.lat, KAABA.lng]);
  const dirLabel = (deg) => {
    if (deg == null) return '';
    const dirs = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
    return dirs[Math.round(deg / 45) % 8];
  };
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-32 h-32 rounded-full border-2 border-slate-300 grid place-items-center">
        <div className="absolute inset-3 rounded-full border border-slate-200" />
        <div className="absolute top-1/2 left-1/2 w-0 h-0" style={{ transform: 'translate(-50%,-50%)' }}>
          <div className="origin-bottom h-12 w-1.5 bg-[#177267] rounded" style={{ transform: `rotate(${(bearing ?? 0)}deg) translateY(-24px)` }} />
        </div>
        <div className="text-xs text-slate-600">Kıble</div>
      </div>
      <div className="text-sm text-slate-700">
        <div><span className="font-semibold">Yön:</span> {bearing}° ({dirLabel(bearing)})</div>
        <div className="text-slate-500">Yaklaşık değer — cihaz pusulasına göre küçük farklar olabilir.</div>
      </div>
    </div>
  );
}