import type { Box } from "./MoveData";
import type { Fighter } from "./Fighter";
import type { Move } from "./MoveInput";

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function connects(attacker: Fighter, defender: Fighter): boolean {
  const move = attacker.current;
  const hit = move?.def.hit;
  if (!move || !hit || move.hasHit || !defender.hittable) return false;
  if (!defender.grounded && hit.hitsAirborne === false) return false;
  const hurt = defender.hurtboxes();
  return attacker.hitboxes().some((hb) => hurt.some((ub) => overlaps(hb, ub)));
}

export interface HitEvent {
  attacker: number;
  defender: number;
  move: Move;
  damage: number;
  hitstun: number;
}

// Checks both directions before applying anything so simultaneous hits trade.
export function resolveHits(fighters: readonly [Fighter, Fighter]): HitEvent[] {
  const [a, b] = fighters;
  const aHit = connects(a, b) ? a.current : null;
  const bHit = connects(b, a) ? b.current : null;
  const hits: HitEvent[] = [];
  if (aHit?.def.hit) {
    aHit.hasHit = true;
    b.receiveHit(aHit.def.hit, a.facing);
    hits.push({ attacker: 0, defender: 1, move: aHit.name, damage: aHit.def.hit.damage, hitstun: aHit.def.hit.hitstun });
  }
  if (bHit?.def.hit) {
    bHit.hasHit = true;
    a.receiveHit(bHit.def.hit, b.facing);
    hits.push({ attacker: 1, defender: 0, move: bHit.name, damage: bHit.def.hit.damage, hitstun: bHit.def.hit.hitstun });
  }
  // Recoil goes last so a trade's reaction isn't overwritten by the incoming hit.
  if (aHit?.def.hit) a.applyRecoil(aHit.def.hit, a.facing);
  if (bHit?.def.hit) b.applyRecoil(bHit.def.hit, b.facing);
  return hits;
}
