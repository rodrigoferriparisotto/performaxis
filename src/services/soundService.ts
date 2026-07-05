import type { NotificationLevel } from './notificationService';
import { logger } from './loggerService';

class SoundService {
  private audioContext: AudioContext | null = null;
  private userVolume: number = 1.0;

  private getAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
        }
      } catch (error) {
        logger.warn('Web Audio API not supported', error, 'SoundService');
        return null;
      }
    }
    return this.audioContext;
  }

  setVolume(volume: number): void {
    this.userVolume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.userVolume;
  }

  private playTone(
    frequency: number,
    duration: number,
    volume: number = 0.6,
    type: OscillatorType = 'sine'
  ): Promise<void> {
    return new Promise((resolve) => {
      const context = this.getAudioContext();
      if (!context) {
        resolve();
        return;
      }

      try {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, context.currentTime);

        const adjustedVolume = volume * this.userVolume;
        gainNode.gain.setValueAtTime(adjustedVolume, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + duration);

        oscillator.onended = () => resolve();
      } catch (error) {
        logger.warn('Error playing tone', error, 'SoundService');
        resolve();
      }
    });
  }

  private playChord(
    frequencies: number[],
    duration: number,
    volume: number = 0.6,
    type: OscillatorType = 'sine'
  ): Promise<void> {
    return new Promise((resolve) => {
      const context = this.getAudioContext();
      if (!context) {
        resolve();
        return;
      }

      try {
        const oscillators: OscillatorNode[] = [];
        const gainNode = context.createGain();

        const adjustedVolume = (volume * this.userVolume) / frequencies.length;
        gainNode.gain.setValueAtTime(adjustedVolume, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

        frequencies.forEach(freq => {
          const osc = context.createOscillator();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, context.currentTime);
          osc.connect(gainNode);
          oscillators.push(osc);
        });

        gainNode.connect(context.destination);

        oscillators.forEach(osc => {
          osc.start(context.currentTime);
          osc.stop(context.currentTime + duration);
        });

        oscillators[0].onended = () => resolve();
      } catch (error) {
        logger.warn('Error playing chord', error, 'SoundService');
        resolve();
      }
    });
  }

  async playInfo(): Promise<void> {
    await this.playChord([523.25, 659.25], 0.25, 0.6, 'sine');
  }

  async playWarning(): Promise<void> {
    await this.playChord([659.25, 830.61], 0.2, 0.7, 'sine');
    await new Promise(resolve => setTimeout(resolve, 80));
    await this.playChord([659.25, 830.61], 0.2, 0.7, 'sine');
  }

  async playUrgent(): Promise<void> {
    await this.playChord([783.99, 987.77], 0.18, 0.75, 'square');
    await new Promise(resolve => setTimeout(resolve, 60));
    await this.playChord([783.99, 987.77], 0.18, 0.75, 'square');
    await new Promise(resolve => setTimeout(resolve, 60));
    await this.playChord([783.99, 987.77], 0.18, 0.75, 'square');
  }

  async playCritical(): Promise<void> {
    await this.playChord([880.0, 1046.5, 1318.51], 0.15, 0.8, 'square');
    await new Promise(resolve => setTimeout(resolve, 50));
    await this.playChord([1046.5, 1318.51, 1661.22], 0.15, 0.8, 'square');
    await new Promise(resolve => setTimeout(resolve, 50));
    await this.playChord([880.0, 1046.5, 1318.51], 0.15, 0.8, 'square');
    await new Promise(resolve => setTimeout(resolve, 50));
    await this.playChord([1046.5, 1318.51, 1661.22], 0.15, 0.8, 'square');
  }

  async play(level: NotificationLevel): Promise<void> {
    try {
      switch (level) {
        case 'info':
          await this.playInfo();
          break;
        case 'warning':
          await this.playWarning();
          break;
        case 'urgent':
          await this.playUrgent();
          break;
        case 'critical':
          await this.playCritical();
          break;
        default:
          await this.playInfo();
      }
    } catch (error) {
      logger.warn('Error playing notification sound', error, 'SoundService');
    }
  }

  cleanup(): void {
    if (this.audioContext) {
      try {
        this.audioContext.close();
        this.audioContext = null;
      } catch (error) {
        logger.warn('Error closing audio context', error, 'SoundService');
      }
    }
  }
}

export const soundService = new SoundService();
