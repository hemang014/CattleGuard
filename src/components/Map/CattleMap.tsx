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
  Clock,
  Satellite
} from 'lucide-react';
import { 
  createCattleMarkerIcon, 
  createGeofenceCenterIcon, 
  createSearchPinIcon 
} from './MapIcons';
import { formatCoordinates, formatRelativeTime, formatDateTime, getHdopRating } from '../../utils/geo';
import { DeviceLatestData, GeofenceConfig, MapLayerType } from '../../types';
import { LocationSearchBar } from './LocationSearchBar';
import { MapLegend } from './MapLegend';

interface CattleMapProps {
  geofence: GeofenceConfig;
  deviceData: DeviceLatestData | null;
  historyTrail?: Array<{ lat: number; lon: number; timestamp: number | string; outside?: boolean }>;
  isEditable?: boolean;
  onCenterChange?: (lat: number, lon: number) => void;
  heightClass?: string;
  showTrail?: boolean;
  activeAnimalLabel?: string;
  onMapClick?: (lat: number, lon: number) => void;
}

// Controller component to programmatically pan/zoom map
function MapController({ 
  center, 
  zoom 
}: { 
  center: [number, number]; 
  zoom?: number; 
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom(), { animate: true });
  }, [center, zoom, map]);
  return null;
}

// Helper to capture map instance from MapContainer
function MapRefSetter({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
}

// Map Click Handler for configuring Geofence
function MapClickHandler({ 
  isEditable, 
  onCenterChange,
  onMapClick 
}: { 
  isEditable?: boolean; 
  onCenterChange?: (lat: number, lon: number) => void;
  onMapClick?: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (isEditable && onCenterChange) {
        onCenterChange(e.latlng.lat, e.latlng.lng);
      }
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export const CattleMap: React.FC<CattleMapProps> = ({
  geofence,
  deviceData,
  historyTrail = [],
  isEditable = false,
  onCenterChange,
  heightClass = 'h-[480px] sm:h-[540px]',
  showTrail = true,
  activeAnimalLabel = 'Cattle Device 01',
  onMapClick,
}) => {
  // Layer A: Street Map is DEFAULT as requested in Section 2.A!
  const [mapType, setMapType] = useState<MapLayerType>('street');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchPin, setSearchPin] = useState<{ lat: number; lon: number; label: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Initial Coordinates: strictly [latitude, longitude]
  const initialCenter: [number, number] = useMemo(() => {
    if (deviceData?.latitude && deviceData?.longitude && (deviceData?.satellites ?? 0) >= 3) {
      return [deviceData.latitude, deviceData.longitude];
    }
    return [geofence.centerLat, geofence.centerLon];
  }, [deviceData?.latitude, deviceData?.longitude, deviceData?.satellites, geofence.centerLat, geofence.centerLon]);

  const [activeCenter, setActiveCenter] = useState<[number, number]>(initialCenter);
  const [activeZoom, setActiveZoom] = useState<number>(16);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const isOutside = Boolean(deviceData?.outside);
  const isGpsValid = Boolean(
    deviceData?.latitude && 
    deviceData?.longitude && 
    deviceData.latitude !== 0 && 
    deviceData.longitude !== 0 &&
    (deviceData?.satellites ?? 0) >= 3
  );

  const cattleIcon = useMemo(() => {
    return createCattleMarkerIcon(isOutside, !isGpsValid);
  }, [isOutside, isGpsValid]);

  const centerIcon = useMemo(() => {
    return createGeofenceCenterIcon();
  }, []);

  const searchIcon = useMemo(() => {
    return createSearchPinIcon();
  }, []);

  // Strict [latitude, longitude] points for route polyline
  const trailCoordinates: [number, number][] = useMemo(() => {
    return historyTrail
      .filter((p) => p.lat && p.lon && p.lat !== 0 && p.lon !== 0)
      .map((p) => [p.lat, p.lon]);
  }, [historyTrail]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  // Location search handler
  const handleSelectSearchResult = (lat: number, lon: number, name: string) => {
    setSearchPin({ lat, lon, label: name });
    setActiveCenter([lat, lon]);
    setActiveZoom(17);
    mapInstance?.setView([lat, lon], 17);
  };

  // Map Tile Layers definition
  const layerConfig = useMemo(() => {
    switch (mapType) {
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
          maxZoom: 19,
          hasLabelsOverlay: true,
        };
      case 'terrain':
        return {
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Style: &copy; OpenTopoMap',
          maxZoom: 17,
          hasLabelsOverlay: false,
        };
      case 'street':
      default:
        return {
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          hasLabelsOverlay: false,
        };
    }
  }, [mapType]);

  const hdopInfo = getHdopRating(deviceData?.hdop);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full ${isFullscreen ? 'h-screen' : heightClass} rounded-2xl overflow-hidden border border-[#E3E8E3] shadow-card bg-[#F0F3EF] flex flex-col`}
    >
      {/* Top Floating Bar: Location Search + Layer Selector */}
      <div className="absolute top-3 left-3 z-[500] flex flex-wrap items-center gap-2 max-w-[calc(100%-4rem)]">
        {/* Location Search Bar */}
        <LocationSearchBar onSelectLocation={handleSelectSearchResult} />

        {/* 3 Map Layers Selector (Street [Default], Satellite, Terrain) */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl p-1 shadow-md border border-[#E3E8E3] flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMapType('street')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              mapType === 'terrain'
                ? 'bg-[#123C2D] text-white shadow-xs'
                : 'text-[#7A8980] hover:text-[#202B26] hover:bg-gray-100'
            }`}
          >
            Terrain
          </button>
        </div>
      </div>

      {/* Top-Right Control Buttons */}
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

        {/* Center on Cattle GPS */}
        {isGpsValid && (
          <button
            type="button"
            onClick={() => {
              if (deviceData?.latitude && deviceData?.longitude) {
                setActiveCenter([deviceData.latitude, deviceData.longitude]);
                setActiveZoom(17);
                mapInstance?.setView([deviceData.latitude, deviceData.longitude], 17);
              }
            }}
            title="Center on Cattle GPS Marker"
            className="p-2.5 bg-white/95 hover:bg-white text-[#123C2D] rounded-xl shadow-md border border-[#E3E8E3] transition-all hover:scale-105 active:scale-95"
          >
            <Crosshair className="w-4 h-4 text-[#21865B]" />
          </button>
        )}

        {/* Center on Geofence Center */}
        <button
          type="button"
          onClick={() => {
            setActiveCenter([geofence.centerLat, geofence.centerLon]);
            setActiveZoom(16);
            mapInstance?.setView([geofence.centerLat, geofence.centerLon], 16);
          }}
          title="Center on Geofence Centre"
          className="p-2.5 bg-white/95 hover:bg-white text-[#123C2D] rounded-xl shadow-md border border-[#E3E8E3] transition-all hover:scale-105 active:scale-95"
        >
          <Radio className="w-4 h-4 text-[#123C2D]" />
        </button>

        {/* Custom Zoom Buttons */}
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

        {/* North Arrow Indicator (Section 5) */}
        <div 
          title="North Indicator"
          className="p-2 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-[#E3E8E3] flex flex-col items-center justify-center select-none"
        >
          <Compass className="w-4 h-4 text-red-600 animate-spin-slow" />
          <span className="text-[9px] font-extrabold text-red-600 leading-none mt-0.5">N</span>
        </div>
      </div>

      {/* Bottom Floating Bar: Legend + Status Pill */}
      <div className="absolute bottom-3 left-3 right-3 z-[500] flex flex-wrap items-end justify-between gap-2 pointer-events-none">
        {/* Left: Map Legend */}
        <div className="pointer-events-auto">
          <MapLegend />
        </div>

        {/* Right: Geofence Status Badge */}
        <div className="pointer-events-auto">
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md shadow-md border flex items-center gap-2 ${
            isOutside
              ? 'bg-[#D94F50] text-white border-red-300 animate-pulse'
              : 'bg-white/95 text-[#123C2D] border-[#E3E8E3]'
          }`}>
            {isOutside ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-200" />
                <span>UNSAFE: Breached Perimeter ({deviceData?.distanceM || 0}m from center)</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-[#21865B]" />
                <span>Safe Grazing Zone Active &bull; Radius: {geofence.radiusM}m</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Waiting for GPS Notice if lat/lon is 0 or satellites < 3 */}
      {!isGpsValid && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[500] bg-white/95 backdrop-blur-md px-5 py-4 rounded-2xl shadow-modal border border-amber-200 flex items-center gap-3 text-sm pointer-events-auto">
          <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
          <div>
            <p className="font-bold text-[#202B26]">Waiting for GPS Fix...</p>
            <p className="text-xs text-[#7A8980]">
              Satellites: {deviceData?.satellites ?? 0} locked. Coordinates will plot automatically once locked.
            </p>
          </div>
        </div>
      )}

      {/* Leaflet Map */}
      <MapContainer
        center={initialCenter}
        zoom={activeZoom}
        zoomControl={false}
        scrollWheelZoom={true}
        className="w-full h-full flex-1"
      >
        <MapRefSetter onMap={setMapInstance} />
        <MapController center={activeCenter} zoom={activeZoom} />
        <MapClickHandler 
          isEditable={isEditable} 
          onCenterChange={onCenterChange} 
          onMapClick={onMapClick} 
        />

        {/* Base Map Tile Layer */}
        <TileLayer
          key={mapType}
          attribution={layerConfig.attribution}
          url={layerConfig.url}
          maxZoom={layerConfig.maxZoom}
        />

        {/* Geographical Labels Overlay for Satellite Map (Section 2.B) */}
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

        {/* Metric Scale Bar (Section 5) */}
        <ScaleControl imperial={false} position="bottomleft" />

        {/* Safe Grazing Circular Boundary (Section 4) */}
        <Circle
          center={[geofence.centerLat, geofence.centerLon]}
          radius={geofence.radiusM}
          pathOptions={{
            color: isOutside ? '#D94F50' : '#21865B',
            fillColor: isOutside ? '#D94F50' : '#32A56C',
            fillOpacity: isOutside ? 0.12 : 0.18,
            weight: 2.5,
            dashArray: isOutside ? '6, 6' : undefined,
          }}
        />

        {/* Geofence Centre Marker (Section 4) */}
        <Marker
          position={[geofence.centerLat, geofence.centerLon]}
          icon={centerIcon}
          draggable={isEditable}
          eventHandlers={{
            dragend: (e) => {
              if (isEditable && onCenterChange) {
                const marker = e.target;
                const pos = marker.getLatLng();
                onCenterChange(pos.lat, pos.lng);
              }
            },
          }}
        >
          <Popup>
            <div className="p-1 text-xs">
              <p className="font-bold text-[#123C2D]">Geofence Centre</p>
              <p className="text-gray-600 font-mono mt-0.5">
                {formatCoordinates(geofence.centerLat, geofence.centerLon)}
              </p>
              <p className="text-gray-500 mt-1">
                Configured Safe Radius: <strong className="text-[#21865B]">{geofence.radiusM} m</strong>
              </p>
              {isEditable && (
                <p className="text-[10px] text-emerald-700 mt-1 font-semibold">
                  &bull; Drag marker or click map to reposition centre
                </p>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Search Result Landmark Marker */}
        {searchPin && (
          <Marker position={[searchPin.lat, searchPin.lon]} icon={searchIcon}>
            <Popup>
              <div className="p-1 text-xs max-w-xs">
                <span className="font-bold text-amber-700 block">Searched Location</span>
                <span className="text-gray-700 font-medium">{searchPin.label}</span>
                <span className="block mt-1 font-mono text-[10px] text-gray-400">
                  {formatCoordinates(searchPin.lat, searchPin.lon)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* GPS Breadcrumb Route Polyline */}
        {showTrail && trailCoordinates.length > 1 && (
          <Polyline
            positions={trailCoordinates}
            pathOptions={{
              color: '#21865B',
              weight: 3.5,
              opacity: 0.8,
              dashArray: '4, 6',
            }}
          />
        )}

        {/* Live Cattle Livestock GPS Marker (Strict [lat, lon] order) */}
        {isGpsValid && deviceData && (
          <Marker
            position={[deviceData.latitude, deviceData.longitude]}
            icon={cattleIcon}
          >
            <Popup>
              <div className="p-2.5 text-xs min-w-[220px]">
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                  <span className="font-bold text-[#123C2D] text-sm">{activeAnimalLabel}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    deviceData.outside ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {deviceData.outside ? 'OUTSIDE ZONE' : 'INSIDE SAFE'}
                  </span>
                </div>

                <div className="mt-2 space-y-1.5 font-mono text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-sans">Device ID:</span>
                    <span className="font-bold text-gray-900">esp32_gps_01</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400 font-sans">Latitude:</span>
                    <span className="font-bold text-gray-900">{deviceData.latitude.toFixed(6)}° N</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400 font-sans">Longitude:</span>
                    <span className="font-bold text-gray-900">{deviceData.longitude.toFixed(6)}° E</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400 font-sans">Satellites:</span>
                    <span className="font-semibold text-blue-700">{deviceData.satellites} locked</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400 font-sans">HDOP Geometry:</span>
                    <span className="font-semibold">{hdopInfo.label}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400 font-sans">Distance to Centre:</span>
                    <span className="font-bold text-[#123C2D]">{deviceData.distanceM} m</span>
                  </div>

                  <div className="flex justify-between pt-1 border-t border-gray-100 text-[10px] text-gray-400 font-sans">
                    <span>Last Fix:</span>
                    <span>{formatRelativeTime(deviceData.timestamp)}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};
