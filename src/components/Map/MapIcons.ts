import L from 'leaflet';

/**
 * Custom Cattle Livestock Marker Icon
 * - Green custom livestock marker when inside
 * - Red marker or red status indicator when outside safe boundary
 */
export function createCattleMarkerIcon(outside: boolean, isOffline: boolean = false, headingDeg?: number): L.DivIcon {
  const bgColor = isOffline ? '#7A8980' : outside ? '#D94F50' : '#21865B';
  const pulseClass = isOffline ? '' : outside ? 'cattle-pulse-breach' : 'cattle-pulse-safe';
  const label = isOffline ? 'OFFLINE' : outside ? 'OUTSIDE' : 'SAFE ZONE';
  const hasHeading = headingDeg !== undefined && headingDeg !== null && !isNaN(headingDeg);

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group">
      <!-- Pulsing radar ring -->
      <div class="absolute w-12 h-12 rounded-full ${pulseClass}"></div>
      
      <!-- Direction Heading Arrow Pointer -->
      ${hasHeading ? `
        <div class="absolute -top-3 z-20 flex items-center justify-center transition-transform" style="transform: rotate(${headingDeg}deg);">
          <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-amber-400 drop-shadow"></div>
        </div>
      ` : ''}

      <!-- Marker Pin Body -->
      <div class="relative z-10 flex flex-col items-center">
        <div style="background-color: ${bgColor}" class="w-10 h-10 rounded-full shadow-lg flex items-center justify-center border-2 border-white transition-transform transform group-hover:scale-110">
          <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 10v12"/>
            <path d="M15 10v12"/>
            <path d="M11 14h6a3 3 0 0 0 3-3V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4a3 3 0 0 0 3 3h4"/>
            <circle cx="9" cy="9" r="1" fill="currentColor"/>
            <circle cx="15" cy="9" r="1" fill="currentColor"/>
          </svg>
        </div>
        <!-- Label Badge -->
        <span class="mt-1 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase rounded-full shadow-md text-white whitespace-nowrap" style="background-color: ${bgColor}">
          ${label}
        </span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-cattle-icon',
    iconSize: [52, 58],
    iconAnchor: [26, 29],
    popupAnchor: [0, -30],
  });
}

/**
 * Distinct dark-green Geofence Centre marker
 * Clearly labelled "Geofence Centre"
 */
export function createGeofenceCenterIcon(): L.DivIcon {
  const html = `
    <div class="flex flex-col items-center cursor-move group">
      <div class="w-9 h-9 rounded-full bg-[#123C2D] border-2 border-[#32A56C] shadow-lg flex items-center justify-center text-white transition-transform group-hover:scale-125">
        <svg class="w-4 h-4 text-[#32A56C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
        </svg>
      </div>
      <div class="px-2.5 py-0.5 mt-0.5 bg-[#123C2D] text-[10px] font-bold text-white rounded-md shadow-md border border-[#32A56C]/50 whitespace-nowrap">
        Geofence Centre
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-center-icon',
    iconSize: [40, 48],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  });
}

/**
 * Route Start Marker
 */
export function createRouteStartIcon(): L.DivIcon {
  const html = `
    <div class="flex flex-col items-center">
      <div class="w-7 h-7 rounded-full bg-emerald-700 border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold">
        S
      </div>
      <span class="mt-0.5 px-1.5 py-0.2 bg-emerald-900 text-[9px] font-bold text-white rounded shadow">
        START
      </span>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-route-start-icon',
    iconSize: [32, 40],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

/**
 * Route End / Current Playback Marker
 */
export function createRouteEndIcon(): L.DivIcon {
  const html = `
    <div class="flex flex-col items-center">
      <div class="w-7 h-7 rounded-full bg-[#123C2D] border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold">
        E
      </div>
      <span class="mt-0.5 px-1.5 py-0.2 bg-[#123C2D] text-[9px] font-bold text-white rounded shadow">
        END
      </span>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-route-end-icon',
    iconSize: [32, 40],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

/**
 * Search Location Pin Icon
 */
export function createSearchPinIcon(): L.DivIcon {
  const html = `
    <div class="flex flex-col items-center animate-bounce">
      <div class="w-8 h-8 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center text-white">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
        </svg>
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-search-pin-icon',
    iconSize: [32, 36],
    iconAnchor: [16, 36],
    popupAnchor: [0, -36],
  });
}

/**
 * Route Destination Flag Icon
 */
export function createDestinationPinIcon(): L.DivIcon {
  const html = `
    <div class="flex flex-col items-center">
      <div class="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/>
        </svg>
      </div>
      <span class="mt-0.5 px-1.5 py-0.2 bg-blue-900 text-[9px] font-bold text-white rounded shadow uppercase">
        Target
      </span>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-destination-icon',
    iconSize: [36, 44],
    iconAnchor: [18, 38],
    popupAnchor: [0, -38],
  });
}

