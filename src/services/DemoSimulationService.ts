/**
 * DemoSimulationService — Handles simulated herd movements, animation loops,
 * and boundary crossing state transitions without touching Firebase.
 */
import { SimulationState, PresetScenario } from '../types';
import { checkGeofenceStatus, computeDestinationPoint, calculateDistanceMetersPrecise } from '../utils/geo';
import { demoEventManager } from './DemoEventManager';
import { notificationService } from './NotificationService';

export interface SimulationConfig {
  centerLat: number;
  centerLon: number;
  radiusM: number;
  herdLat: number;
  herdLon: number;
  destLat?: number;
  destLon?: number;
  speedMultiplier: number; // 1, 2, 5
}

export type SimulationListener = (state: {
  status: SimulationState;
  herdLat: number;
  herdLon: number;
  destLat?: number;
  destLon?: number;
  distanceM: number;
  remainingSafeM: number;
  breachDistanceM: number;
  isInside: boolean;
  trail: Array<[number, number]>;
}) => void;

class DemoSimulationService {
  private status: SimulationState = 'IDLE';
  private centerLat: number = 23.122136;
  private centerLon: number = 72.597685;
  private radiusM: number = 200;

  private herdLat: number = 23.122136;
  private herdLon: number = 72.597685;

  private startLat: number = 23.122136;
  private startLon: number = 72.597685;
  private destLat: number | null = null;
  private destLon: number | null = null;

  private trail: Array<[number, number]> = [];
  private speedMultiplier: number = 1;
  private progress: number = 0; // 0.0 to 1.0

  private wasInside: boolean = true;
  private animationTimer: number | null = null;
  private listeners: Set<SimulationListener> = new Set();

  constructor() {
    this.trail = [[this.herdLat, this.herdLon]];
    const evalResult = checkGeofenceStatus(this.centerLat, this.centerLon, this.radiusM, this.herdLat, this.herdLon);
    this.wasInside = evalResult.isInside;
  }

  public subscribe(listener: SimulationListener): () => void {
    this.listeners.add(listener);
    this.emitState();
    return () => this.listeners.delete(listener);
  }

  private emitState(): void {
    const evalResult = checkGeofenceStatus(this.centerLat, this.centerLon, this.radiusM, this.herdLat, this.herdLon);
    const payload = {
      status: this.status,
      herdLat: this.herdLat,
      herdLon: this.herdLon,
      destLat: this.destLat ?? undefined,
      destLon: this.destLon ?? undefined,
      distanceM: evalResult.distanceM,
      remainingSafeM: evalResult.remainingSafeM,
      breachDistanceM: evalResult.breachDistanceM,
      isInside: evalResult.isInside,
      trail: [...this.trail],
    };

    this.listeners.forEach((l) => {
      try {
        l(payload);
      } catch (err) {
        console.error('Error emitting simulation state:', err);
      }
    });
  }

  // --- CONFIGURATION UPDATES ---

  public setGeofence(centerLat: number, centerLon: number, radiusM: number): void {
    this.centerLat = centerLat;
    this.centerLon = centerLon;
    this.radiusM = radiusM;

    demoEventManager.recordEvent({
      type: 'GEOFENCE_UPDATED',
      latitude: this.herdLat,
      longitude: this.herdLon,
      distanceM: checkGeofenceStatus(this.centerLat, this.centerLon, this.radiusM, this.herdLat, this.herdLon).distanceM,
      radiusM: this.radiusM,
      outside: !checkGeofenceStatus(this.centerLat, this.centerLon, this.radiusM, this.herdLat, this.herdLon).isInside,
      message: `Geofence updated: Center (${centerLat.toFixed(5)}, ${centerLon.toFixed(5)}), Radius ${radiusM}m`,
    });

    this.checkTransition(true);
    this.emitState();
  }

  public setHerdPosition(lat: number, lon: number, isManualDrag: boolean = false): void {
    this.herdLat = lat;
    this.herdLon = lon;
    this.trail.push([lat, lon]);
    if (this.trail.length > 100) this.trail.shift();

    if (isManualDrag) {
      demoEventManager.recordEvent({
        type: 'HERD_MANUAL_MOVE',
        latitude: lat,
        longitude: lon,
        distanceM: checkGeofenceStatus(this.centerLat, this.centerLon, this.radiusM, lat, lon).distanceM,
        radiusM: this.radiusM,
        outside: !checkGeofenceStatus(this.centerLat, this.centerLon, this.radiusM, lat, lon).isInside,
        message: `Herd manually moved to (${lat.toFixed(6)}, ${lon.toFixed(6)})`,
      });
    }

    this.checkTransition();
    this.emitState();
  }

  public setDestination(lat: number, lon: number): void {
    this.destLat = lat;
    this.destLon = lon;
    this.startLat = this.herdLat;
    this.startLon = this.herdLon;
    this.progress = 0;
    this.emitState();
  }

  public setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(1, Math.min(10, multiplier));
    this.emitState();
  }

  // --- BOUNDARY TRANSITION DETECTION ---

  private checkTransition(forceNotify: boolean = false): void {
    const evalResult = checkGeofenceStatus(this.centerLat, this.centerLon, this.radiusM, this.herdLat, this.herdLon);
    const nowInside = evalResult.isInside;

    if (this.wasInside && !nowInside) {
      // BREACH OCCURRED (Inside -> Outside)
      this.wasInside = false;

      // 1. Record event
      demoEventManager.recordEvent({
        type: 'HERD_BREACH',
        latitude: this.herdLat,
        longitude: this.herdLon,
        distanceM: evalResult.distanceM,
        radiusM: this.radiusM,
        outside: true,
        message: `PERIMETER BREACH: Herd is ${evalResult.breachDistanceM}m outside safe boundary!`,
        details: `Distance: ${evalResult.distanceM}m (Safe radius: ${this.radiusM}m)`,
      });

      // 2. Play acoustic warning tone
      notificationService.playBreachAlarm();

      // 3. Dispatch browser desktop notification
      notificationService.sendDesktopNotification({
        title: 'CATTLEGUARD ALERT — Perimeter Breach!',
        body: `Simulated Herd #esp32_gps_01 has exited the ${this.radiusM}m safe zone. Current distance: ${evalResult.distanceM}m.`,
        tag: 'cattleguard-breach',
      });
    } else if (!this.wasInside && nowInside) {
      // RETURN OCCURRED (Outside -> Inside)
      this.wasInside = true;

      // 1. Record event
      demoEventManager.recordEvent({
        type: 'HERD_RETURN',
        latitude: this.herdLat,
        longitude: this.herdLon,
        distanceM: evalResult.distanceM,
        radiusM: this.radiusM,
        outside: false,
        message: `Herd returned to safe grazing boundary (${evalResult.remainingSafeM}m margin)`,
        details: `Distance: ${evalResult.distanceM}m (Safe radius: ${this.radiusM}m)`,
      });

      // 2. Play gentle return chime
      notificationService.playReturnChime();

      // 3. Dispatch desktop notification
      notificationService.sendDesktopNotification({
        title: 'CATTLEGUARD — Herd Returned to Safe Zone',
        body: `Herd has safely re-entered within the ${this.radiusM}m boundary. Distance: ${evalResult.distanceM}m.`,
        tag: 'cattleguard-return',
      });
    } else if (forceNotify) {
      this.wasInside = nowInside;
    }
  }

  // --- AUTOMATIC SIMULATION CONTROLS ---

  public startSimulation(): void {
    if (this.status === 'RUNNING') return;

    // If no destination is set, choose a destination outside the boundary
    if (this.destLat === null || this.destLon === null) {
      const [destLat, destLon] = computeDestinationPoint(
        this.centerLat,
        this.centerLon,
        this.radiusM * 1.5,
        45 // North-East
      );
      this.destLat = destLat;
      this.destLon = destLon;
    }

    this.startLat = this.herdLat;
    this.startLon = this.herdLon;
    this.progress = 0;
    this.status = 'RUNNING';

    demoEventManager.recordEvent({
      type: 'SIMULATION_STARTED',
      latitude: this.herdLat,
      longitude: this.herdLon,
      distanceM: checkGeofenceStatus(this.centerLat, this.centerLon, this.radiusM, this.herdLat, this.herdLon).distanceM,
      radiusM: this.radiusM,
      outside: !this.wasInside,
      message: `Automatic route simulation started towards target destination`,
    });

    this.startLoop();
    this.emitState();
  }

  public pauseSimulation(): void {
    if (this.status !== 'RUNNING') return;
    this.status = 'PAUSED';
    this.stopLoop();

    demoEventManager.recordEvent({
      type: 'SIMULATION_PAUSED',
      latitude: this.herdLat,
      longitude: this.herdLon,
      distanceM: checkGeofenceStatus(this.centerLat, this.centerLon, this.radiusM, this.herdLat, this.herdLon).distanceM,
      radiusM: this.radiusM,
      outside: !this.wasInside,
      message: `Automatic movement simulation paused at (${this.herdLat.toFixed(5)}, ${this.herdLon.toFixed(5)})`,
    });

    this.emitState();
  }

  public resumeSimulation(): void {
    if (this.status !== 'PAUSED') return;
    this.status = 'RUNNING';

    demoEventManager.recordEvent({
      type: 'SIMULATION_RESUMED',
      latitude: this.herdLat,
      longitude: this.herdLon,
      distanceM: checkGeofenceStatus(this.centerLat, this.centerLon, this.radiusM, this.herdLat, this.herdLon).distanceM,
      radiusM: this.radiusM,
      outside: !this.wasInside,
      message: `Automatic movement simulation resumed`,
    });

    this.startLoop();
    this.emitState();
  }

  public stopSimulation(): void {
    this.status = 'IDLE';
    this.stopLoop();
    this.progress = 0;

    demoEventManager.recordEvent({
      type: 'SIMULATION_STOPPED',
      latitude: this.herdLat,
      longitude: this.herdLon,
      distanceM: checkGeofenceStatus(this.centerLat, this.centerLon, this.radiusM, this.herdLat, this.herdLon).distanceM,
      radiusM: this.radiusM,
      outside: !this.wasInside,
      message: `Automatic movement simulation stopped`,
    });

    this.emitState();
  }

  public resetSimulation(): void {
    this.stopLoop();
    this.status = 'IDLE';
    this.destLat = null;
    this.destLon = null;
    this.progress = 0;
    this.trail = [];

    // Reset herd position to center
    this.setHerdPosition(this.centerLat, this.centerLon);
  }

  private startLoop(): void {
    this.stopLoop();

    const stepIntervalMs = 100;
    const totalDurationSec = 15; // 15 seconds to travel route at 1x
    const stepDelta = (stepIntervalMs / (totalDurationSec * 1000)) * this.speedMultiplier;

    this.animationTimer = window.setInterval(() => {
      if (this.status !== 'RUNNING' || this.destLat === null || this.destLon === null) {
        this.stopLoop();
        return;
      }

      this.progress += stepDelta;

      if (this.progress >= 1.0) {
        this.progress = 1.0;
        this.herdLat = this.destLat;
        this.herdLon = this.destLon;
        this.trail.push([this.herdLat, this.herdLon]);
        this.checkTransition();
        this.status = 'COMPLETED';
        this.stopLoop();
        this.emitState();
        return;
      }

      // Linear interpolation between start and destination
      this.herdLat = this.startLat + (this.destLat - this.startLat) * this.progress;
      this.herdLon = this.startLon + (this.destLon - this.startLon) * this.progress;

      this.trail.push([this.herdLat, this.herdLon]);
      if (this.trail.length > 150) this.trail.shift();

      this.checkTransition();
      this.emitState();
    }, stepIntervalMs);
  }

  private stopLoop(): void {
    if (this.animationTimer !== null) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
    }
  }

  // --- PRESET SCENARIOS (Section 7) ---

  public loadPresetScenario(scenario: PresetScenario): void {
    this.stopLoop();
    this.status = 'IDLE';
    this.destLat = null;
    this.destLon = null;

    let targetLat = this.centerLat;
    let targetLon = this.centerLon;
    let scenarioDescription = '';

    switch (scenario) {
      case 'HERD_INSIDE': {
        // Position herd inside (~40% of radius to North-East)
        const [lat, lon] = computeDestinationPoint(this.centerLat, this.centerLon, this.radiusM * 0.4, 45);
        targetLat = lat;
        targetLon = lon;
        scenarioDescription = `Scenario loaded: Herd Inside Safe Zone (40% of radius)`;
        break;
      }
      case 'JUST_OUTSIDE': {
        // Position herd just outside (~115% of radius to East)
        const [lat, lon] = computeDestinationPoint(this.centerLat, this.centerLon, this.radiusM * 1.15, 90);
        targetLat = lat;
        targetLon = lon;
        scenarioDescription = `Scenario loaded: Herd Just Outside Boundary (115% of radius)`;
        break;
      }
      case 'FAR_OUTSIDE': {
        // Position herd significantly beyond boundary (~250% of radius to South-West)
        const [lat, lon] = computeDestinationPoint(this.centerLat, this.centerLon, this.radiusM * 2.5, 225);
        targetLat = lat;
        targetLon = lon;
        scenarioDescription = `Scenario loaded: Herd Far Outside Boundary (250% of radius)`;
        break;
      }
      case 'RETURN_SAFE': {
        // Move herd back inside from wherever it is to center area
        const [lat, lon] = computeDestinationPoint(this.centerLat, this.centerLon, this.radiusM * 0.2, 180);
        targetLat = lat;
        targetLon = lon;
        scenarioDescription = `Scenario loaded: Return to Safe Zone (20% of radius)`;
        break;
      }
      case 'CUSTOM':
      default:
        scenarioDescription = `Custom scenario activated`;
        break;
    }

    this.herdLat = targetLat;
    this.herdLon = targetLon;
    this.trail = [[targetLat, targetLon]];

    demoEventManager.recordEvent({
      type: 'SCENARIO_LOADED',
      latitude: targetLat,
      longitude: targetLon,
      distanceM: checkGeofenceStatus(this.centerLat, this.centerLon, this.radiusM, targetLat, targetLon).distanceM,
      radiusM: this.radiusM,
      outside: !checkGeofenceStatus(this.centerLat, this.centerLon, this.radiusM, targetLat, targetLon).isInside,
      message: scenarioDescription,
    });

    this.checkTransition();
    this.emitState();
  }

  public getStatus(): SimulationState {
    return this.status;
  }
}

export const demoSimulationService = new DemoSimulationService();
