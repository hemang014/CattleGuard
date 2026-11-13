/**
 * DemoEventManager — Manages simulated event logs in browser localStorage
 * 
 * STRICT DATA INTEGRITY:
 * This service operates solely on client storage.
 * It NEVER writes to Firebase Realtime Database (/alerts/esp32_gps_01 or /devices/esp32_gps_01/history).
 */
import { DemoEvent, DemoEventType } from '../types';

const STORAGE_KEY = 'cattleguard_demo_events_v2';
const MAX_EVENTS = 200;

class DemoEventManager {
  private events: DemoEvent[] = [];
  private listeners: Set<(events: DemoEvent[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.events = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse demo events from localStorage:', e);
      this.events = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events.slice(0, MAX_EVENTS)));
    } catch (e) {
      console.warn('Failed to persist demo events to localStorage:', e);
    }
    this.notify();
  }

  private notify(): void {
    const copy = [...this.events];
    this.listeners.forEach((listener) => {
      try {
        listener(copy);
      } catch (err) {
        console.error('Error notifying demo event listener:', err);
      }
    });
  }

  public subscribe(callback: (events: DemoEvent[]) => void): () => void {
    this.listeners.add(callback);
    callback([...this.events]);
    return () => this.listeners.delete(callback);
  }

  public getEvents(): DemoEvent[] {
    return [...this.events];
  }

  public recordEvent(entry: {
    type: DemoEventType;
    latitude: number;
    longitude: number;
    distanceM: number;
    radiusM: number;
    outside: boolean;
    message: string;
    details?: string;
  }): DemoEvent {
    const newEvent: DemoEvent = {
      id: `demo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      ...entry,
    };

    // Prepend (latest first)
    this.events.unshift(newEvent);
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(0, MAX_EVENTS);
    }

    this.saveToStorage();
    return newEvent;
  }

  public clearEvents(): void {
    this.events = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.notify();
  }

  public exportCsv(): void {
    if (this.events.length === 0) return;

    const headers = [
      'Event ID',
      'Event Type',
      'Timestamp (ISO)',
      'Timestamp (Local)',
      'Latitude',
      'Longitude',
      'Distance from Center (m)',
      'Safe Radius (m)',
      'Status',
      'Message',
      'Details',
    ];

    const rows = this.events.map((e) => [
      e.id,
      e.type,
      new Date(e.timestamp).toISOString(),
      `"${new Date(e.timestamp).toLocaleString()}"`,
      e.latitude.toFixed(6),
      e.longitude.toFixed(6),
      e.distanceM,
      e.radiusM,
      e.outside ? 'OUTSIDE' : 'INSIDE',
      `"${e.message.replace(/"/g, '""')}"`,
      `"${(e.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cattleguard_demo_events_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const demoEventManager = new DemoEventManager();
