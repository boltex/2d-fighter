import type { Action } from "./Input";
import { INPUT_TIMING } from "./Physics";

export type Move = `${Action}-${Action}`;

export class MoveInput {
  private first: Action | null = null;
  private firstAt = 0;

  constructor(private onMove: (move: Move) => void) {}

  // Only fresh presses should be passed in. The first press is consumed by the
  // move, so a held button can never serve as the first half of a second move.
  press(action: Action, now = performance.now()): void {
    if (this.first !== null && now - this.firstAt > INPUT_TIMING.windowMs) this.first = null;

    if (this.first === null) {
      this.first = action;
      this.firstAt = now;
      return;
    }
    if (now - this.firstAt < INPUT_TIMING.simultaneousMs) return;

    const move: Move = `${this.first}-${action}`;
    this.first = null;
    this.onMove(move);
  }

  pending(now = performance.now()): Action | null {
    return this.first !== null && now - this.firstAt <= INPUT_TIMING.windowMs ? this.first : null;
  }

  reset(): void {
    this.first = null;
  }
}
