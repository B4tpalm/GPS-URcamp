import React, { useRef, useState } from 'react';
import {
  MapContainer,
  ImageOverlay,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Image dimensions (e.g., 1000x1000 px)
const bounds = [[0, 0], [1000, 1000]];

// Your building points
const points = [
  { name: "Entrance", coords: [100, 200] },
  { name: "Room A", coords: [400, 300] },
  { name: "Room B", coords: [700, 700] },
  { name: "Restroom", coords: [600, 400] },
];

// Fix marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function FlyToLocation({ coords }) {
  const map = useMap();
  if (coords) {
    map.flyTo(coords, map.getZoom());
  }
  return null;
}

export default function App() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const markerRefs = useRef({});

  const handleSelect = (point) => {
    setSelected(point.coords);
    setSearch('');
    // Open the marker popup after short delay
    setTimeout(() => {
      const marker = markerRefs.current[point.name];
      if (marker) marker.openPopup();
    }, 500);
  };

  const filtered = points.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      {/* Search input */}
      <input
        type="text"
        placeholder="Search location..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          position: 'absolute',
          top: 10,
          left: 50,
          zIndex: 1000,
          padding: '8px',
          width: '200px',
          borderRadius: '5px',
          border: '1px solid gray'
        }}
      />

      {/* Suggestions dropdown */}
      {search && (
        <div
          style={{
            position: 'absolute',
            top: 45,
            left: 10,
            zIndex: 1000,
            background: 'white',
            border: '1px solid gray',
            width: '200px',
            maxHeight: '150px',
            overflowY: 'auto',
            borderRadius: '5px'
          }}
        >
          {filtered.map((p, i) => (
            <div
              key={i}
              onClick={() => handleSelect(p)}
              style={{
                padding: '6px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee'
              }}
            >
              {p.name}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '6px', color: '#999' }}>
              No matches
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        style={{ height: '100%', width: '100%' }}
      >
        <ImageOverlay url="/floorplan.png" bounds={bounds} />

        {points.map((point, i) => (
          <Marker
            key={i}
            position={point.coords}
            ref={(ref) => markerRefs.current[point.name] = ref}
          >
            <Popup>{point.name}</Popup>
          </Marker>
        ))}

        <Polyline
          positions={points.map(p => p.coords)}
          color="blue"
        />

        {selected && <FlyToLocation coords={selected} />}
      </MapContainer>
    </div>
  );
}
