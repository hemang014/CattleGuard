/**
 * Haversine distance formula between two lat/lon points in meters
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === 0 && lon1 === 0) return 0;
  if (lat2 === 0 && lon2 === 0) return 0;

  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * High-precision distance calculation (unrounded float)
 */
export function calculateDistanceMetersPrecise(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === 0 && lon1 === 0) return 0;
  if (lat2 === 0 && lon2 === 0) return 0;

  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface GeofenceEvaluation {
  isInside: boolean;
  distanceM: number;
  radiusM: number;
  remainingSafeM: number;
  breachDistanceM: number;
  statusText: 'INSIDE' | 'OUTSIDE';
}

/**
 * Reusable Geofence boundary evaluation logic (Section 5)
 */
export function checkGeofenceStatus(
  centerLat: number,
  centerLon: number,
  radiusM: number,
  targetLat: number,
  targetLon: number
): GeofenceEvaluation {
  const distanceExact = calculateDistanceMetersPrecise(centerLat, centerLon, targetLat, targetLon);
  const isInside = distanceExact <= radiusM;
  const distanceRounded = Math.round(distanceExact);

  return {
    isInside,
    distanceM: distanceRounded,
    radiusM,
    remainingSafeM: isInside ? Math.max(0, Math.round(radiusM - distanceExact)) : 0,
    breachDistanceM: !isInside ? Math.max(0, Math.round(distanceExact - radiusM)) : 0,
    statusText: isInside ? 'INSIDE' : 'OUTSIDE',
  };
}

/**
 * Validates latitude and longitude ranges
 */
export function validateCoordinates(lat: number, lon: number): { valid: boolean; error?: string } {
  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, error: 'Coordinates must be valid numbers' };
  }
  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and +90 degrees' };
  }
  if (lon < -180 || lon > 180) {
    return { valid: false, error: 'Longitude must be between -180 and +180 degrees' };
  }
  return { valid: true };
}

/**
 * Computes destination coordinate given a starting point, distance in meters, and bearing in degrees
 */
export function computeDestinationPoint(
  lat: number,
  lon: number,
  distanceM: number,
  bearingDeg: number = 0
): [number, number] {
  const R = 6371000;
  const d = distanceM / R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );

  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );

  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
}

/**
 * Format coordinates with high precision for GPS audits
 */
export function formatCoordinates(lat: number, lon: number): string {
  if (!lat && !lon) return 'Waiting for GPS...';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lon).toFixed(6)}° ${lonDir}`;
}

/**
 * HDOP interpretation helper as requested in Section 10
 */
export function getHdopRating(hdop: number | null | undefined): {
  label: string;
  badgeClass: string;
  description: string;
} {
  if (hdop === null || hdop === undefined || isNaN(hdop)) {
    return {
      label: 'N/A',
      badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
      description: 'HDOP geometry telemetry unavailable',
    };
  }

  if (hdop < 1.0) {
    return {
      label: `${hdop.toFixed(1)} (Ideal)`,
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      description: 'Highest geometric precision',
    };
  }
  if (hdop <= 2.0) {
    return {
      label: `${hdop.toFixed(1)} (Excellent)`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Accurate positional fix',
    };
  }
  if (hdop <= 5.0) {
    return {
      label: `${hdop.toFixed(1)} (Good)`,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Moderate satellite geometry',
    };
  }
  return {
    label: `${hdop.toFixed(1)} (Poor)`,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    description: 'Constrained satellite constellation',
  };
}

/**
 * Relative time formatter ("14s ago", "2m ago", "Just now")
 */
export function formatRelativeTime(timestamp: number | string | undefined): string {
  if (!timestamp) return 'No data yet';
  
  let timeMs: number;
  if (typeof timestamp === 'string') {
    // Check if ISO string or numeric string
    const parsed = Date.parse(timestamp);
    if (!isNaN(parsed)) {
      timeMs = parsed;
    } else {
      timeMs = Number(timestamp);
      if (isNaN(timeMs)) return timestamp;
      // If epoch in seconds
      if (timeMs < 10000000000) timeMs *= 1000;
    }
  } else {
    timeMs = timestamp;
    if (timeMs < 10000000000) timeMs *= 1000;
  }

  const diffSec = Math.max(0, Math.floor((Date.now() - timeMs) / 1000));
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return new Date(timeMs).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Format exact date & time for tables
 */
export function formatDateTime(timestamp: number | string | undefined): string {
  if (!timestamp) return '—';
  let timeMs: number;
  if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp);
    if (!isNaN(parsed)) {
      timeMs = parsed;
    } else {
      timeMs = Number(timestamp);
      if (isNaN(timeMs)) return timestamp;
      if (timeMs < 10000000000) timeMs *= 1000;
    }
  } else {
    timeMs = timestamp;
    if (timeMs < 10000000000) timeMs *= 1000;
  }
  return new Date(timeMs).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * ESP32 Buzzer Sound Synthesizer via Web Audio API
 */
let audioCtx: AudioContext | null = null;

export function playBuzzerAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    
    // Create 3 alert beeps simulating the ESP32 buzzer
    [0, 0.18, 0.36].forEach((offset) => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'square'; // Buzzer sound
      osc.frequency.setValueAtTime(2400, now + offset); // 2.4 kHz piezo buzzer tone
      
      gain.gain.setValueAtTime(0.15, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now + offset);
      osc.stop(now + offset + 0.13);
    });
  } catch (err) {
    console.warn('Audio buzzer play prevented by browser autoplay policy:', err);
  }
}

/**
 * Calculates forward azimuth (bearing) from Point A to Point B in degrees (0° - 360°)
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);

  const bearing = ((theta * 180) / Math.PI + 360) % 360;
  return Math.round(bearing * 10) / 10;
}

/**
 * Convert numerical bearing (0° - 360°) into compass cardinal heading (N, NE, E, etc.)
 */
export function getCompassHeading(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((degrees % 360) / 22.5)) % 16;
  return directions[index];
}

/**
 * Calculates pasture coverage area from circular geofence radius
 */
export function calculatePastureArea(radiusM: number): {
  squareMeters: number;
  hectares: number;
  acres: number;
} {
  const areaSqMeters = Math.PI * Math.pow(radiusM, 2);
  const hectares = areaSqMeters / 10000;
  const acres = areaSqMeters * 0.000247105;

  return {
    squareMeters: Math.round(areaSqMeters),
    hectares: Math.round(hectares * 100) / 100,
    acres: Math.round(acres * 100) / 100,
  };
}

/**
 * Generates RFC 4180 compliant CSV string from telemetry GPS records for dataset audits
 */
export function generateTelemetryCsv(
  records: Array<{
    id?: string;
    timestamp?: unknown;
    latitude: number;
    longitude: number;
    satellites?: number;
    hdop?: number | null;
    distanceM?: number;
    outside?: boolean;
  }>
): string {
  const headers = ['Record ID', 'Timestamp (ISO)', 'Latitude', 'Longitude', 'Satellites', 'HDOP', 'Distance from Center (m)', 'Geofence Status'];
  const rows = records.map((record, index) => {
    let isoTime = '';
    if (record.timestamp) {
      if (typeof record.timestamp === 'string') {
        isoTime = record.timestamp;
      } else if (typeof record.timestamp === 'number') {
        const ms = record.timestamp < 10000000000 ? record.timestamp * 1000 : record.timestamp;
        isoTime = new Date(ms).toISOString();
      }
    }

    return [
      record.id || `REC-${index + 1}`,
      `"${isoTime}"`,
      record.latitude.toFixed(8),
      record.longitude.toFixed(8),
      record.satellites !== undefined ? record.satellites : '',
      record.hdop !== null && record.hdop !== undefined ? record.hdop.toFixed(2) : '',
      record.distanceM !== undefined ? record.distanceM.toFixed(1) : '',
      record.outside ? 'OUTSIDE' : 'INSIDE',
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}
