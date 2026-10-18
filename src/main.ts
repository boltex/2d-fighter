import "./style.css";
import { Game } from "./game/Game";

const canvas = document.getElementById("game") as HTMLCanvasElement;
new Game(canvas).start();

// Playtest tools: dev server only, never bundled into production builds.
if (import.meta.env.DEV) {
  void import("./debug/DebugPanel").then((m) => m.mountDebugPanel());
}
