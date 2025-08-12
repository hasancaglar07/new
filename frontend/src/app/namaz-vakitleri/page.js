"use client";
import { useEffect, useRef, useState } from "react";

const VAKIT_BASE = 'https://vakit.vercel.app';

export default function PrayerTimesPage() {
  // Modlar ve veri
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [times, setTimes] = useState(null);
  const [locationLabel, setLocationLabel] = useState("");

  // GPS verisi
  const [coords, setCoords] = useState(null); // {lat,lng}

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
          window.localStorage.setItem('prayer_location', JSON.stringify({ lat, lng }));
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

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Namaz Vakitleri</h1>

        {/* Önce günün vakitleri kartı */}
        {loading && <div className="bg-white border rounded-xl p-6 text-center">Yükleniyor…</div>}
        {error && <div className="bg-white border rounded-xl p-6 text-center text-red-600">Hata: {error}</div>}
        {times && !loading && !error && (
          <div className="bg-white rounded-2xl border p-6 shadow-sm mb-6">
            <div className="flex flex-wrap items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-500">{new Date(times.date).toLocaleDateString('tr-TR')} • <span className="text-slate-600">{new Intl.DateTimeFormat('tr-TR-u-ca-islamic', { day:'numeric', month:'long', year:'numeric' }).format(new Date(times.date))}</span></p>
                <h2 className="text-xl font-bold text-slate-800">{locationLabel || `${times.city || ''}${times.district ? ' / ' + times.district : ''}`}</h2>
              </div>
              {times.next_prayer?.name && (
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold">Sıradaki: {times.next_prayer?.name} — {times.next_prayer?.time} (≈ {times.next_prayer?.remaining_minutes} dk)</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {Object.entries(times.times).map(([k,v]) => (
                <div key={k} className="rounded-xl border p-4 text-center">
                  <div className="text-xs uppercase text-slate-500">{k}</div>
                  <div className="text-lg font-bold text-slate-800">{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aksiyonlar altta */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-4 order-1 md:order-none">
            <label className="text-sm text-slate-600">Arama (Vakit - şehir/ilçe adı)</label>
            <input
              value={query}
              onChange={(e)=> setQuery(e.target.value)}
              onKeyDown={handleManualEnter}
              placeholder="Örn: Keçiören, Fatih, Üsküdar"
              className="mt-1 w-full border rounded-lg p-2"
            />
            {suggestions?.length > 0 && (
              <div className="mt-2 max-h-48 overflow-auto border rounded-lg">
                {suggestions.map((s)=> (
                  <button
                    key={s.id}
                    onClick={()=> { setSelectedPlace(s); setQuery(`${s.name} / ${s.stateName || s.country}`); setSuggestions([]); fetchTimesVakitPlace(s.id); }}
                    className="block w-full text-left px-3 py-2 hover:bg-slate-50"
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-slate-500">{s.stateName ? `, ${s.stateName}` : ''} {s.country ? ` (${s.country})` : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border p-4 order-2 md:order-none">
            <label className="text-sm text-slate-600">Yakınımdakiler (GPS)</label>
            <p className="text-xs text-slate-500">Konum izni verdiğinizde çevrenizdeki yerleri listeler.</p>
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
              className="mt-2 w-full bg-primary text-white rounded-lg py-2 font-semibold"
            >Yakınımdakileri Listele</button>
          </div>

          <div className="bg-white rounded-xl border p-4 flex flex-col justify-between order-3 md:order-none">
            <div>
              <label className="text-sm text-slate-600">Konumumdan bul (GPS)</label>
              <p className="text-xs text-slate-500">İzin verdiğinizde bulunduğunuz konuma göre vakitler hesaplanır.</p>
            </div>
            <button onClick={handleUseMyLocation} className="mt-2 w-full bg-emerald-600 text-white rounded-lg py-2 font-semibold">Konumumu Kullan</button>
          </div>
        </div>

        
      </div>
    </div>
  );
}