export class SimulationClock {
  private accumulator = 0;
  time = 0;
  constructor(readonly dt = 1 / 120) {}
  advance(elapsed: number, timeScale: number, step: (dt: number) => void): number {
    this.accumulator += Math.min(Math.max(elapsed, 0), 0.25) * timeScale;
    let count = 0;
    while (this.accumulator + 1e-12 >= this.dt) { this.singleStep(step); this.accumulator -= this.dt; count++; }
    return count;
  }
  singleStep(step: (dt: number) => void): void { step(this.dt); this.time += this.dt; }
  get alpha(): number { return this.accumulator / this.dt; }
  reset(): void { this.accumulator = 0; this.time = 0; }
}
