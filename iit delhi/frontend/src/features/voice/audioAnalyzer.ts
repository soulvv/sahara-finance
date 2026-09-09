/**
 * Provides an audio amplitude analyzer.
 * For the hackathon demo, we default to a simulated amplitude to prevent
 * microphone permission blocks, but it can be swapped to real Web Audio API.
 */
export class AudioAnalyzer {
  private active = false;
  private currentAmplitude = 0;
  private targetAmplitude = 0;
  private animationFrameId: number | null = null;

  startSimulation() {
    this.active = true;
    this.update();
  }

  stopSimulation() {
    this.active = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.currentAmplitude = 0;
  }

  // Gets a smoothed amplitude value between 0.0 and 1.0
  getAmplitude(): number {
    return this.currentAmplitude;
  }

  private update = () => {
    if (!this.active) return;

    // Simulate speech-like amplitude spikes randomly
    if (Math.random() > 0.9) {
      this.targetAmplitude = 0.5 + Math.random() * 0.5;
    } else {
      this.targetAmplitude = Math.max(0.1, this.targetAmplitude - 0.05);
    }

    // Smooth interpolation (lerp)
    this.currentAmplitude +=
      (this.targetAmplitude - this.currentAmplitude) * 0.2;

    this.animationFrameId = requestAnimationFrame(this.update);
  };
}

// Singleton instance
export const audioAnalyzer = new AudioAnalyzer();
