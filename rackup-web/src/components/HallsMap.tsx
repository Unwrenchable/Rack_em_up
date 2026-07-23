import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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
L.Marker.prototype.options.icon = DefaultIcon;

type Props = {
  halls: Hall[];
  onSelect?: (hall: Hall) => void;
};

export function HallsMap({ halls, onSelect }: Props) {
  // Center on Las Vegas
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
        {halls.map((h) => (
          <Marker
            key={h.id}
            position={[h.lat, h.lon]}
            eventHandlers={{
              click: () => onSelect?.(h),
            }}
          >
            <Popup>
              <strong>{h.name}</strong>
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
