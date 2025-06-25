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

// Floor plan bounds (matching your image dimensions)
const bounds = [[0, 0], [805, 922]];
const GRID_ROWS = 20;
const GRID_COLS = 20;

// Calculate cell size based on image dimensions
const cellHeight = 805 / GRID_ROWS; // ~40.25
const cellWidth = 922 / GRID_COLS;  // ~46.1

// Grid: 0 = walkable, 1 = wall
const gridData = [
  // Linha 0: parede superior
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  // Linha 1-4: A.S. + Cozinha + Banheiro + parte dos dormitórios
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  // Linha 5-8: Circulação central
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  // Linha 9-12: Área de jantar e estar
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  // Linha 13-16: Área inferior
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  // Linha 17-19: Área da entrada
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];


// Function to convert pixel coordinates to grid coordinates
const pixelToGrid = (pixelCoords) => {
  const [y, x] = pixelCoords; // Note: Leaflet uses [lat, lng] which maps to [y, x]
  const row = Math.floor(y / cellHeight);
  const col = Math.floor(x / cellWidth);
  return [Math.max(0, Math.min(GRID_ROWS - 1, row)), Math.max(0, Math.min(GRID_COLS - 1, col))];
};

// Function to convert grid coordinates to pixel coordinates
const gridToPixel = ([row, col]) => {
  const y = row * cellHeight + cellHeight / 2;
  const x = col * cellWidth + cellWidth / 2;
  return [y, x];
};

// Updated points with consistent coordinates
const points = [
  { name: "Entrada A", coords: [50, 630], type: 'entry' },
  { name: "O1A", coords: [100, 515], type: 'class' },
  { name: "O1B", coords: [100, 480], type: 'class' },
  { name: "LAB INF 04", coords: [100, 420], type: 'lab inf' },
  { name: "LAB INF 01", coords: [70, 320], type: 'lab inf' },
  { name: "LAB INF 02", coords: [125, 315], type: 'lab inf' },
  { name: "LAB INF 03", coords: [170, 300], type: 'lab inf' },
  { name: "03A", coords: [210, 320], type: 'class' },
  { name: "04A", coords: [260, 315], type: 'class' },
  { name: "05A", coords: [310, 315], type: 'class' },
  { name: "06A", coords: [360, 315], type: 'class' },
  { name: "07A", coords: [450, 300], type: 'class' },
  { name: "01B", coords: [750, 150], type: 'class' },
  { name: "02B", coords: [750, 230], type: 'class' },
  { name: "03B", coords: [670, 230], type: 'class' },
  { name: "04B", coords: [600, 230], type: 'class' },
  { name: "05B", coords: [630, 150], type: 'class' },
  { name: "01C", coords: [600, 330], type: 'class' },
  { name: "02C", coords: [700, 330], type: 'class' },
  { name: "03C", coords: [730, 390], type: 'class' },
  { name: "04C", coords: [650, 420], type: 'class' },
  { name: "05C", coords: [580, 420], type: 'class' },
  { name: "LAB ANAT.", coords: [720, 540], type: 'class' },
  { name: "HEMATOL. PARASIT. MICROBIOL.", coords: [750, 670], type: 'class' },
  { name: "BIOQ. IMUNOL.", coords: [720, 720], type: 'class' },
  { name: "QUÍMICA FARMACEUT", coords: [670, 710], type: 'class' },
  { name: "QUÍMICA ORGÂNICA", coords: [600, 710], type: 'class' },
  { name: "ESTER. ALMOX.", coords: [540, 710], type: 'class' },
  { name: "HOMEP.", coords: [600, 710], type: 'class' },
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

  const calculatePath = (startCoords, endCoords) => {
    const startGrid = pixelToGrid(startCoords);
    const endGrid = pixelToGrid(endCoords);
    
    // Check if start and end positions are walkable
    if (gridData[startGrid[0]] && gridData[startGrid[0]][startGrid[1]] === 1) {
      console.warn('Start position is not walkable, finding nearest walkable cell');
    }
    if (gridData[endGrid[0]] && gridData[endGrid[0]][endGrid[1]] === 1) {
      console.warn('End position is not walkable, finding nearest walkable cell');
    }
    
    const gridPath = findPath(gridData, startGrid, endGrid);
    if (gridPath.length === 0) {
      console.error('No path found between', startGrid, 'and', endGrid);
      return [];
    }
    
    return gridPath.map(gridToPixel);
  };

  const handleMarkerClick = (point) => {
    if (!origin || (origin && destination)) {
      setOrigin(point);
      setDestination(null);
      setPathCoords(null);
    } else if (!destination && point.name !== origin.name) {
      setDestination(point);
      const path = calculatePath(origin.coords, point.coords);
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
      const path = calculatePath(origin.coords, point.coords);
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
          left: 10,
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

      {/* Status display */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        background: 'rgba(255,255,255,0.9)',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px'
      }}>
        <div><strong>Origin:</strong> {origin ? origin.name : 'None'}</div>
        <div><strong>Destination:</strong> {destination ? destination.name : 'None'}</div>
        <div><strong>Path:</strong> {pathCoords ? `${pathCoords.length} points` : 'None'}</div>
      </div>

      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        style={{ height: '100%', width: '100%' }}
      >
        <ImageOverlay url="/Mapa_corujao_terreo.jpg" bounds={bounds} />

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
              Coords: [{point.coords[0].toFixed(1)}, {point.coords[1].toFixed(1)}]<br />
              Grid: [{pixelToGrid(point.coords).join(', ')}]<br />
              {origin?.name === point.name && <span style={{color: 'green'}}>✓ Origin</span>}<br />
              {destination?.name === point.name && <span style={{color: 'red'}}>✓ Destination</span>}
            </Popup>
          </Marker>
        ))}

        {pathCoords && pathCoords.length > 0 && (
          <Polyline 
            positions={pathCoords} 
            color="blue" 
            weight={4}
            opacity={0.7}
          />
        )}
        {origin && <FlyToLocation coords={origin.coords} />}
      </MapContainer>
    </div>
  );
}