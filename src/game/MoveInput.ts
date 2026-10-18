import type { Action } from "./Input";

export type Move = `${Action}-${Action}`;

// Max time between the first and second press of a move.
const DEFAULT_WINDOW_MS = 1000;
// A second press this soon after the first is treated as a simultaneous press
// (e.g. a stick diagonal) and ignored rather than firing an accidental move.
const SIMULTANEOUS_MS = 15;

export class MoveInput {
  private first: Action | null = null;
  private firstAt = 0;

  constructor(
    private onMove: (move: Move) => void,
    private windowMs = DEFAULT_WINDOW_MS,
  ) { }

  // Only fresh presses should be passed in. The first press is consumed by the
  // move, so a held button can never serve as the first half of a second move.
  press(action: Action, now = performance.now()): void {
    if (this.first !== null && now - this.firstAt > this.windowMs) this.first = null;

    if (this.first === null) {
      this.first = action;
      this.firstAt = now;
      return;
    }
    if (now - this.firstAt < SIMULTANEOUS_MS) return;

    const move: Move = `${this.first}-${action}`;
    this.first = null;
    this.onMove(move);
  }

  pending(now = performance.now()): Action | null {
    return this.first !== null && now - this.firstAt <= this.windowMs ? this.first : null;
  }

  reset(): void {
    this.first = null;
  }
}
