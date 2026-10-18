import { parseMoveSet, type MoveSet } from "../game/MoveData";
import defaultRaw from "./movesets/default.json";

const MOVE_SETS: Record<string, MoveSet> = {
  default: parseMoveSet("default", defaultRaw),
};

export function getMoveSet(name: string): MoveSet {
  const set = MOVE_SETS[name];
  if (!set) throw new Error(`Unknown move set "${name}"`);
  return set;
}
