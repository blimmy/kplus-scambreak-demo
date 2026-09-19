/** A single in-memory clock. Rendering and countdown derive from this state. */
export class Timeline {
  constructor(scenes) {
    this.scenes = scenes;
    this.scene = 0;
    this.step = -1;
    this.elapsed = 0;
    this.playing = false;
    this.continuous = true;
  }
  get steps() { return this.scenes[this.scene].steps; }
  get current() { return this.step < 0 ? null : this.steps[this.step]; }
  get progress() {
    if (this.step < 0) return 0;
    const before = this.steps.slice(0, this.step).reduce((sum, s) => sum + s.duration, 0);
    return (before + this.elapsed) / this.steps.reduce((sum, s) => sum + s.duration, 0);
  }
  reset(scene = this.scene) {
    if (!Number.isInteger(scene) || !this.scenes[scene]) return;
    this.scene = scene;
    this.step = -1;
    this.elapsed = 0;
    this.playing = false;
  }
  seek(step) {
    this.step = Math.max(-1, Math.min(step, this.steps.length - 1));
    this.elapsed = 0;
    this.playing = false;
  }
  next() { this.seek(this.step + 1); }
  back() { this.seek(this.step - 1); }
  play() {
    if (this.step < 0) this.step = 0;
    else if (this.elapsed >= this.current.duration) {
      if (this.step < this.steps.length - 1) this.step++;
      else this.step = 0;
      this.elapsed = 0;
    }
    this.playing = true;
  }
  pause() { this.playing = false; }
  tick(delta) {
    if (!this.playing || !Number.isFinite(delta) || delta <= 0) return;
    this.elapsed += delta;
    while (this.playing && this.elapsed >= this.current.duration) {
      const overflow = this.elapsed - this.current.duration;
      if (!this.continuous) {
        this.elapsed = this.current.duration;
        this.playing = false;
      } else if (this.step < this.steps.length - 1) {
        this.step++;
        this.elapsed = overflow;
      } else if (this.scene < this.scenes.length - 1) {
        this.scene++;
        this.step = 0;
        this.elapsed = overflow;
      } else {
        this.elapsed = this.current.duration;
        this.playing = false;
      }
    }
  }
}
