import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';

const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];
const DEFAULT_ZOOM_NO_PIN = 6;
const DEFAULT_ZOOM_WITH_PIN = 14;

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(L.Marker.prototype as any).options.icon = DefaultIcon;

type GeocodeHit = { label: string; lat: number; lng: number };

async function searchPhoton(query: string): Promise<GeocodeHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: Record<string, unknown>;
    }>;
  };
  const hits: GeocodeHit[] = [];
  for (const f of data.features ?? []) {
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const [lng, lat] = coords;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const p = f.properties ?? {};
    const parts = [
      typeof p.name === 'string' ? p.name : '',
      typeof p.street === 'string' ? p.street : '',
      typeof p.city === 'string' ? p.city : '',
      typeof p.country === 'string' ? p.country : '',
    ].filter(Boolean);
    hits.push({ label: parts.join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
  }
  return hits;
}

function MapResize({ visible }: { visible: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => window.clearTimeout(id);
  }, [map, visible]);
  return null;
}

/** react-leaflet MapContainer only uses initial center/zoom — keep map in sync. */
function SyncMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prev = useRef<string>('');
  useEffect(() => {
    const key = `${center[0].toFixed(6)},${center[1].toFixed(6)},${zoom}`;
    if (key === prev.current) return;
    prev.current = key;
    map.setView(center, zoom, { animate: false });
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

type Props = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  onCoordinatesChange: (lat: number, lng: number) => void;
  visible: boolean;
  /** Override default helper under the search field. */
  hint?: string;
};

export function VenueLocationMap({ latitude, longitude, onCoordinatesChange, visible, hint }: Props) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasSavedCoords =
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0);

  const [markerPos, setMarkerPos] = useState<[number, number] | null>(() =>
    hasSavedCoords ? [latitude as number, longitude as number] : null
  );

  useEffect(() => {
    if (!hasSavedCoords) return;
    setMarkerPos([latitude as number, longitude as number]);
  }, [hasSavedCoords, latitude, longitude]);

  const mapCenter = useMemo((): [number, number] => (markerPos ? markerPos : DEFAULT_CENTER), [markerPos]);
  const mapZoom = markerPos ? DEFAULT_ZOOM_WITH_PIN : DEFAULT_ZOOM_NO_PIN;

  const applyCoords = useCallback(
    (lat: number, lng: number) => {
      setMarkerPos([lat, lng]);
      onCoordinatesChange(lat, lng);
    },
    [onCoordinatesChange]
  );

  const runSearch = useCallback(async (q: string) => {
    setSearchError(null);
    setSearching(true);
    try {
      const list = await searchPhoton(q);
      setHits(list);
      if (list.length === 0 && q.trim().length >= 2) setSearchError('No results. Try a different search.');
    } catch {
      setSearchError('Search failed. Try again.');
      setHits([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearchError(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void runSearch(q);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const defaultHint =
    'Search for an address or place, pick a result, or click the map / drag the pin to set coordinates.';

  return (
    <div className="space-y-3 md:col-span-2">
      <div>
        <label htmlFor={searchId} className="block text-[12px] font-semibold text-ink-60">
          Find location on map
        </label>
        <p className="mt-0.5 text-[11px] text-ink-40">{hint ?? defaultHint}</p>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-40" strokeWidth={2} aria-hidden />
          <input
            id={searchId}
            type="search"
            autoComplete="off"
            placeholder="e.g. King Fahd Road, Riyadh"
            className="w-full rounded-xl border border-ink-10 py-2.5 pl-10 pr-3 text-[14px] outline-none ring-ink/10 focus:ring-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query.trim().length >= 2 && (hits.length > 0 || searching || searchError) ? (
            <ul className="absolute left-0 right-0 top-full z-[500] mt-1 max-h-52 overflow-auto rounded-xl border border-ink-10 bg-white py-1 shadow-card-sm">
              {searching ? (
                <li className="px-3 py-2 text-[13px] text-ink-60">Searching…</li>
              ) : searchError ? (
                <li className="px-3 py-2 text-[13px] text-coral">{searchError}</li>
              ) : (
                hits.map((h, i) => (
                  <li key={`${h.lat},${h.lng},${i}`}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-[13px] text-ink hover:bg-ink-5"
                      onClick={() => {
                        applyCoords(h.lat, h.lng);
                        setHits([]);
                        setQuery('');
                        setSearchError(null);
                      }}
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-40" strokeWidth={2} aria-hidden />
                      <span>{h.label}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-ink-10 ring-1 ring-ink/5">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM_NO_PIN}
          className="z-0 aspect-[16/10] min-h-[260px] w-full max-h-[420px]"
          scrollWheelZoom={false}
          attributionControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapResize visible={visible} />
          <SyncMapView center={mapCenter} zoom={mapZoom} />
          {markerPos ? (
            <Marker
              position={markerPos}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = e.target.getLatLng();
                  applyCoords(ll.lat, ll.lng);
                },
              }}
            />
          ) : null}
          <MapClickHandler onPick={applyCoords} />
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-60">
        <span>
          Latitude:{' '}
          <span className="font-mono text-ink">{markerPos ? markerPos[0].toFixed(6) : '—'}</span>
        </span>
        <span>
          Longitude:{' '}
          <span className="font-mono text-ink">{markerPos ? markerPos[1].toFixed(6) : '—'}</span>
        </span>
      </div>
    </div>
  );
}
