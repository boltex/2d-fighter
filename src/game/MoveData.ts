import type { Move } from "./MoveInput";

// All boxes are in the fighter's local space, assuming the fighter faces right:
//   x: offset forward from the fighter's x (mirrored automatically when facing left)
//   y: offset of the box's top edge from the feet (negative = above the ground)
//   w, h: size in pixels
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Frame {
  duration: number; // in game ticks (60 per second)
  sprite?: string; // bitmap file name, used once art exists
  hurtboxes?: Box[]; // defaults to the current stance's hurtboxes
  hitboxes?: Box[];
}

export type StanceName = "idle" | "airborne" | "hitstun" | "knockdown";

export interface Stance {
  sprite?: string;
  hurtboxes: Box[];
}

export interface Vec {
  x: number;
  y: number;
}

export interface HitData {
  damage: number;
  hitstun: number; // ticks
  // Impulse (momentum) exchanged by the hit, as the velocity change a mass-1 defender
  // receives. x points away from the attacker (mirrored by the attacker's facing),
  // y is negative for upward. The defender's velocity changes by impulse / mass, and
  // the attacker is pushed back with the opposite vector (see Combat.ts).
  impulse: Vec;
  hitsAirborne?: boolean; // default true
}

export interface Cancel {
  move: Move; // the queued move that may interrupt this one
  // Size of the cancel window measured back from the end of the move, in percent
  // of its length. 5 = only the very end, 95 = almost right after it starts.
  percent: number;
}

export interface MoveDef {
  requires: "grounded" | "airborne" | "any";
  // Velocity set when the move starts. x is mirrored by facing; omitted axes are kept.
  velocity?: { x?: number; y?: number };
  frames: Frame[];
  hit?: HitData;
  cancelable?: Cancel[];
}

export interface MoveSet {
  name: string;
  stances: Record<StanceName, Stance>;
  moves: Partial<Record<Move, MoveDef>>;
}

export function moveLength(def: MoveDef): number {
  return def.frames.reduce((sum, f) => sum + f.duration, 0);
}

export function frameAt(def: MoveDef, age: number): Frame {
  let t = 0;
  for (const f of def.frames) {
    t += f.duration;
    if (age < t) return f;
  }
  return def.frames[def.frames.length - 1]!;
}

const MOVE_KEY = /^(up|down|towards|away)-(up|down|towards|away)$/;
const STANCES: StanceName[] = ["idle", "airborne", "hitstun", "knockdown"];

// Validates raw JSON so typos in a move set fail loudly at startup.
export function parseMoveSet(name: string, raw: unknown): MoveSet {
  const fail = (msg: string): never => {
    throw new Error(`Move set "${name}": ${msg}`);
  };
  const data = raw as { stances?: Record<string, Stance>; moves?: Record<string, MoveDef> };
  if (!data?.stances || !data.moves) return fail('needs "stances" and "moves"');

  const checkBoxes = (where: string, boxes: Box[] | undefined): void => {
    for (const b of boxes ?? []) {
      if (![b.x, b.y, b.w, b.h].every(Number.isFinite) || b.w <= 0 || b.h <= 0) fail(`${where}: bad box`);
    }
  };

  for (const s of STANCES) {
    const stance = data.stances[s];
    if (!stance?.hurtboxes?.length) fail(`stance "${s}" needs hurtboxes`);
    checkBoxes(`stance "${s}"`, stance?.hurtboxes);
  }

  for (const [key, def] of Object.entries(data.moves)) {
    if (!MOVE_KEY.test(key)) fail(`"${key}" is not a valid move name`);
    if (!["grounded", "airborne", "any"].includes(def.requires)) fail(`${key}: bad "requires"`);
    if (!def.frames?.length) fail(`${key}: needs at least one frame`);
    let hasHitbox = false;
    def.frames.forEach((f, i) => {
      if (!Number.isInteger(f.duration) || f.duration < 1) fail(`${key} frame ${i}: duration must be an integer >= 1`);
      checkBoxes(`${key} frame ${i}`, f.hurtboxes);
      checkBoxes(`${key} frame ${i}`, f.hitboxes);
      if (f.hitboxes?.length) hasHitbox = true;
    });
    if (hasHitbox && !def.hit) fail(`${key}: has hitboxes but no "hit" data`);
    for (const c of def.cancelable ?? []) {
      if (!MOVE_KEY.test(c.move) || !data.moves[c.move]) fail(`${key}: cancelable move "${c.move}" is not defined`);
      if (!Number.isFinite(c.percent) || c.percent < 0 || c.percent > 100) fail(`${key}: percent must be 0-100`);
    }
  }
  return { name, stances: data.stances as Record<StanceName, Stance>, moves: data.moves as MoveSet["moves"] };
}
