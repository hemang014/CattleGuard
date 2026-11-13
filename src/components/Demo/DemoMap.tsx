import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Circle, 
  Polyline, 
  Popup, 
  useMap, 
  useMapEvents,
  ScaleControl
} from 'react-leaflet';
import { 
  Layers, 
  Crosshair, 
  Radio, 
  Maximize2, 
  Minimize2, 
  Plus, 
  Minus, 
  Compass, 
  ShieldCheck, 
  AlertTriangle,
  MapPin,
  Flag,
  Move
} from 'lucide-react';
import { 
  createCattleMarkerIcon, 
  createGeofenceCenterIcon, 
  createSearchPinIcon,
  createDestinationPinIcon
} from '../Map/MapIcons';
import { formatCoordinates } from '../../utils/geo';
import { MapLayerType } from '../../types';
import { LocationSearchBar } from '../Map/LocationSearchBar';
import { MapLegend } from '../Map/MapLegend';

export type MapClickAction = 'herd' | 'center' | 'destination';

interface DemoMapProps {
  centerLat: number;
  centerLon: number;
  radiusM: number;
  herdLat: number;
  herdLon: number;
  destLat?: number;
  destLon?: number;
  isInside: boolean;
  distanceM: number;
  trail: Array<[number, number]>;
  onGeofenceCenterChange: (lat: number, lon: number) => void;
  onHerdPositionChange: (lat: number, lon: number, isManualDrag?: boolean) => void;
  onDestinationChange?: (lat: number, lon: number) => void;
  heightClass?: string;
}

// Map Ref capture helper (prevents useMap context errors outside MapContainer)
function MapRefSetter({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
}

// Map click router based on active click action
function DemoMapClickHandler({
  clickAction,
  onGeofenceCenterChange,
  onHerdPositionChange,
  onDestinationChange,
}: {
  clickAction: MapClickAction;
  onGeofenceCenterChange: (lat: number, lon: number) => void;
  onHerdPositionChange: (lat: number, lon: number, isManualDrag?: boolean) => void;
  onDestinationChange?: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (clickAction === 'herd') {
        onHerdPositionChange(e.latlng.lat, e.latlng.lng, true);
      } else if (clickAction === 'center') {
        onGeofenceCenterChange(e.latlng.lat, e.latlng.lng);
      } else if (clickAction === 'destination' && onDestinationChange) {
        onDestinationChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export const DemoMap: React.FC<DemoMapProps> = ({
  centerLat,
  centerLon,
  radiusM,
  herdLat,
  herdLon,
  destLat,
  destLon,
  isInside,
  distanceM,
  trail = [],
  onGeofenceCenterChange,
  onHerdPositionChange,
  onDestinationChange,
  heightClass = 'h-[500px] lg:h-[580px]',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [mapType, setMapType] = useState<MapLayerType>('street');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [clickAction, setClickAction] = useState<MapClickAction>('herd');
  const [searchPin, setSearchPin] = useState<{ lat: number; lon: number; label: string } | null>(null);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  // Search result handler
  const handleSelectSearchResult = (lat: number, lon: number, name: string) => {
    setSearchPin({ lat, lon, label: name });
    mapInstance?.setView([lat, lon], 17);
  };

  // Center on herd
  const handleCenterOnHerd = () => {
    mapInstance?.setView([herdLat, herdLon], 17);
  };

  // Center on geofence center
  const handleCenterOnGeofence = () => {
    mapInstance?.setView([centerLat, centerLon], 16);
  };

  // Herd marker drag end handler
  const handleMarkerDragEnd = (e: L.DragEndEvent) => {
    const marker = e.target;
    const position = marker.getLatLng();
    onHerdPositionChange(position.lat, position.lng, true);
  };

  // Layer config
  const layerConfig = useMemo(() => {
    switch (mapType) {
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri &mdash; Maxar, Earthstar Geographics',
          maxZoom: 19,
          hasLabelsOverlay: true,
        };
      case 'terrain':
        return {
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attribution: 'Map: &copy; OpenStreetMap, SRTM | Style: OpenTopoMap',
          maxZoom: 17,
          hasLabelsOverlay: false,
        };
      case 'street':
      default:
        return {
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
          hasLabelsOverlay: false,
        };
    }
  }, [mapType]);

  const cattleIcon = useMemo(() => {
    return createCattleMarkerIcon(!isInside, false);
  }, [isInside]);

  const centerIcon = useMemo(() => {
    return createGeofenceCenterIcon();
  }, []);

  const searchIcon = useMemo(() => {
    return createSearchPinIcon();
  }, []);

  const destIcon = useMemo(() => {
    return createDestinationPinIcon();
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full ${isFullscreen ? 'h-screen' : heightClass} rounded-2xl overflow-hidden border border-[#E3E8E3] shadow-card bg-[#F0F3EF] flex flex-col`}
    >
      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 z-[500] flex flex-wrap items-center gap-2 max-w-[calc(100%-4rem)]">
        {/* Search Bar */}
        <LocationSearchBar onSelectLocation={handleSelectSearchResult} />

        {/* 3 Map Layers Selector (Street Default, Satellite + Labels, Terrain) */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl p-1 shadow-md border border-[#E3E8E3] flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMapType('street')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mapType === 'street'
                ? 'bg-[#123C2D] text-white shadow-xs'
                : 'text-[#7A8980] hover:text-[#202B26] hover:bg-gray-100'
            }`}
          >
            Streets
          </button>
          <button
            type="button"
            onClick={() => setMapType('satellite')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              mapType === 'satellite'
                ? 'bg-[#123C2D] text-white shadow-xs'
                : 'text-[#7A8980] hover:text-[#202B26] hover:bg-gray-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Satellite + Labels
          </button>
          <button
            type="button"
            onClick={() => setMapType('terrain')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mapType === 'terrain'
                ? 'bg-[#123C2D] text-white shadow-xs'
                : 'text-[#7A8980] hover:text-[#202B26] hover:bg-gray-100'
            }`}
          >
            Terrain
          </button>
        </div>

        {/* Map Click Interaction Mode Switcher */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl p-1 shadow-md border border-[#E3E8E3] flex items-center gap-1">
          <button
            type="button"
            onClick={() => setClickAction('herd')}
            title="Click on map to position herd"
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              clickAction === 'herd'
                ? 'bg-[#21865B] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#123C2D] hover:bg-gray-50'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>Click: Move Herd</span>
          </button>

          <button
            type="button"
            onClick={() => setClickAction('center')}
            title="Click on map to reposition geofence center"
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              clickAction === 'center'
                ? 'bg-[#123C2D] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#123C2D] hover:bg-gray-50'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Click: Set Center</span>
          </button>

          <button
            type="button"
            onClick={() => setClickAction('destination')}
            title="Click on map to set route destination"
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              clickAction === 'destination'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-blue-700 hover:bg-gray-50'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Click: Set Target</span>
          </button>
        </div>
      </div>

      {/* Top-Right Map Controls Toolbar */}
      <div className="absolute top-3 right-3 z-[500] flex flex-col items-center gap-2">
        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
          className="p-2.5 bg-white/95 hover:bg-white text-[#123C2D] rounded-xl shadow-md border border-[#E3E8E3] transition-all hover:scale-105 active:scale-95"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Center on Herd Marker */}
        <button
          type="button"
          onClick={handleCenterOnHerd}
          title="Center map on Herd"
          className="p-2.5 bg-white/95 hover:bg-white text-[#123C2D] rounded-xl shadow-md border border-[#E3E8E3] transition-all hover:scale-105 active:scale-95"
        >
          <Crosshair className="w-4 h-4 text-[#21865B]" />
        </button>

        {/* Center on Geofence Center */}
        <button
          type="button"
          onClick={handleCenterOnGeofence}
          title="Center map on Geofence Centre"
          className="p-2.5 bg-white/95 hover:bg-white text-[#123C2D] rounded-xl shadow-md border border-[#E3E8E3] transition-all hover:scale-105 active:scale-95"
        >
          <Radio className="w-4 h-4 text-[#123C2D]" />
        </button>

        {/* Zoom In & Out */}
        <div className="flex flex-col bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-[#E3E8E3] overflow-hidden">
          <button
            type="button"
            onClick={() => mapInstance?.zoomIn()}
            title="Zoom In"
            className="p-2 text-gray-700 hover:bg-[#E8F4EC] hover:text-[#123C2D] border-b border-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => mapInstance?.zoomOut()}
            title="Zoom Out"
            className="p-2 text-gray-700 hover:bg-[#E8F4EC] hover:text-[#123C2D] transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* North Indicator */}
        <div 
          title="North Compass"
          className="p-2 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-[#E3E8E3] flex flex-col items-center justify-center select-none"
        >
          <Compass className="w-4 h-4 text-red-600 animate-spin-slow" />
          <span className="text-[9px] font-extrabold text-red-600 leading-none mt-0.5">N</span>
        </div>
      </div>

      {/* Bottom Floating Bar: Legend & Status Pill */}
      <div className="absolute bottom-3 left-3 right-3 z-[500] flex flex-wrap items-end justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto">
          <MapLegend />
        </div>

        <div className="pointer-events-auto">
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md shadow-md border flex items-center gap-2 ${
            !isInside
              ? 'bg-[#D94F50] text-white border-red-300 animate-pulse'
              : 'bg-white/95 text-[#123C2D] border-[#E3E8E3]'
          }`}>
            {!isInside ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-200" />
                <span>SIMULATED BREACH: {distanceM}m from center (Safe Radius: {radiusM}m)</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-[#21865B]" />
                <span>SIMULATED SAFE ZONE &bull; {distanceM}m from center (Radius: {radiusM}m)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Leaflet Map */}
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={16}
        zoomControl={false}
        scrollWheelZoom={true}
        className="w-full h-full flex-1"
      >
        <MapRefSetter onMap={setMapInstance} />
        <DemoMapClickHandler
          clickAction={clickAction}
          onGeofenceCenterChange={onGeofenceCenterChange}
          onHerdPositionChange={onHerdPositionChange}
          onDestinationChange={onDestinationChange}
        />

        {/* Base Map Layer */}
        <TileLayer
          key={mapType}
          attribution={layerConfig.attribution}
          url={layerConfig.url}
          maxZoom={layerConfig.maxZoom}
        />

        {/* Satellite Map Transparent Labels Overlay */}
        {mapType === 'satellite' && (
          <>
            <TileLayer
              attribution="&copy; Esri Reference & Places"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
              opacity={0.9}
            />
            <TileLayer
              attribution="&copy; Esri Transportation"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
              opacity={0.8}
            />
          </>
        )}

        {/* Circular Safe Zone Boundary */}
        <Circle
          center={[centerLat, centerLon]}
          radius={radiusM}
          pathOptions={{
            color: !isInside ? '#D94F50' : '#21865B',
            fillColor: !isInside ? '#D94F50' : '#21865B',
            fillOpacity: !isInside ? 0.22 : 0.14,
            weight: 2.5,
            dashArray: !isInside ? '6, 6' : undefined,
          }}
        />

        {/* Geofence Centre Marker */}
        <Marker
          position={[centerLat, centerLon]}
          icon={centerIcon}
        >
          <Popup>
            <div className="p-1 text-xs">
              <p className="font-bold text-[#123C2D]">Geofence Centre</p>
              <p className="text-gray-600 mt-1">Lat: {centerLat.toFixed(6)}</p>
              <p className="text-gray-600">Lon: {centerLon.toFixed(6)}</p>
              <p className="text-emerald-700 font-semibold mt-1">Safe Radius: {radiusM}m</p>
            </div>
          </Popup>
        </Marker>

        {/* Simulated Movement Trail */}
        {trail.length > 1 && (
          <Polyline
            positions={trail}
            pathOptions={{
              color: '#059669',
              weight: 3.5,
              opacity: 0.8,
            }}
          />
        )}

        {/* Planned Path to Destination */}
        {destLat !== undefined && destLon !== undefined && (
          <Polyline
            positions={[[herdLat, herdLon], [destLat, destLon]]}
            pathOptions={{
              color: '#2563EB',
              weight: 2,
              dashArray: '6, 6',
              opacity: 0.7,
            }}
          />
        )}

        {/* Destination Target Marker */}
        {destLat !== undefined && destLon !== undefined && (
          <Marker position={[destLat, destLon]} icon={destIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <p className="font-bold text-blue-700">Simulation Target Destination</p>
                <p className="text-gray-600 mt-1">Target Lat: {destLat.toFixed(6)}</p>
                <p className="text-gray-600">Target Lon: {destLon.toFixed(6)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Draggable Herd Marker */}
        <Marker
          position={[herdLat, herdLon]}
          icon={cattleIcon}
          draggable={true}
          eventHandlers={{
            dragend: handleMarkerDragEnd,
          }}
        >
          <Popup>
            <div className="p-1 text-xs min-w-[190px]">
              <div className="flex items-center justify-between gap-2 border-b pb-1 mb-1.5">
                <span className="font-bold text-sm text-[#202B26]">Simulated Herd</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold text-white ${
                  !isInside ? 'bg-[#D94F50]' : 'bg-[#21865B]'
                }`}>
                  {!isInside ? 'OUTSIDE' : 'SAFE'}
                </span>
              </div>
              <p className="text-gray-600"><span className="font-semibold">Coordinates:</span> {formatCoordinates(herdLat, herdLon)}</p>
              <p className="text-gray-600 mt-0.5"><span className="font-semibold">Distance:</span> {distanceM}m</p>
              <p className="text-gray-600"><span className="font-semibold">Safe Radius:</span> {radiusM}m</p>
              <p className="text-[10px] text-gray-400 mt-2 italic">Drag marker to test real-time perimeter detection</p>
            </div>
          </Popup>
        </Marker>

        {/* Search Result Pin */}
        {searchPin && (
          <Marker position={[searchPin.lat, searchPin.lon]} icon={searchIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <p className="font-bold text-amber-700">Search Result</p>
                <p className="text-gray-700 mt-1">{searchPin.label}</p>
              </div>
            </Popup>
          </Marker>
        )}

        <ScaleControl position="bottomleft" imperial={false} />
      </MapContainer>
    </div>
  );
};
