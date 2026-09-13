import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Hall } from '../lib/types';

// Fix default marker icons in Vite
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const VerifiedIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'hall-pin-verified',
});

L.Marker.prototype.options.icon = DefaultIcon;

type Props = {
  halls: Hall[];
  onSelect?: (hall: Hall) => void;
};

function hasCoords(h: Hall): boolean {
  return Number.isFinite(h.lat) && Number.isFinite(h.lon) && !(h.lat === 0 && h.lon === 0);
}

function MapSync({ halls }: { halls: Hall[] }) {
  const map = useMap();
  const signature = halls
    .map((h) => `${h.id}:${h.isVerified ? 1 : 0}:${h.lat}:${h.lon}`)
    .sort()
    .join('|');

  useEffect(() => {
    map.invalidateSize();
    const pts = halls.filter(hasCoords);
    if (pts.length === 0) return;
    const bounds = L.latLngBounds(pts.map((h) => [h.lat, h.lon] as [number, number]));
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.18), { maxZoom: 13, animate: true });
    }
  }, [map, signature, halls]);

  return null;
}

export function HallsMap({ halls, onSelect }: Props) {
  const pins = halls.filter(hasCoords);
  const center: [number, number] = [36.17, -115.14];
  return (
    <div style={{ height: 320, width: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapSync halls={pins} />
        {pins.map((h) => (
          <Marker
            key={`${h.id}:${h.isVerified ? 'v' : 'u'}`}
            position={[h.lat, h.lon]}
            icon={h.isVerified ? VerifiedIcon : DefaultIcon}
            eventHandlers={{
              click: () => onSelect?.(h),
            }}
          >
            <Popup>
              <strong>{h.name}</strong>
              {h.isVerified ? ' · Verified' : ''}
              <br />
              {h.address ?? 'Address TBD'}
              <br />
              <button
                type="button"
                style={{ marginTop: 8 }}
                onClick={() => {
                  const q = h.address
                    ? encodeURIComponent(h.address)
                    : `${h.lat},${h.lon}`;
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${q}`,
                    '_blank',
                    'noopener,noreferrer',
                  );
                }}
              >
                Open in Google Maps
              </button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
