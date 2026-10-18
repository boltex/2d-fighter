import type { Character } from "../game/Characters";
import type { Fighter } from "../game/Fighter";

// Shared state between the fight scene and the dev-only playtest panel. Every flag
// defaults to "off", and the panel that flips them is not part of production builds.
export interface DebugTarget {
  fighters: readonly [Fighter, Fighter];
  characters: readonly [Character, Character];
  restart(): void;
}

export interface LogEntry {
  tick: number;
  text: string;
}

const MAX_LOG = 60;

export const debug = {
  boxes: false,
  paused: false,
  stepRequests: 0,
  timeScale: 1,
  endless: false, // no K.O./timer end, so one fight can be tested for as long as needed
  target: null as DebugTarget | null,
  tick: 0,
  logs: [[], []] as [LogEntry[], LogEntry[]],
  logVersion: 0,
};

export function logEvent(player: number, text: string): void {
  const log = debug.logs[player];
  if (!log) return;
  log.push({ tick: debug.tick, text });
  if (log.length > MAX_LOG) log.shift();
  debug.logVersion++;
}

export function clearLogs(): void {
  debug.logs[0].length = 0;
  debug.logs[1].length = 0;
  debug.tick = 0;
  debug.logVersion++;
}
