import type { Renderer } from "../rendering/Renderer";
import type { Character } from "./Characters";
import type { Settings } from "./Settings";

export type SceneName = "main-menu" | "input-select" | "character-select" | "fight" | "results";

// State shared between scenes.
export interface Session {
  settings: Settings;
  characters: [Character, Character];
  winner: number | null; // null means a draw
  go(name: SceneName): void;
}

export interface Scene {
  enter(): void;
  exit(): void;
  update(dt: number): void;
  render(r: Renderer): void;
}
