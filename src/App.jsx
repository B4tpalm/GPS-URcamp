import React, { useState, useRef } from 'react';
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

// Floor plan bounds (adjust to your image)
const bounds = [[0, 0], [805, 922]];
const cellSize = 50; // pixels per cell (adjust based on your image)

// Grid: 0 = walkable, 1 = wall (example 20x20 grid)
const gridData = [
  [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const points = [
  { name: "Entrance", coords: [125, 50], grid: [2, 1], type: 'entry' },
  { name: "Room A", coords: [400, 300], grid: [10, 10], type: 'room' },
  { name: "Room B", coords: [700, 700], grid: [4, 14], type: 'room' },
  { name: "Restroom", coords: [600, 400], grid: [4, 10], type: 'restroom' },
  { name: "Elevator", coords: [500, 600], grid: [4, 12], type: 'elevator' },
];

// Fix marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function FlyToLocation({ coords }) {
  const map = useMap();
  if (coords) map.flyTo(coords, map.getZoom());
  return null;
}

const toLeafletCoords = ([row, col]) => [row * cellSize + cellSize / 2, col * cellSize + cellSize / 2];

function findPath(grid, start, end) {
  const [startRow, startCol] = start;
  const [endRow, endCol] = end;
  const numRows = grid.length;
  const numCols = grid[0].length;
  const visited = new Set();
  const queue = [[startRow, startCol, []]];

  const isValid = (r, c) =>
    r >= 0 && r < numRows && c >= 0 && c < numCols && grid[r][c] === 0;

  const directions = [
    [0, 1], [1, 0], [0, -1], [-1, 0] // right, down, left, up
  ];

  while (queue.length) {
    const [r, c, path] = queue.shift();
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const newPath = [...path, [r, c]];
    if (r === endRow && c === endCol) return newPath;

    for (const [dr, dc] of directions) {
      const newRow = r + dr;
      const newCol = c + dc;
      if (isValid(newRow, newCol)) {
        queue.push([newRow, newCol, newPath]);
      }
    }
  }

  return [];
}

export default function App() {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [pathCoords, setPathCoords] = useState(null);
  const [search, setSearch] = useState('');
  const markerRefs = useRef({});

  const calculatePath = (startGrid, endGrid) => {
    const gridPath = findPath(gridData, startGrid, endGrid);
    return gridPath.map(toLeafletCoords);
  };

  const handleMarkerClick = (point) => {
    if (!origin || (origin && destination)) {
      setOrigin(point);
      setDestination(null);
      setPathCoords(null);
    } else if (!destination && point.name !== origin.name) {
      setDestination(point);
      const path = calculatePath(origin.grid, point.grid);
      setPathCoords(path);
    }
  };

  const handleSearchSelect = (point) => {
    setSearch('');
    if (!origin || (origin && destination)) {
      setOrigin(point);
      setDestination(null);
      setPathCoords(null);
    } else if (!destination && point.name !== origin.name) {
      setDestination(point);
      const path = calculatePath(origin.grid, point.grid);
      setPathCoords(path);
    }
    setTimeout(() => {
      const marker = markerRefs.current[point.name];
      if (marker) marker.openPopup();
    }, 300);
  };

  const filtered = points.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      <input
        type="text"
        placeholder="Search location..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          position: 'absolute',
          top: 10,
          left: 600,
          zIndex: 1000,
          padding: '8px',
          width: '220px',
          borderRadius: '5px',
          border: '1px solid gray'
        }}
      />

      {search && (
        <div
          style={{
            position: 'absolute',
            top: 45,
            left: 10,
            zIndex: 1000,
            background: 'white',
            border: '1px solid gray',
            width: '220px',
            maxHeight: '150px',
            overflowY: 'auto',
            borderRadius: '5px'
          }}
        >
          {filtered.map((p, i) => (
            <div
              key={i}
              onClick={() => handleSearchSelect(p)}
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
            <div style={{ padding: '6px', color: '#999' }}>No matches</div>
          )}
        </div>
      )}

      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        style={{ height: '100%', width: '100%' }}
      >
        <ImageOverlay url="/Mapa2.png" bounds={bounds} />

        {points.map((point, i) => (
          <Marker
            key={i}
            position={point.coords}
            eventHandlers={{ click: () => handleMarkerClick(point) }}
            ref={(ref) => (markerRefs.current[point.name] = ref)}
          >
            <Popup>
              <strong>{point.name}</strong><br />
              Type: {point.type}<br />
              {origin?.name === point.name && 'Origin'}
              {destination?.name === point.name && 'Destination'}
            </Popup>
          </Marker>
        ))}

        {pathCoords && <Polyline positions={pathCoords} color="blue" />}
        {origin && <FlyToLocation coords={origin.coords} />}
      </MapContainer>
    </div>
  );
}
