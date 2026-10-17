import type { Controls, Input } from "./Input";
import { GRAVITY, GROUND_Y, STAGE_WIDTH } from "./Physics";

const SPEED = 320;
const JUMP_VELOCITY = -900;

export class Fighter {
  x: number;
  y = GROUND_Y;
  vx = 0;
  vy = 0;
  readonly width = 60;
  readonly height = 120;

  constructor(
    x: number,
    readonly color: string,
    private controls: Controls,
  ) {
    this.x = x;
  }

  update(dt: number, input: Input): void {
    const dir =
      (input.isDown(this.controls.right) ? 1 : 0) -
      (input.isDown(this.controls.left) ? 1 : 0);
    this.vx = dir * SPEED;

    const grounded = this.y >= GROUND_Y;
    if (grounded && input.isDown(this.controls.jump)) this.vy = JUMP_VELOCITY;

    this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y > GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
    }
    this.x = Math.max(this.width / 2, Math.min(STAGE_WIDTH - this.width / 2, this.x));
  }
}
