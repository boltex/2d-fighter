import type { Fighter } from "./Fighter";
import { PHYSICS, STAGE_WIDTH } from "./Physics";

// Stops fighters passing through each other. Overlap is resolved along x only:
// jumping high enough still clears the opponent, but you can't walk through them.
export function resolveBodies(a: Fighter, b: Fighter): void {
  const overlapsY = a.y > b.y - b.bodyHeight && a.y - a.bodyHeight < b.y;
  const depth = (a.width + b.width) / 2 - Math.abs(a.x - b.x);
  if (!overlapsY || depth <= 0) return;

  // Direction from a to b; ties are broken by who is facing whom.
  const s = a.x < b.x ? 1 : a.x > b.x ? -1 : a.facing;

  exchangeMomentum(a, b, s);

  // The lighter fighter gets pushed further out of the overlap.
  const total = a.mass + b.mass;
  a.x -= s * depth * (b.mass / total);
  b.x += s * depth * (a.mass / total);

  // If a wall pinned one of them, the other takes the rest of the push.
  a.collideWalls();
  b.collideWalls();
  const remaining = (a.width + b.width) / 2 - Math.abs(a.x - b.x);
  if (remaining > 0) {
    const aPinned = a.x <= a.width / 2 || a.x >= STAGE_WIDTH - a.width / 2;
    if (aPinned) b.x += s * remaining;
    else a.x -= s * remaining;
    a.collideWalls();
    b.collideWalls();
  }
}

// 1D collision along x with restitution; only applies when they are closing in.
function exchangeMomentum(a: Fighter, b: Fighter, s: number): void {
  const closing = (a.vx - b.vx) * s;
  if (closing <= 0) return;
  const e = closing < PHYSICS.bounceMinSpeed ? 0 : PHYSICS.bodyBounce;
  const total = a.mass + b.mass;
  const va = a.vx;
  const vb = b.vx;
  a.vx = ((a.mass - e * b.mass) * va + (1 + e) * b.mass * vb) / total;
  b.vx = ((b.mass - e * a.mass) * vb + (1 + e) * a.mass * va) / total;
}
