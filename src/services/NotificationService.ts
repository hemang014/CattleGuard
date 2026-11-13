/**
 * NotificationService — Multi-channel notification dispatch
 * Supports:
 *  1. In-App visual toasts/banners
 *  2. Browser Desktop Notification API (with permission negotiation)
 *  3. Web Audio API synthesized alert buzzer / return chime (with volume & mute control)
 */

export interface DesktopNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

class NotificationService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private volume: number = 0.8; // 0.0 to 1.0

  constructor() {
    // Attempt restoring sound preferences from localStorage
    try {
      const savedSound = localStorage.getItem('cattleguard_sound_enabled');
      if (savedSound !== null) this.soundEnabled = savedSound === 'true';

      const savedVol = localStorage.getItem('cattleguard_sound_volume');
      if (savedVol !== null) this.volume = parseFloat(savedVol) || 0.8;
    } catch {
      // Ignore localStorage errors
    }
  }

  // --- SOUND CONTROLS ---

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('cattleguard_sound_enabled', String(enabled));
    } catch {}
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('cattleguard_sound_volume', String(this.volume));
    } catch {}
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!this.audioCtx) {
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Synthesize an authentic acoustic warning tone (Simulating ESP32 piezo buzzer)
   */
  public playBreachAlarm(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // 3 rapid square-wave pulses at 2400Hz
      [0, 0.16, 0.32].forEach((offset) => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(2400, now + offset);

        const targetGain = 0.18 * this.volume;
        gain.gain.setValueAtTime(targetGain, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.11);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.12);
      });
    } catch (err) {
      console.warn('Audio playback prevented by browser:', err);
    }
  }

  /**
   * Synthesize a gentle rising chime when herd safely returns
   */
  public playReturnChime(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        const targetGain = 0.15 * this.volume;
        gain.gain.setValueAtTime(targetGain, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.25);
      });
    } catch (err) {
      console.warn('Chime playback prevented:', err);
    }
  }

  // --- BROWSER DESKTOP NOTIFICATIONS ---

  public getNotificationPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  public async requestDesktopPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const result = await Notification.requestPermission();
      return result;
    } catch (err) {
      console.warn('Notification permission request error:', err);
      return 'denied';
    }
  }

  public sendDesktopNotification(payload: DesktopNotificationPayload): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || 'https://img.icons8.com/color/96/cow.png',
        tag: payload.tag || 'cattleguard-alert',
      });
    } catch (err) {
      console.warn('Failed to send desktop notification:', err);
    }
  }
}

export const notificationService = new NotificationService();
