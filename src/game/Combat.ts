import type { Box } from "./MoveData";
import type { Fighter } from "./Fighter";

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

// Checks both directions before applying anything so simultaneous hits trade.
// Returns the indices of the fighters that were hit.
export function resolveHits(fighters: readonly [Fighter, Fighter]): number[] {
  const [a, b] = fighters;
  const aHit = connects(a, b) ? a.current : null;
  const bHit = connects(b, a) ? b.current : null;
  const hit: number[] = [];
  if (aHit?.def.hit) {
    aHit.hasHit = true;
    b.receiveHit(aHit.def.hit, a.facing);
    hit.push(1);
  }
  if (bHit?.def.hit) {
    bHit.hasHit = true;
    a.receiveHit(bHit.def.hit, b.facing);
    hit.push(0);
  }
  return hit;
}
