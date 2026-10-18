import type { Facing } from "./Input";
import { frameAt, moveLength, type Box, type HitData, type MoveDef, type MoveSet, type StanceName } from "./MoveData";
import type { Move } from "./MoveInput";
import { GROUND_Y, PHYSICS, STAGE_WIDTH, STEP } from "./Physics";

export const MAX_HEALTH = 100;

export type FighterState = "idle" | "acting" | "hitstun" | "knockdown";

export interface ActiveMove {
  name: Move;
  def: MoveDef;
  age: number; // ticks since the move started
  length: number;
  hasHit: boolean;
}

export class Fighter {
  vx = 0;
  vy = 0;
  y = GROUND_Y;
  facing: Facing = 1;
  health = MAX_HEALTH;
  state: FighterState = "idle";
  current: ActiveMove | null = null;
  queue: Move[] = [];
  lastMove: Move | null = null;
  readonly width = 60;

  private stunTimer = 0;
  private airborneSinceHit = false;

  constructor(
    public x: number,
    readonly color: string,
    readonly name: string,
    readonly moveset: MoveSet,
  ) {}

  get grounded(): boolean {
    return this.y >= GROUND_Y;
  }

  get stunned(): boolean {
    return this.state === "hitstun" || this.state === "knockdown";
  }

  // Knocked-down fighters are invulnerable while they get back up.
  get hittable(): boolean {
    return this.state !== "knockdown";
  }

  get canTurn(): boolean {
    return this.state === "idle" && this.grounded;
  }

  enqueue(move: Move): void {
    if (!this.moveset.moves[move]) {
      console.log("Unassigned move:", move);
      return;
    }
    if (this.queue.length < PHYSICS.maxQueue) this.queue.push(move);
  }

  // Advances the simulation by one fixed tick.
  tick(): void {
    this.advanceMove();
    this.startQueued();
    this.integrate();
    this.updateStun();
  }

  receiveHit(hit: HitData, attackerFacing: Facing): void {
    const impulse = !this.grounded && hit.airImpulse ? hit.airImpulse : hit.impulse;
    this.vx = impulse.x * attackerFacing;
    this.vy = impulse.y;
    this.health = Math.max(0, this.health - hit.damage);
    this.state = "hitstun";
    this.stunTimer = hit.hitstun;
    this.airborneSinceHit = !this.grounded;
    // Getting hit wipes the move in progress and every pre-input.
    this.current = null;
    this.queue = [];
  }

  hurtboxes(): Box[] {
    const frame = this.current ? frameAt(this.current.def, this.current.age) : null;
    return this.toWorld(frame?.hurtboxes ?? this.moveset.stances[this.stance()].hurtboxes);
  }

  hitboxes(): Box[] {
    if (!this.current) return [];
    return this.toWorld(frameAt(this.current.def, this.current.age).hitboxes ?? []);
  }

  stance(): StanceName {
    if (this.state === "hitstun") return "hitstun";
    if (this.state === "knockdown") return "knockdown";
    return this.grounded ? "idle" : "airborne";
  }

  private toWorld(boxes: Box[]): Box[] {
    return boxes.map((b) => ({
      x: this.facing === 1 ? this.x + b.x : this.x - (b.x + b.w),
      y: this.y + b.y,
      w: b.w,
      h: b.h,
    }));
  }

  private advanceMove(): void {
    const m = this.current;
    if (!m) return;
    m.age++;
    if (m.age >= m.length) {
      this.current = null;
      this.state = "idle";
    }
  }

  private startQueued(): void {
    if (this.state !== "idle" && this.state !== "acting") return;
    for (let next = this.queue[0]; next; next = this.queue[0]) {
      const def = this.moveset.moves[next];
      const allowed =
        !!def &&
        (def.requires === "any" || (def.requires === "grounded") === this.grounded);
      if (def && allowed) {
        if (this.state === "acting" && !this.canCancelInto(next)) return;
        this.queue.shift();
        this.start(next, def);
        return;
      }
      // An unusable move (e.g. a jump while airborne) waits behind the current
      // move, then is dropped once the fighter is free to act.
      if (this.state === "acting") return;
      this.queue.shift();
    }
  }

  private canCancelInto(next: Move): boolean {
    const m = this.current;
    if (!m) return true;
    return (m.def.cancelable ?? []).some(
      (c) => c.move === next && c.percent > 0 && m.age * 100 >= m.length * (100 - c.percent),
    );
  }

  private start(name: Move, def: MoveDef): void {
    if (def.velocity?.x !== undefined) this.vx = def.velocity.x * this.facing;
    if (def.velocity?.y !== undefined) this.vy = def.velocity.y;
    this.current = { name, def, age: 0, length: moveLength(def), hasHit: false };
    this.state = "acting";
    this.lastMove = name;
  }

  private integrate(): void {
    this.vy += PHYSICS.gravity * STEP;
    this.x += this.vx * STEP;
    this.y += this.vy * STEP;

    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      const slow = Math.min(Math.abs(this.vx), PHYSICS.groundFriction * STEP);
      this.vx -= Math.sign(this.vx) * slow;
    }
    const half = this.width / 2;
    if (this.x < half || this.x > STAGE_WIDTH - half) {
      this.x = Math.max(half, Math.min(STAGE_WIDTH - half, this.x));
      this.vx = 0;
    }
  }

  private updateStun(): void {
    if (this.state === "knockdown") {
      if (--this.stunTimer <= 0) this.state = "idle";
      return;
    }
    if (this.state !== "hitstun") return;

    this.stunTimer--;
    if (!this.grounded) {
      this.airborneSinceHit = true;
    } else if (this.airborneSinceHit) {
      // Landed after being launched: lie on the ground before recovering.
      this.state = "knockdown";
      this.stunTimer = PHYSICS.knockdownTicks;
    } else if (this.stunTimer <= 0) {
      this.state = "idle";
    }
  }
}
