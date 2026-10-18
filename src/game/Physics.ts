export const GROUND_Y = 460;
export const STAGE_WIDTH = 960;

// The simulation advances in fixed ticks so frame data (durations, hitstun) is exact.
export const TICKS_PER_SECOND = 60;
export const STEP = 1 / TICKS_PER_SECOND;

// Tunable at runtime (the playtesting-tools milestone will expose these).
export const PHYSICS = {
  gravity: 2400,
  groundFriction: 2500,
  // Share of the horizontal reaction force that reaches an attacker standing on the
  // ground (friction absorbs the rest). Airborne attackers receive all of it.
  groundRecoil: 0.15,
  knockdownTicks: 40,
  maxQueue: 4,
};
