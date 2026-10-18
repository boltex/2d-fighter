import type { Facing } from "./Input";
import type { Move } from "./MoveInput";
import { GRAVITY, GROUND_Y, STAGE_WIDTH } from "./Physics";

const JUMP_VELOCITY = -900;
const JUMP_DRIFT = 320;
const HOP_SPEED = 500;
const GROUND_FRICTION = 2500;
const ATTACK_TIME = 0.2;

export const MAX_HEALTH = 100;

export class Fighter {
  x: number;
  y = GROUND_Y;
  vx = 0;
  vy = 0;
  facing: Facing = 1;
  health = MAX_HEALTH;
  lastMove: Move | null = null;
  attackMove: Move | null = null;
  attackTimer = 0;
  readonly width = 60;
  readonly height = 120;

  constructor(
    x: number,
    readonly color: string,
    readonly name: string,
  ) {
    this.x = x;
  }

  get grounded(): boolean {
    return this.y >= GROUND_Y;
  }

  // Returns true when the move is an attack that has just started.
  perform(move: Move): boolean {
    this.lastMove = move;
    if (!this.grounded) return false;
    const f = this.facing;
    switch (move) {
      case "up-up":
        this.vy = JUMP_VELOCITY;
        this.vx = 0;
        break;
      case "towards-up":
        this.vy = JUMP_VELOCITY;
        this.vx = f * JUMP_DRIFT;
        break;
      case "away-up":
        this.vy = JUMP_VELOCITY;
        this.vx = -f * JUMP_DRIFT;
        break;
      case "towards-towards":
        this.vx = f * HOP_SPEED;
        break;
      case "away-away":
        this.vx = -f * HOP_SPEED;
        break;
      case "up-towards":
      case "down-towards":
        this.attackMove = move;
        this.attackTimer = ATTACK_TIME;
        return true;
      default:
        console.log("Unassigned move:", move);
    }
    return false;
  }

  update(dt: number): void {
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      const slow = Math.min(Math.abs(this.vx), GROUND_FRICTION * dt);
      this.vx -= Math.sign(this.vx) * slow;
    }
    this.x = Math.max(this.width / 2, Math.min(STAGE_WIDTH - this.width / 2, this.x));
  }
}
