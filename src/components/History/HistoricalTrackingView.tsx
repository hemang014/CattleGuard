import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Circle, 
  Polyline, 
  Popup, 
  ScaleControl, 
  useMap 
} from 'react-leaflet';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  Calendar, 
  Search, 
  Download, 
  Clock, 
  Layers, 
  Crosshair, 
  ShieldCheck, 
  AlertTriangle,
  History,
  Activity,
  Compass
} from 'lucide-react';
import { HistoricalGpsPoint, GeofenceConfig, MapLayerType } from '../../types';
import { 
  createCattleMarkerIcon, 
  createGeofenceCenterIcon, 
  createRouteStartIcon, 
  createRouteEndIcon 
} from '../Map/MapIcons';
import { 
  formatCoordinates, 
  formatDateTime, 
  formatRelativeTime, 
  getHdopRating, 
  calculateDistanceMeters 
} from '../../utils/geo';
import { MapLegend } from '../Map/MapLegend';
import L from 'leaflet';

interface HistoricalTrackingViewProps {
  historyRecords: HistoricalGpsPoint[];
  geofence: GeofenceConfig;
  deviceId?: string;
  isLiveMode?: boolean;
}

// Controller to pan map to active playback point
function PlaybackMapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(center, { animate: true });
  }, [center, map]);
  return null;
}

// Custom small waypoint circle dot icon for intermediate route points
function createWaypointDotIcon(outside: boolean = false): L.DivIcon {
  const bg = outside ? '#D94F50' : '#21865B';
  return L.divIcon({
    html: `<div style="background-color: ${bg}; width: 10px; height: 10px; border-radius: 9999px; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-waypoint-dot',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

export const HistoricalTrackingView: React.FC<HistoricalTrackingViewProps> = ({
  historyRecords,
  geofence,
  deviceId = 'esp32_gps_01',
  isLiveMode = false,
}) => {
  // Layer selection: Street is DEFAULT (Section 2.A)
  const [mapType, setMapType] = useState<MapLayerType>('street');
  
  // Date and Search filters
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Playback state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 2 | 5>(1);

  // Filtered & Chronologically ordered points
  const filteredPoints = useMemo(() => {
    let list = [...historyRecords];

    if (selectedDate) {
      list = list.filter((p) => {
        const d = new Date(Number(p.timestamp)).toISOString().split('T')[0];
        return d === selectedDate;
      });
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter(
        (p) =>
          p.latitude.toString().includes(q) ||
          p.longitude.toString().includes(q) ||
          formatDateTime(p.timestamp).toLowerCase().includes(q)
      );
    }

    // Sort chronologically ascending for polyline and playback
    list.sort((a, b) => {
      const ta = typeof a.timestamp === 'number' ? a.timestamp : Date.parse(String(a.timestamp)) || 0;
      const tb = typeof b.timestamp === 'number' ? b.timestamp : Date.parse(String(b.timestamp)) || 0;
      return ta - tb;
    });

    return list;
  }, [historyRecords, selectedDate, searchFilter]);

  // Points list for table display (supports reversing sort order)
  const tablePoints = useMemo(() => {
    const list = [...filteredPoints];
    if (sortOrder === 'desc') {
      list.reverse();
    }
    return list;
  }, [filteredPoints, sortOrder]);

  // Total points count
  const totalCount = filteredPoints.length;

  // Active point during playback
  const activePoint = filteredPoints[currentIndex] || filteredPoints[0] || null;

  // Initial center [lat, lon]
  const initialCenter: [number, number] = useMemo(() => {
    if (activePoint && activePoint.latitude && activePoint.longitude) {
      return [activePoint.latitude, activePoint.longitude];
    }
    return [geofence.centerLat, geofence.centerLon];
  }, [activePoint, geofence.centerLat, geofence.centerLon]);

  // Polyline coordinates
  const polylineCoords: [number, number][] = useMemo(() => {
    return filteredPoints
      .filter((p) => p.latitude && p.longitude && p.latitude !== 0 && p.longitude !== 0)
      .map((p) => [p.latitude, p.longitude]);
  }, [filteredPoints]);

  // Start & End points
  const startPoint = filteredPoints.length > 0 ? filteredPoints[0] : null;
  const endPoint = filteredPoints.length > 1 ? filteredPoints[filteredPoints.length - 1] : null;

  // Icons
  const startIcon = useMemo(() => createRouteStartIcon(), []);
  const endIcon = useMemo(() => createRouteEndIcon(), []);
  const centerIcon = useMemo(() => createGeofenceCenterIcon(), []);
  const playbackAnimalIcon = useMemo(() => {
    const outside = activePoint ? Boolean(activePoint.outside) : false;
    return createCattleMarkerIcon(outside, false);
  }, [activePoint]);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;
    if (totalCount <= 1) {
      setIsPlaying(false);
      return;
    }

    const intervalTime = 1200 / playSpeed;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= totalCount - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, totalCount, playSpeed]);

  // Reset playback if point count changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [filteredPoints.length]);

  // Export CSV functionality
  const handleExportCsv = () => {
    if (filteredPoints.length === 0) return;

    const headers = [
      'Record #',
      'Device ID',
      'Timestamp (ISO)',
      'Latitude',
      'Longitude',
      'Satellites',
      'HDOP',
      'Geofence Status',
      'Distance from Center (m)',
    ];

    const rows = filteredPoints.map((p, idx) => {
      const dist = p.distanceM !== undefined 
        ? p.distanceM 
        : calculateDistanceMeters(geofence.centerLat, geofence.centerLon, p.latitude, p.longitude);
      const isOut = p.outside !== undefined ? p.outside : dist > geofence.radiusM;

      return [
        idx + 1,
        deviceId,
        new Date(Number(p.timestamp)).toISOString(),
        p.latitude.toFixed(6),
        p.longitude.toFixed(6),
        p.satellites ?? 'N/A',
        p.hdop !== undefined && p.hdop !== null ? p.hdop : 'N/A',
        isOut ? 'OUTSIDE' : 'INSIDE',
        dist,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${deviceId}_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Historical Playback Header & Notice */}
      <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#E8F4EC] text-[#21865B]">
              <History className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#202B26] font-['Manrope']">
                Historical GPS Route & Playback
              </h2>
              <p className="text-xs text-[#7A8980]">
                Chronological path of recorded GPS points from <code className="font-mono text-gray-700">/devices/{deviceId}/history</code>
              </p>
            </div>
          </div>
        </div>

        {/* Total Points Badge & Export CSV */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-[#123C2D] text-white text-xs font-bold shadow-xs">
            {totalCount} Total Points Recorded
          </span>

          {totalCount > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-[#202B26] text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Map Card */}
      <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card space-y-4">
        {/* Top Controls: Layers + Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F3EF]">
          {/* Layer Selector */}
          <div className="bg-[#F5F7F3] rounded-xl p-1 border border-[#E3E8E3] flex items-center gap-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMapType('street')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                mapType === 'street'
                  ? 'bg-[#123C2D] text-white shadow-xs'
                  : 'text-[#7A8980] hover:text-[#202B26]'
              }`}
            >
              Streets (Default)
            </button>
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                mapType === 'satellite'
                  ? 'bg-[#123C2D] text-white shadow-xs'
                  : 'text-[#7A8980] hover:text-[#202B26]'
              }`}
            >
              <Layers className="w-3 h-3" />
              Satellite + Labels
            </button>
            <button
              type="button"
              onClick={() => setMapType('terrain')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                mapType === 'terrain'
                  ? 'bg-[#123C2D] text-white shadow-xs'
                  : 'text-[#7A8980] hover:text-[#202B26]'
              }`}
            >
              Terrain
            </button>
          </div>

          {/* Date Filter & Search */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-8 pr-2.5 py-1 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#21865B] bg-white font-mono"
              />
            </div>
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="text-xs text-red-600 hover:underline font-semibold"
              >
                Clear Date
              </button>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="relative h-[480px] sm:h-[520px] rounded-2xl overflow-hidden border border-[#E3E8E3]">
          {/* Map Legend (Bottom-Left) */}
          <div className="absolute bottom-3 left-3 z-[500]">
            <MapLegend />
          </div>

          {/* North Indicator (Top-Right) */}
          <div className="absolute top-3 right-3 z-[500] p-2 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-[#E3E8E3] flex flex-col items-center">
            <Compass className="w-4 h-4 text-red-600" />
            <span className="text-[9px] font-extrabold text-red-600 mt-0.5">N</span>
          </div>

          {/* Empty State Overlay if 0 points */}
          {totalCount === 0 && (
            <div className="absolute inset-0 z-[500] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#202B26]">No Historical GPS Records Found</h3>
              <p className="text-xs text-[#7A8980] max-w-sm mt-1">
                {isLiveMode
                  ? 'Your Firebase path /devices/esp32_gps_01/history contains no recorded coordinates yet.'
                  : 'Select "Test Hardware" in header to generate live test telemetry points.'}
              </p>
            </div>
          )}

          {/* Single Point Warning if only 1 point */}
          {totalCount === 1 && (
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-[500] bg-amber-50 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md">
              Single GPS fix recorded. Insufficient points to draw route polyline.
            </div>
          )}

          {/* Leaflet Map */}
          <MapContainer
            center={initialCenter}
            zoom={16}
            scrollWheelZoom={true}
            className="w-full h-full"
          >
            {activePoint && <PlaybackMapController center={[activePoint.latitude, activePoint.longitude]} />}

            {/* Base Tile Layer */}
            <TileLayer
              key={mapType}
              attribution={
                mapType === 'satellite'
                  ? '&copy; Esri &mdash; Source: Esri, Maxar'
                  : mapType === 'terrain'
                  ? 'Map data &copy; OpenStreetMap, SRTM | Style: OpenTopoMap'
                  : '&copy; OpenStreetMap contributors'
              }
              url={
                mapType === 'satellite'
                  ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                  : mapType === 'terrain'
                  ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
                  : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
              maxZoom={mapType === 'terrain' ? 17 : 19}
            />

            {/* Satellite Labels Overlay */}
            {mapType === 'satellite' && (
              <>
                <TileLayer
                  attribution="&copy; Esri Boundaries & Places"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                  opacity={0.85}
                />
                <TileLayer
                  attribution="&copy; Esri Transportation"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                  opacity={0.7}
                />
              </>
            )}

            <ScaleControl imperial={false} position="bottomleft" />

            {/* Geofence Safe Boundary Circle */}
            <Circle
              center={[geofence.centerLat, geofence.centerLon]}
              radius={geofence.radiusM}
              pathOptions={{
                color: '#21865B',
                fillColor: '#32A56C',
                fillOpacity: 0.15,
                weight: 2,
              }}
            />

            {/* Geofence Centre Marker */}
            <Marker position={[geofence.centerLat, geofence.centerLon]} icon={centerIcon}>
              <Popup>
                <div className="p-1 text-xs">
                  <p className="font-bold text-[#123C2D]">Geofence Centre</p>
                  <p className="font-mono text-gray-600 mt-0.5">
                    {formatCoordinates(geofence.centerLat, geofence.centerLon)}
                  </p>
                  <p className="text-gray-500 mt-1">Safe Radius: {geofence.radiusM} m</p>
                </div>
              </Popup>
            </Marker>

            {/* Chronological Route Polyline (Section 6) */}
            {polylineCoords.length > 1 && (
              <Polyline
                positions={polylineCoords}
                pathOptions={{
                  color: '#21865B',
                  weight: 4,
                  opacity: 0.85,
                  dashArray: '3, 6',
                }}
              />
            )}

            {/* Route Start Point Marker */}
            {startPoint && (
              <Marker position={[startPoint.latitude, startPoint.longitude]} icon={startIcon}>
                <Popup>
                  <div className="p-1 text-xs font-mono">
                    <span className="font-bold text-emerald-800 font-sans block">Route Start Point</span>
                    <span>{formatCoordinates(startPoint.latitude, startPoint.longitude)}</span>
                    <span className="block text-[10px] text-gray-500 mt-0.5">{formatDateTime(startPoint.timestamp)}</span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Route End Point Marker */}
            {endPoint && (
              <Marker position={[endPoint.latitude, endPoint.longitude]} icon={endIcon}>
                <Popup>
                  <div className="p-1 text-xs font-mono">
                    <span className="font-bold text-[#123C2D] font-sans block">Route End Point</span>
                    <span>{formatCoordinates(endPoint.latitude, endPoint.longitude)}</span>
                    <span className="block text-[10px] text-gray-500 mt-0.5">{formatDateTime(endPoint.timestamp)}</span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Clickable Intermediate Waypoints */}
            {filteredPoints.map((point, idx) => {
              // Skip first and last since they have big start/end icons
              if (idx === 0 || idx === filteredPoints.length - 1) return null;
              const isOut = Boolean(point.outside);

              return (
                <Marker
                  key={point.id || idx}
                  position={[point.latitude, point.longitude]}
                  icon={createWaypointDotIcon(isOut)}
                >
                  <Popup>
                    <div className="p-1.5 text-xs font-mono space-y-1 min-w-[180px]">
                      <div className="flex justify-between items-center font-sans border-b border-gray-100 pb-1">
                        <span className="font-bold text-[#123C2D]">Waypoint #{idx + 1}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          isOut ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isOut ? 'OUTSIDE' : 'SAFE'}
                        </span>
                      </div>
                      <div className="text-gray-700">
                        {formatCoordinates(point.latitude, point.longitude)}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {formatDateTime(point.timestamp)}
                      </div>
                      {point.satellites !== undefined && (
                        <div className="text-[10px] text-blue-700">
                          {point.satellites} Satellites locked
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Active Playback Marker */}
            {activePoint && (
              <Marker
                position={[activePoint.latitude, activePoint.longitude]}
                icon={playbackAnimalIcon}
              >
                <Popup>
                  <div className="p-2 text-xs font-mono min-w-[200px]">
                    <span className="font-bold text-[#123C2D] font-sans block text-sm">
                      Playback Position #{currentIndex + 1} of {totalCount}
                    </span>
                    <div className="mt-1 space-y-1 text-gray-700">
                      <div>Pos: {formatCoordinates(activePoint.latitude, activePoint.longitude)}</div>
                      <div>Time: {formatDateTime(activePoint.timestamp)}</div>
                      <div>Satellites: {activePoint.satellites ?? 'N/A'}</div>
                      <div>HDOP: {activePoint.hdop !== undefined && activePoint.hdop !== null ? activePoint.hdop : 'N/A'}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Playback Controls Interface (Section 6) */}
        {totalCount > 1 && (
          <div className="p-4 rounded-xl bg-[#F5F7F3] border border-[#E3E8E3] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Playback Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentIndex(0)}
                  title="Rewind to Start"
                  className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={currentIndex <= 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  title="Previous GPS Point"
                  className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors disabled:opacity-40"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                    isPlaying
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-[#123C2D] text-white hover:bg-[#1B523E]'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isPlaying ? 'Pause Playback' : 'Play Historical Route'}</span>
                </button>

                <button
                  type="button"
                  disabled={currentIndex >= totalCount - 1}
                  onClick={() => setCurrentIndex((prev) => Math.min(totalCount - 1, prev + 1))}
                  title="Next GPS Point"
                  className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors disabled:opacity-40"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[11px] font-bold text-gray-500 uppercase mr-1">Speed:</span>
                {([1, 2, 5] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaySpeed(spd)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      playSpeed === spd
                        ? 'bg-[#123C2D] text-white shadow-xs'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Scrubber Progress Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-gray-600">
                <span>
                  Point <strong>{currentIndex + 1}</strong> of {totalCount}
                </span>
                <span>
                  {activePoint ? formatDateTime(activePoint.timestamp) : ''}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={totalCount - 1}
                value={currentIndex}
                onChange={(e) => setCurrentIndex(parseInt(e.target.value, 10))}
                className="w-full accent-[#21865B] cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Location History Table (Section 7) */}
      <div className="bg-white rounded-2xl border border-[#E3E8E3] shadow-card overflow-hidden">
        <div className="p-4 border-b border-[#F0F3EF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#202B26] font-['Manrope']">
              Location History Records Table
            </h3>
            <p className="text-xs text-[#7A8980]">
              Chronological log of coordinates recorded in Firebase Realtime Database
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-gray-300 hover:bg-gray-50 text-[#202B26]"
            >
              Order: <strong>{sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}</strong>
            </button>
          </div>
        </div>

        {tablePoints.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No history records match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#F5F7F3] border-b border-gray-200 text-[11px] font-bold text-[#7A8980] uppercase tracking-wider z-10">
                <tr>
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Latitude</th>
                  <th className="py-2.5 px-4">Longitude</th>
                  <th className="py-2.5 px-4">Satellites</th>
                  <th className="py-2.5 px-4">HDOP</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Distance from Center</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {tablePoints.map((p, idx) => {
                  const dist = p.distanceM !== undefined 
                    ? p.distanceM 
                    : calculateDistanceMeters(geofence.centerLat, geofence.centerLon, p.latitude, p.longitude);
                  const isOut = p.outside !== undefined ? p.outside : dist > geofence.radiusM;

                  return (
                    <tr 
                      key={p.id || idx} 
                      onClick={() => {
                        const originalIdx = filteredPoints.findIndex((item) => item.timestamp === p.timestamp);
                        if (originalIdx !== -1) setCurrentIndex(originalIdx);
                      }}
                      className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 font-bold text-gray-500 font-sans">{idx + 1}</td>
                      <td className="py-2.5 px-4 text-gray-800">{formatDateTime(p.timestamp)}</td>
                      <td className="py-2.5 px-4 text-[#123C2D] font-bold">{p.latitude.toFixed(6)}° N</td>
                      <td className="py-2.5 px-4 text-[#123C2D] font-bold">{p.longitude.toFixed(6)}° E</td>
                      <td className="py-2.5 px-4 text-blue-700 font-sans">
                        {p.satellites !== undefined ? `${p.satellites} Sats` : 'N/A'}
                      </td>
                      <td className="py-2.5 px-4 text-gray-700">
                        {p.hdop !== undefined && p.hdop !== null ? p.hdop.toFixed(2) : 'N/A'}
                      </td>
                      <td className="py-2.5 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isOut ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isOut ? 'OUTSIDE' : 'INSIDE'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-800 font-bold">{dist} m</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
